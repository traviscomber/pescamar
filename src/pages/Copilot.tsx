import {ArrowRight,Bot,Database,LockKeyhole,RefreshCw,Send,ShieldCheck,Sparkles,ThumbsDown,ThumbsUp} from 'lucide-react'
import {useCallback,useEffect,useMemo,useRef,useState,type FormEvent} from 'react'
import {Link,useSearchParams} from 'react-router-dom'
import {useAuth} from '../auth'
import {PageHeader} from '../components/PageHeader'
import {localeTag,useLocale} from '../i18n'
import {plants} from '../plants'
import {useLots} from '../store'
import '../copilot.css'

type EvidenceClass='live_observation'|'derived_live'|'canonical_reference'|'canonical_history'|'partial_financial'|'ml_inference'
type Source={id:string;label:string;path:string;rows:number;freshness:string|null;evidenceClass?:EvidenceClass}
type Scope={plantId:string|null;plantIds:string[];role:string;organizationId?:string}
type RouterMeta={route:'deterministic'|'fast_evidence'|'investigative';intent:string;requiredCapabilities:string[];optionalCapabilities:string[];writesAllowed:false;humanGate:'none'|'material_action_review'}
type EvidenceGate={status:'sufficient'|'limited'|'insufficient';required:string[];available:string[];missing:string[];empty:string[];coveragePct:number}
type FeedbackRating='good'|'bad'
type Turn={id:string;question:string;answer:string;sources:Source[];generatedAt:string;scope:Scope;engine:string;policyVersion:string;router?:RouterMeta;evidenceGate?:EvidenceGate;feedbackRating?:FeedbackRating;feedbackComment?:string;feedbackSaving?:boolean;feedbackSaved?:boolean;feedbackError?:string}
type Payload={answer?:string;engine?:string;policyVersion?:string;generatedAt?:string;scope?:Scope;sources?:Source[];router?:RouterMeta;evidenceGate?:EvidenceGate;error?:string}
type CanonicalBrief={know:string;meaning:string;action:string;evidencePath:string;priority?:{priority:number;kind:string;title:string;detail:string}|null}
type BriefPayload={ok?:boolean;brief?:CanonicalBrief;error?:string}

function Answer({text,sources,isEs}:{text:string;sources:Source[];isEs:boolean}){
 const lookup=new Map(sources.map(source=>[source.id,source]))
 const parts=text.split(/(\[(?:receptions|production|quality|inventory|orders|canonical_sources|canonical_inventory|historical_lineage|canonical_intelligence|ml_intelligence|finance|lot_control|operational_intelligence|urchin_graph|photo_observation|data_readiness)\])/g)
 return <div className="copilot-answer">{parts.map((part,index)=>{const match=/^\[([^\]]+)\]$/.exec(part),source=match?lookup.get(match[1]):null;return source?<Link className="copilot-citation" to={source.path} title={`${isEs?'Abrir':'Open'} ${source.label}`} key={`${part}-${index}`}>{part}</Link>:<span key={index}>{part}</span>})}</div>
}

export function Copilot(){
 const {operator}=useAuth(),{lots}=useLots(),{locale}=useLocale(),isEs=locale==='es',tag=localeTag(locale),[params]=useSearchParams()
 const available=useMemo(()=>operator?.role==='admin'?plants:plants.filter(plant=>operator?.plantIds.includes(plant.id)),[operator])
 const executiveMode=operator?.role==='operations'
 const executivePrompts=isEs?['Prioridades de hoy','¿Qué requiere atención?','Comparar plantas','¿Qué está bloqueado?','¿Qué falta para cerrar?']:['Today’s priorities','What requires attention?','Compare plants','What is blocked?','What is missing to close?']
 const generalPrompts=isEs?['¿Qué requiere atención?','¿Qué patrones ves?','¿Dónde falta trazabilidad?','¿Qué no sabemos todavía?']:['What requires attention?','What patterns do you see?','Where is traceability missing?','What do we still not know?']
 const examples=executiveMode?executivePrompts:generalPrompts
 const evidenceLabels:Record<EvidenceClass,string>=isEs?{live_observation:'actual',derived_live:'calculado',canonical_reference:'origen',canonical_history:'histórico',partial_financial:'financiero',ml_inference:'ML'}:{live_observation:'live',derived_live:'calculated',canonical_reference:'source',canonical_history:'historical',partial_financial:'financial',ml_inference:'ML'}
 const capabilityLabels:Record<string,string>=isEs?{receptions:'recepciones',production:'producción',quality:'calidad',inventory:'inventario',orders:'órdenes de venta',canonical_sources:'archivos de origen',canonical_inventory:'inventario histórico',historical_lineage:'trazabilidad histórica',canonical_intelligence:'análisis histórico',ml_intelligence:'patrones ML',finance:'información financiera',lot_control:'estado y bloqueos del lote',operational_intelligence:'prioridades operacionales',urchin_graph:'proceso especializado de erizo',photo_observation:'observación de fotos',data_readiness:'calidad de datos'}:{receptions:'receptions',production:'production',quality:'quality',inventory:'inventory',orders:'sales orders',canonical_sources:'source files',canonical_inventory:'historical inventory',historical_lineage:'historical traceability',canonical_intelligence:'historical analysis',ml_intelligence:'ML patterns',finance:'financial information',lot_control:'lot status and blockers',operational_intelligence:'operational priorities',urchin_graph:'specialized sea urchin process',photo_observation:'photo observations',data_readiness:'data readiness'}
 const sourceLabels:Record<string,string>=isEs?{recepciones:'Recepciones',produccion:'Producción',inventario:'Inventario',inicio:'Inicio',lote:'Ficha 360'}:{recepciones:'Receptions',produccion:'Production',inventario:'Inventory',inicio:'Home',lote:'360 record'}
 const humanCapability=(id:string)=>capabilityLabels[id]??id.replaceAll('_',' ')
 const requestedPlantId=params.get('plantId')??'',requestedReceptionId=params.get('receptionId')??'',requestedPrompt=(params.get('prompt')??'').trim(),requestedSource=params.get('source')??''
 const allowedRequestedPlant=available.some(plant=>plant.id===requestedPlantId)?requestedPlantId:''
 const [plantId,setPlantId]=useState(allowedRequestedPlant),[receptionId,setReceptionId]=useState(''),[question,setQuestion]=useState(''),[turns,setTurns]=useState<Turn[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState(''),[brief,setBrief]=useState<CanonicalBrief|null>(null)
 const inputRef=useRef<HTMLTextAreaElement>(null),deepLinkHandled=useRef('')
 const selectableLots=useMemo(()=>lots.filter(lot=>Boolean(lot.receptionId)&&(!plantId||lot.plantId===plantId)),[lots,plantId])
 const memoryKey=operator?`pescamar:seafood-ai:scope:${operator.id}`:''
 useEffect(()=>{if(!executiveMode||requestedPlantId||plantId||!memoryKey)return;try{const remembered=window.localStorage.getItem(memoryKey)??'';if(remembered&&available.some(plant=>plant.id===remembered))setPlantId(remembered)}catch{}},[executiveMode,requestedPlantId,plantId,memoryKey,available])
 useEffect(()=>{if(!executiveMode||!memoryKey)return;try{if(plantId)window.localStorage.setItem(memoryKey,plantId);else window.localStorage.removeItem(memoryKey)}catch{}},[executiveMode,memoryKey,plantId])
 useEffect(()=>{if(requestedPlantId&&available.some(plant=>plant.id===requestedPlantId)&&plantId!==requestedPlantId){setPlantId(requestedPlantId);setReceptionId('');setTurns([])}},[requestedPlantId,available,plantId])
 useEffect(()=>{if(requestedReceptionId&&selectableLots.some(lot=>lot.receptionId===requestedReceptionId)){setReceptionId(requestedReceptionId);setTurns([])}},[requestedReceptionId,selectableLots])
 useEffect(()=>{if(receptionId&&!selectableLots.some(lot=>lot.receptionId===receptionId)){setReceptionId('');setTurns([])}},[receptionId,selectableLots])
 useEffect(()=>{if(executiveMode)return;let active=true;void fetch('/api/canonical-intelligence-brief').then(async response=>response.ok?response.json() as Promise<BriefPayload>:null).then(payload=>{if(active&&payload?.brief)setBrief(payload.brief)}).catch(()=>undefined);return()=>{active=false}},[executiveMode])
 const ask=useCallback(async(value=question)=>{const clean=value.trim();if(!clean||loading)return;setLoading(true);setError('');setQuestion('');try{const response=await fetch('/api/copilot',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:clean,plantId:plantId||null,receptionId:receptionId||null,history:turns.slice(-6).map(turn=>({question:turn.question,answer:turn.answer}))})}),payload=await response.json() as Payload;if(!response.ok||!payload.answer||!payload.generatedAt||!payload.scope)throw new Error(payload.error??(isEs?'No fue posible obtener una respuesta':'Unable to get a response'));setTurns(current=>[...current,{id:crypto.randomUUID(),question:clean,answer:payload.answer!,sources:payload.sources??[],generatedAt:payload.generatedAt!,scope:payload.scope!,engine:payload.engine??'Seafood AI',policyVersion:payload.policyVersion??'seafood.ai.evidence.v12',router:payload.router,evidenceGate:payload.evidenceGate}])}catch(cause){setError(cause instanceof Error?cause.message:(isEs?'No fue posible obtener una respuesta':'Unable to get a response'))}finally{setLoading(false);requestAnimationFrame(()=>inputRef.current?.focus())}},[question,loading,plantId,receptionId,turns,isEs])
 useEffect(()=>{if(!requestedPrompt||loading)return;const key=[requestedSource,requestedPlantId,requestedReceptionId,requestedPrompt].join('|');if(deepLinkHandled.current===key)return;if(requestedPlantId&&plantId!==requestedPlantId)return;if(requestedReceptionId&&receptionId!==requestedReceptionId)return;deepLinkHandled.current=key;void ask(requestedPrompt)},[requestedPrompt,requestedSource,requestedPlantId,requestedReceptionId,plantId,receptionId,loading,ask])
 function patchTurn(id:string,patch:Partial<Turn>){setTurns(current=>current.map(turn=>turn.id===id?{...turn,...patch}:turn))}
 async function saveFeedback(turn:Turn){
  const rating=turn.feedbackRating,comment=(turn.feedbackComment??'').trim()
  if(!rating||turn.feedbackSaving||turn.feedbackSaved)return
  if(rating==='bad'&&!comment){patchTurn(turn.id,{feedbackError:isEs?'Cuéntanos brevemente qué estuvo incorrecto.':'Briefly tell us what was incorrect.'});return}
  patchTurn(turn.id,{feedbackSaving:true,feedbackError:''})
  try{
   const response=await fetch('/api/ml-feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rating,comment,question:turn.question,answer:turn.answer,plantId:turn.scope.plantId,receptionId:receptionId||null,sourceIds:turn.sources.map(source=>source.id),policyVersion:turn.policyVersion,engine:turn.engine,routerIntent:turn.router?.intent??null})})
   const payload=await response.json() as {ok?:boolean;error?:string}
   if(!response.ok||!payload.ok)throw new Error(payload.error??(isEs?'No fue posible guardar el feedback.':'Unable to save feedback.'))
   patchTurn(turn.id,{feedbackSaving:false,feedbackSaved:true,feedbackError:''})
  }catch(cause){patchTurn(turn.id,{feedbackSaving:false,feedbackError:cause instanceof Error?cause.message:(isEs?'No fue posible guardar el feedback.':'Unable to save feedback.')})}
 }
 function submit(event:FormEvent){event.preventDefault();void ask()}
 function reset(){setTurns([]);setError('');setQuestion('');inputRef.current?.focus()}
 const plantLabel=plantId?available.find(plant=>plant.id===plantId)?.name??plantId:operator?.role==='admin'?(isEs?'Toda Pescamar':'All Pescamar'):available.length===1?available[0].name:(isEs?'Tus plantas':'Your plants')
 const selectedLot=selectableLots.find(lot=>lot.receptionId===receptionId),selectedIsUrchin=/eriz|urchin/i.test(String(selectedLot?.species??''))
 const selectedPrompts=selectedIsUrchin?(isEs?['¿Está listo para Japón?','¿Qué lo bloquea?','¿Qué hago ahora?','¿Qué requiere atención?']:['Is it ready for Japan?','What is blocking it?','What should I do now?','What needs attention?']):(isEs?['¿Cuál es el estado?','¿Qué lo bloquea?','¿Qué hago ahora?','¿Qué requiere atención?']:['What is the status?','What is blocking it?','What should I do now?','What needs attention?'])
 const inheritedContext=requestedSource||requestedPlantId||requestedReceptionId||requestedPrompt
 const valueCopy=isEs?'Cruza recepción, producción, calidad, inventario, pedidos y trazabilidad para darte sólo lo que cambia una decisión.':'Crosses reception, production, quality, inventory, orders and traceability to surface only what changes a decision.'
 return <>
  <PageHeader eyebrow={isEs?'Inteligencia operacional':'Operational intelligence'} title="Seafood AI" description={executiveMode?(isEs?'Trabaja como siempre. Seafood AI reúne más datos, detecta excepciones y te ayuda a decidir qué mover ahora.':'Work as usual. Seafood AI brings more data together, detects exceptions and helps you decide what to move now.'):(isEs?'Pregunta por la operación y el historial. El sistema carga sólo la información necesaria y la IA no cambia datos.':'Ask about operations and history. The system loads only the required information, and AI never changes records.')} actions={<><label className="inline-field">{isEs?'Planta':'Plant'}<select value={plantId} onChange={event=>{setPlantId(event.target.value);setReceptionId('');setTurns([])}}><option value="">{operator?.role==='admin'?(isEs?'Todas las plantas':'All plants'):(isEs?'Mis plantas':'My plants')}</option>{available.map(plant=><option value={plant.id} key={plant.id}>{plant.name}</option>)}</select></label><label className="inline-field">{isEs?'Lote':'Lot'}<select value={receptionId} onChange={event=>{setReceptionId(event.target.value);setTurns([])}}><option value="">{isEs?'Todos':'All'}</option>{selectableLots.map(lot=><option value={lot.receptionId} key={lot.receptionId}>{lot.id} · {lot.species} · {lot.supplier}</option>)}</select></label><button className="button secondary" type="button" onClick={reset}><RefreshCw size={15}/>{isEs?'Nueva':'New'}</button></>}/>

  <section className={`copilot-context ${executiveMode?'executive':''}`} aria-label={isEs?'Contexto activo':'Active context'}>
   <div><LockKeyhole size={16}/><span><small>{isEs?'Ámbito':'Scope'}</small><b>{selectedLot?`${selectedLot.id} · ${selectedLot.species}`:plantLabel}</b></span></div>
   <div><Database size={16}/><span><small>{isEs?'Datos':'Data'}</small><b>{selectedLot?(isEs?'Lote + operación':'Lot + operation'):(isEs?'Operación + trazabilidad':'Operation + traceability')}</b></span></div>
   <div><ShieldCheck size={16}/><span><small>{isEs?'Control':'Control'}</small><b>{isEs?'Sólo lectura':'Read only'}</b></span></div>
  </section>

  {executiveMode&&!turns.length&&!selectedLot?<section className="copilot-value"><Sparkles size={18}/><div><b>{isEs?'Más contexto, mismo trabajo':'More context, same job'}</b><p>{valueCopy}</p></div></section>:null}
  {inheritedContext?<div className="notice copilot-inherited"><Sparkles size={17}/><div><b>{isEs?'Contexto desde':'Context from'} {sourceLabels[requestedSource]??(isEs?'la operación':'operations')}</b><small>{selectedLot?`${selectedLot.id} · ${selectedLot.species} · ${selectedLot.supplier}`:plantId?plantLabel:(isEs?'Ámbito Pescamar':'Pescamar scope')}</small></div></div>:null}

  {brief&&!executiveMode&&!plantId&&!receptionId?<section className="canonical-brief" aria-label={isEs?'Resumen':'Summary'}><div className="canonical-brief-head"><small>{isEs?'Resumen':'Summary'}</small><Link to={brief.evidencePath}>{isEs?'Ver respaldo':'View evidence'} <ArrowRight size={14}/></Link></div><div className="canonical-brief-grid"><div><small>{isEs?'Sabemos':'Known'}</small><p>{brief.know}</p></div><div><small>{isEs?'Significa':'Meaning'}</small><p>{brief.meaning}</p></div><div className="canonical-brief-action"><small>{isEs?'Siguiente':'Next'}</small><strong>{brief.action}</strong></div></div></section>:null}

  <section className={`copilot-workspace panel ${executiveMode?'executive':''}`}>
   <div className="copilot-thread" aria-live="polite">
    {turns.length?turns.map(turn=><article className="copilot-turn" key={turn.id}>
     <div className="copilot-question"><span>{isEs?'Tú':'You'}</span><p>{turn.question}</p></div>
     <div className="copilot-response"><div className="copilot-avatar"><Bot size={18}/></div><div className="copilot-response-body"><div className="copilot-response-heading"><b>Seafood AI</b><small>{new Date(turn.generatedAt).toLocaleString(tag)} · {turn.scope.plantId?available.find(plant=>plant.id===turn.scope.plantId)?.name??turn.scope.plantId:'Pescamar'}</small></div><Answer text={turn.answer} sources={turn.sources} isEs={isEs}/>
      {turn.evidenceGate?.status!=='sufficient'&&turn.evidenceGate&&(turn.evidenceGate.missing.length||turn.evidenceGate.empty.length)?<div className="source-note"><b>{isEs?'Falta para afirmar más':'Missing to conclude more'}</b><span>{[...turn.evidenceGate.missing,...turn.evidenceGate.empty].map(humanCapability).join(' · ')}</span></div>:null}
      {turn.sources.length?<details className="copilot-evidence"><summary>{isEs?'Ver evidencia usada':'View evidence used'} <span>{turn.sources.length}</span></summary><div className="copilot-sources">{turn.sources.map(source=><Link to={source.path} key={source.id}><span>{source.label}<small>{source.evidenceClass?evidenceLabels[source.evidenceClass]:''}</small></span><ArrowRight size={13}/></Link>)}</div></details>:null}
      <div className="source-note" aria-label={isEs?'Feedback para aprendizaje':'Learning feedback'}>
       {turn.feedbackSaved?<span>{isEs?'Feedback guardado como candidato de aprendizaje.':'Feedback saved as a learning candidate.'}</span>:<>
        <b>{isEs?'¿Fue correcta esta interpretación?':'Was this interpretation correct?'}</b>
        <span>
         <button className="button secondary" type="button" onClick={()=>patchTurn(turn.id,{feedbackRating:'good',feedbackSaved:false,feedbackError:''})} aria-pressed={turn.feedbackRating==='good'}><ThumbsUp size={14}/>{isEs?'Correcto':'Correct'}</button>{' '}
         <button className="button secondary" type="button" onClick={()=>patchTurn(turn.id,{feedbackRating:'bad',feedbackSaved:false,feedbackError:''})} aria-pressed={turn.feedbackRating==='bad'}><ThumbsDown size={14}/>{isEs?'Incorrecto':'Incorrect'}</button>
        </span>
        {turn.feedbackRating?<><textarea rows={2} maxLength={1200} value={turn.feedbackComment??''} onChange={event=>patchTurn(turn.id,{feedbackComment:event.target.value,feedbackError:''})} placeholder={turn.feedbackRating==='bad'?(isEs?'¿Qué estuvo incorrecto?':'What was incorrect?'):(isEs?'Comentario opcional':'Optional comment')}/><button className="button secondary" type="button" disabled={turn.feedbackSaving||(turn.feedbackRating==='bad'&&!(turn.feedbackComment??'').trim())} onClick={()=>void saveFeedback(turn)}>{turn.feedbackSaving?(isEs?'Guardando…':'Saving…'):(isEs?'Guardar feedback':'Save feedback')}</button></>:null}
        {turn.feedbackError?<small>{turn.feedbackError}</small>:null}
       </>}
      </div>
     </div></div>
    </article>):<div className={`copilot-empty ${executiveMode?'executive':''}`}>
     <span className="copilot-mark"><Sparkles size={24}/></span>
     <h2>{selectedLot?(isEs?`¿Qué necesitas resolver de ${selectedLot.id}?`:`What do you need to resolve for ${selectedLot.id}?`):executiveMode?(isEs?'¿Qué necesitas resolver ahora?':'What do you need to resolve now?'):(isEs?'Pregunta a Pescamar':'Ask Pescamar')}</h2>
     <p>{selectedLot?(selectedIsUrchin?(isEs?'Estado, proceso, calidad, frío y liberación, con evidencia del lote.':'Status, process, quality, cold chain and release, with lot evidence.'):(isEs?'Estado, bloqueos y siguiente acción, usando el contexto completo disponible.':'Status, blockers and next action using the full available context.')):executiveMode?valueCopy:(isEs?'Pregunta por producción, lotes, proveedores, stock, packing o finanzas.':'Ask about production, lots, suppliers, stock, packing or finance.')}</p>
     <div className="copilot-prompts">{(selectedLot?selectedPrompts:examples).map((example,index)=><button className={executiveMode&&index===0?'primary-prompt':''} type="button" onClick={()=>void ask(example)} key={example}><span>{example}</span><ArrowRight size={14}/></button>)}</div>
    </div>}
    {loading?<div className="copilot-thinking"><span/><span/><span/>{isEs?'Revisando la operación…':'Reviewing operations…'}</div>:null}
    {error?<div className="system-banner error" role="alert">{error}</div>:null}
   </div>
   <form className="copilot-composer" onSubmit={submit}>
    <label htmlFor="copilot-question" className="sr-only">{isEs?'Pregunta':'Question'}</label>
    <textarea ref={inputRef} id="copilot-question" rows={2} value={question} maxLength={1800} onChange={event=>setQuestion(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();void ask()}}} placeholder={selectedLot?(isEs?'Pregunta por este lote…':'Ask about this lot…'):executiveMode?(isEs?'Pregunta qué requiere atención, compara plantas o revisa un bloqueo…':'Ask what needs attention, compare plants or review a blocker…'):(isEs?'Pregunta por Pescamar…':'Ask about Pescamar…')} disabled={loading}/>
    <button className="button primary" type="submit" disabled={loading||!question.trim()}><Send size={16}/><span>{isEs?'Enviar':'Send'}</span></button>
    <small>{executiveMode?(isEs?'Seafood AI cruza datos autorizados y recomienda; tú mantienes la decisión.':'Seafood AI combines authorized data and recommends; you keep the decision.'):(isEs?'Seafood AI consulta información autorizada; no modifica registros ni ejecuta decisiones.':'Seafood AI reads authorized information; it does not modify records or execute decisions.')}</small>
   </form>
  </section>
 </>
}

import {Camera,ChevronRight,ExternalLink,Link2,Send,Sparkles,X} from 'lucide-react'
import {useCallback,useEffect,useMemo,useRef,useState,type ChangeEvent,type FormEvent} from 'react'
import {Link,useLocation,useSearchParams} from 'react-router-dom'
import {canExecutePlantAction,type PlantAgentAction} from '../access'
import {useAuth} from '../auth'
import {useLocale} from '../i18n'
import {useLots} from '../store'
import './sea-urchin-assistant.css'

type EvidenceClass='live_observation'|'derived_live'|'canonical_reference'|'canonical_history'|'partial_financial'
type Source={id:string;label:string;path:string;rows:number;freshness:string|null;evidenceClass?:EvidenceClass}
type Scope={plantId:string|null;plantIds:string[];role:string;organizationId?:string}
type Turn={id:string;question:string;answer:string;sources:Source[];generatedAt:string;scope:Scope;engine:string;policyVersion:string;suggestedQuestions:string[]}
type Payload={answer?:string;engine?:string;policyVersion?:string;generatedAt?:string;scope?:Scope;sources?:Source[];suggestedQuestions?:string[];error?:string}
type Photo={id:string;name:string;dataUrl:string}
type AgentAction={id:PlantAgentAction;labelEs:string;labelEn:string;route:string}

function Answer({text,sources}:{text:string;sources:Source[]}){
 const lookup=new Map(sources.map(source=>[source.id,source]))
 const parts=text.split(/(\[(?:receptions|production|quality|inventory|orders|canonical_sources|canonical_inventory|historical_lineage|canonical_intelligence|finance|urchin_graph|photo_observation)\])/g)
 return <div className="urchin-assistant-answer">{parts.map((part,index)=>{const match=/^\[([^\]]+)\]$/.exec(part),source=match?lookup.get(match[1]):null;return source?<Link key={`${part}-${index}`} to={source.path} className="urchin-assistant-citation" title={source.label}>{part}</Link>:<span key={index}>{part}</span>})}</div>
}

async function preparePhoto(file:File):Promise<Photo>{
 const dataUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file)})
 return {id:crypto.randomUUID(),name:file.name,dataUrl}
}

export function PlantAssistant(){
 const {pathname}=useLocation()
 const [params]=useSearchParams()
 const {operator}=useAuth()
 const {locale}=useLocale()
 const {lots}=useLots(Boolean(operator))
 const [open,setOpen]=useState(false),[showLots,setShowLots]=useState(false),[receptionId,setReceptionId]=useState(''),[question,setQuestion]=useState(''),[turns,setTurns]=useState<Turn[]>([]),[photos,setPhotos]=useState<Photo[]>([]),[loading,setLoading]=useState(false),[photoLoading,setPhotoLoading]=useState(false),[error,setError]=useState('')
 const inputRef=useRef<HTMLTextAreaElement>(null),threadRef=useRef<HTMLDivElement>(null),photoInputRef=useRef<HTMLInputElement>(null)
 const routeLot=/^\/lotes\/([0-9a-f-]{36})$/i.exec(pathname)?.[1]??''
 const requestedLot=params.get('receptionId')??routeLot
 const selectedLot=lots.find(lot=>lot.receptionId===receptionId)
 const isUrchin=Boolean(selectedLot&&/eriz|urchin/i.test(String(selectedLot.species)))
 const plantId=selectedLot?.plantId??params.get('plantId')??null
 const lotQuery=receptionId?`receptionId=${encodeURIComponent(receptionId)}`:''
 const plantQuery=plantId?`plantId=${encodeURIComponent(plantId)}`:''
 const join=(base:string,...parts:string[])=>{const query=parts.filter(Boolean).join('&');return query?`${base}?${query}`:base}
 const copy=locale==='en'?{
  name:'Plant Agent',tag:'Seafood AI',subtitle:'Pescamar data and operations',close:'Close assistant',lot:'Link lot',linked:'Lot linked',noLot:'No lot',photo:'Photo',send:'Send',placeholder:'Ask about Pescamar operations…',emptyTitle:'Ask about the plant',emptyText:'I can work across receptions, process, quality, packing, inventory, cold chain, commercial, finance and historical Pescamar data. I keep plant and role permissions.',thinking:'Analyzing…',evidence:'View evidence',allOps:'What needs attention now?',trace:'Trace this lot end to end',commercial:'What is committed and at risk?',inventory:'What product is available and where?',urchin:'Analyze this sea urchin lot',photoOnly:'Photos are enabled for sea urchin lots.',error:'Could not consult the plant agent.',actions:'Actions',actionsNote:'Only actions your current role can execute are shown. Material quality, regulatory and commercial decisions still require human confirmation.'
 }:{
  name:'Agente de Planta',tag:'Seafood AI',subtitle:'Datos y operación de Pescamar',close:'Cerrar asistente',lot:'Vincular lote',linked:'Lote vinculado',noLot:'Sin lote',photo:'Foto',send:'Enviar',placeholder:'Pregunta sobre la operación de Pescamar…',emptyTitle:'Pregunta por la planta',emptyText:'Puedo trabajar sobre recepciones, proceso, calidad, packing, inventario, frío, comercial, finanzas y la historia de Pescamar. Respeto el alcance de planta y rol.',thinking:'Analizando…',evidence:'Ver evidencia',allOps:'¿Qué requiere atención ahora?',trace:'Traza este lote de punta a punta',commercial:'¿Qué está comprometido y en riesgo?',inventory:'¿Qué producto hay disponible y dónde?',urchin:'Analiza este lote de erizo',photoOnly:'Las fotos se habilitan para lotes de erizo.',error:'No fue posible consultar al agente de planta.',actions:'Acciones',actionsNote:'Sólo se muestran acciones que tu rol actual puede ejecutar. Las decisiones materiales de calidad, regulación y comercial siguen requiriendo confirmación humana.'
 }
 const actions=useMemo<AgentAction[]>(()=>{
  if(!operator)return[]
  const candidates:AgentAction[]=[
   {id:'process',labelEs:'Proceso',labelEn:'Process',route:join('/lineas/detalle',lotQuery,plantQuery)},
   {id:'quality',labelEs:'Calidad',labelEn:'Quality',route:join('/control-regulatorio',lotQuery,plantQuery)},
   {id:'packing',labelEs:'Packing',labelEn:'Packing',route:join('/pallets/detalle',lotQuery,plantQuery)},
   {id:'inventory',labelEs:'Inventario',labelEn:'Inventory',route:join('/inventario/detalle',lotQuery,plantQuery)},
   {id:'cold',labelEs:'Frío',labelEn:'Cold chain',route:join('/frio/detalle',lotQuery,plantQuery)},
   {id:'orders',labelEs:'Orden comercial',labelEn:'Sales order',route:join('/ordenes-venta',lotQuery,plantQuery)},
   {id:'dispatch',labelEs:'Despacho / venta',labelEn:'Dispatch / sale',route:join('/despachos-ventas',lotQuery,plantQuery)},
   {id:'costs',labelEs:'Costos',labelEn:'Costs',route:join('/costos-transformacion/detalle',lotQuery,plantQuery)},
   {id:'close',labelEs:'Cierre',labelEn:'Close',route:'/'}
  ]
  return candidates.filter(action=>canExecutePlantAction(operator.role,action.id))
 },[operator,lotQuery,plantQuery])
 useEffect(()=>{if(requestedLot&&lots.some(lot=>lot.receptionId===requestedLot)&&requestedLot!==receptionId){setReceptionId(requestedLot);setTurns([])}},[requestedLot,lots,receptionId])
 useEffect(()=>{const onOpen=(event:Event)=>{const target=String((event as CustomEvent<{receptionId?:string}>).detail?.receptionId??'');if(target&&lots.some(lot=>lot.receptionId===target)){setReceptionId(target);setTurns([])}setOpen(true)};window.addEventListener('pescamar:open-urchin-ai',onOpen);window.addEventListener('pescamar:open-plant-ai',onOpen);return()=>{window.removeEventListener('pescamar:open-urchin-ai',onOpen);window.removeEventListener('pescamar:open-plant-ai',onOpen)}},[lots])
 useEffect(()=>{if(open)requestAnimationFrame(()=>inputRef.current?.focus())},[open])
 useEffect(()=>{threadRef.current?.scrollTo({top:threadRef.current.scrollHeight,behavior:'smooth'})},[turns,loading])
 useEffect(()=>{if(!open)return;const key=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[open])
 const initialPrompts=useMemo(()=>selectedLot?[copy.trace,isUrchin?copy.urchin:copy.allOps]:[copy.allOps,copy.inventory,copy.commercial],[selectedLot,isUrchin,copy])
 const prompts=(turns.at(-1)?.suggestedQuestions?.length?turns.at(-1)!.suggestedQuestions:initialPrompts).slice(0,3)
 const ask=useCallback(async(value=question)=>{const clean=value.trim()||(photos.length&&isUrchin?(locale==='en'?'Analyze these sea urchin photos and tell me what is observed and what should be reviewed.':'Analiza estas fotos de erizo y dime qué se observa y qué debería revisar.'):'');if(!clean||loading)return;setLoading(true);setError('');setQuestion('');try{const response=await fetch('/api/copilot',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...(isUrchin?{mode:'sea_urchin_senior'}:{}),question:clean,plantId,receptionId:receptionId||null,images:isUrchin?photos.map(photo=>photo.dataUrl):[],history:turns.slice(-6).map(turn=>({question:turn.question,answer:turn.answer}))})});const payload=await response.json() as Payload;if(!response.ok||!payload.answer||!payload.generatedAt||!payload.scope)throw new Error(payload.error??copy.error);setTurns(current=>[...current,{id:crypto.randomUUID(),question:clean,answer:payload.answer!,sources:payload.sources??[],generatedAt:payload.generatedAt!,scope:payload.scope!,engine:payload.engine??copy.name,policyVersion:payload.policyVersion??'seafood.ai.evidence.v3',suggestedQuestions:(payload.suggestedQuestions??[]).slice(0,3)}])}catch(cause){setError(cause instanceof Error?cause.message:copy.error)}finally{setLoading(false);requestAnimationFrame(()=>inputRef.current?.focus())}},[copy.error,copy.name,isUrchin,loading,locale,photos,plantId,question,receptionId,turns])
 async function addPhotos(event:ChangeEvent<HTMLInputElement>){const files=[...(event.target.files??[])].filter(file=>file.type.startsWith('image/')).slice(0,3-photos.length);event.target.value='';if(!files.length)return;setPhotoLoading(true);setError('');try{const prepared=await Promise.all(files.map(preparePhoto));setPhotos(current=>[...current,...prepared].slice(0,3));setTurns([])}catch{setError(copy.error)}finally{setPhotoLoading(false)}}
 function changeLot(value:string){setReceptionId(value);setShowLots(false);setTurns([]);setPhotos([]);setError('')}
 function submit(event:FormEvent){event.preventDefault();void ask()}
 if(!operator)return null
 return <>
  <button type="button" className={`urchin-assistant-trigger ${open?'is-open':''}`} onClick={()=>setOpen(value=>!value)} aria-expanded={open} aria-controls="plant-assistant-panel" aria-label={copy.name}><span className="urchin-assistant-trigger-mark"><Sparkles size={18}/></span><span><b>{copy.name}</b><small>{selectedLot?`${selectedLot.id} · ${selectedLot.species}`:copy.subtitle}</small></span></button>
  {open?<><button className="urchin-assistant-backdrop" type="button" onClick={()=>setOpen(false)} aria-label={copy.close}/><aside id="plant-assistant-panel" className="urchin-assistant-panel" aria-label={copy.name}>
   <header className="urchin-assistant-head"><div><span className="urchin-assistant-icon"><Sparkles size={18}/></span><div><small>{copy.tag}</small><b>{copy.name}</b></div></div><button type="button" onClick={()=>setOpen(false)} aria-label={copy.close}><X size={18}/></button></header>
   <div className="urchin-assistant-tools"><button type="button" className={selectedLot?'is-linked':''} onClick={()=>setShowLots(value=>!value)}><Link2 size={15}/>{selectedLot?copy.linked:copy.lot}</button>{isUrchin?<><button type="button" onClick={()=>photoInputRef.current?.click()} disabled={photos.length>=3||photoLoading}><Camera size={16}/>{photoLoading?'…':copy.photo}</button><input ref={photoInputRef} className="sr-only" type="file" accept="image/*" capture="environment" multiple onChange={addPhotos}/></>:null}</div>
   {showLots?<div className="urchin-assistant-lot-picker"><select autoFocus value={receptionId} onChange={event=>changeLot(event.target.value)}><option value="">{copy.noLot}</option>{lots.map(lot=><option key={lot.receptionId} value={lot.receptionId}>{lot.id} · {lot.species} · {lot.supplier}</option>)}</select></div>:null}
   {actions.length?<details className="urchin-visual-twin" open={false}><summary><Sparkles size={14}/><span>{copy.actions}</span><b>{actions.length}</b></summary><div><div className="urchin-assistant-prompts">{actions.map(action=><Link key={action.id} to={action.route} onClick={()=>setOpen(false)}>{locale==='en'?action.labelEn:action.labelEs}<ChevronRight size={13}/></Link>)}</div><small>{copy.actionsNote}</small></div></details>:null}
   {photos.length?<div className="urchin-assistant-photos">{photos.map(photo=><figure key={photo.id}><img src={photo.dataUrl} alt={photo.name}/><button type="button" onClick={()=>setPhotos(current=>current.filter(item=>item.id!==photo.id))} aria-label="Remove"><X size={12}/></button></figure>)}<small>{copy.photoOnly}</small></div>:null}
   <div ref={threadRef} className="urchin-assistant-thread" aria-live="polite">{turns.length?turns.map(turn=><article className="urchin-assistant-turn" key={turn.id}><div className="urchin-assistant-user">{turn.question}</div><div className="urchin-assistant-response"><span><Sparkles size={15}/></span><div><Answer text={turn.answer} sources={turn.sources}/>{turn.sources.length?<details><summary>{copy.evidence}</summary><div className="urchin-assistant-sources">{turn.sources.map(source=><Link key={source.id} to={source.path}>{source.label}<ExternalLink size={12}/></Link>)}</div></details>:null}</div></div></article>):<div className="urchin-assistant-empty"><h3>{copy.emptyTitle}</h3><p>{copy.emptyText}</p></div>}{loading?<div className="urchin-assistant-thinking"><span/><span/><span/>{copy.thinking}</div>:null}{error?<div className="urchin-assistant-error" role="alert">{error}</div>:null}</div>
   <div className="urchin-assistant-prompts">{prompts.map(prompt=><button type="button" key={prompt} onClick={()=>void ask(prompt)} disabled={loading}>{prompt}<ChevronRight size={13}/></button>)}</div>
   <form className="urchin-assistant-composer" onSubmit={submit}><textarea ref={inputRef} rows={2} maxLength={1800} value={question} onChange={event=>setQuestion(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();void ask()}}} placeholder={copy.placeholder} disabled={loading}/><button type="submit" disabled={loading||(!question.trim()&&!photos.length)} aria-label={copy.send}><Send size={17}/></button></form>
  </aside></>:null}
 </>
}

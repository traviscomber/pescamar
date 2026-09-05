import {Bot,ChevronRight,ExternalLink,Send,Sparkles,X} from 'lucide-react'
import {useEffect,useMemo,useRef,useState,type FormEvent} from 'react'
import {Link,useLocation,useSearchParams} from 'react-router-dom'
import {useAuth} from '../auth'
import {useLots} from '../store'
import './sea-urchin-assistant.css'

type EvidenceClass='live_observation'|'derived_live'|'canonical_reference'|'canonical_history'|'partial_financial'
type Source={id:string;label:string;path:string;rows:number;freshness:string|null;evidenceClass?:EvidenceClass}
type Scope={plantId:string|null;plantIds:string[];role:string;organizationId?:string}
type Turn={id:string;question:string;answer:string;sources:Source[];generatedAt:string;scope:Scope;engine:string;policyVersion:string}
type Payload={answer?:string;engine?:string;policyVersion?:string;generatedAt?:string;scope?:Scope;sources?:Source[];error?:string}

const prompts=['¿Está aprobado para Japón?','¿Qué falta para liberarlo?','Explícame el Grade y su evidencia','¿Cuál es el riesgo principal ahora?']

function Answer({text,sources}:{text:string;sources:Source[]}){
 const lookup=new Map(sources.map(source=>[source.id,source]))
 const parts=text.split(/(\[(?:receptions|production|quality|inventory|orders|canonical_sources|canonical_inventory|historical_lineage|canonical_intelligence|finance|urchin_graph)\])/g)
 return <div className="urchin-assistant-answer">{parts.map((part,index)=>{const match=/^\[([^\]]+)\]$/.exec(part),source=match?lookup.get(match[1]):null;return source?<Link key={`${part}-${index}`} to={source.path} className="urchin-assistant-citation" title={`Abrir ${source.label}`}>{part}</Link>:<span key={index}>{part}</span>})}</div>
}

export function SeaUrchinAssistant(){
 const {pathname}=useLocation(),[params]=useSearchParams(),{operator}=useAuth(),{lots}=useLots()
 const visible=pathname.startsWith('/proceso-erizo')
 const urlReceptionId=params.get('receptionId')??''
 const erizoLots=useMemo(()=>lots.filter(lot=>String(lot.species).toLowerCase().includes('eriz')&&Boolean(lot.receptionId)),[lots])
 const [open,setOpen]=useState(false),[receptionId,setReceptionId]=useState(''),[question,setQuestion]=useState(''),[turns,setTurns]=useState<Turn[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState('')
 const inputRef=useRef<HTMLTextAreaElement>(null),threadRef=useRef<HTMLDivElement>(null)
 useEffect(()=>{if(!visible){setOpen(false);return}const requested=urlReceptionId&&erizoLots.some(lot=>lot.receptionId===urlReceptionId)?urlReceptionId:'';const fallback=erizoLots[0]?.receptionId??'';const next=requested||fallback;if(next&&next!==receptionId){setReceptionId(next);setTurns([]);setError('')}},[visible,urlReceptionId,erizoLots,receptionId])
 useEffect(()=>{if(open)requestAnimationFrame(()=>inputRef.current?.focus())},[open])
 useEffect(()=>{threadRef.current?.scrollTo({top:threadRef.current.scrollHeight,behavior:'smooth'})},[turns,loading])
 useEffect(()=>{if(!open)return;const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[open])
 const selectedLot=erizoLots.find(lot=>lot.receptionId===receptionId),plantId=selectedLot?.plantId??null
 async function ask(value=question){const clean=value.trim();if(!clean||loading||!receptionId)return;setLoading(true);setError('');setQuestion('');try{const response=await fetch('/api/copilot',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'sea_urchin_senior',question:clean,plantId,receptionId,history:turns.slice(-6).map(turn=>({question:turn.question,answer:turn.answer}))})}),payload=await response.json() as Payload;if(!response.ok||!payload.answer||!payload.generatedAt||!payload.scope)throw new Error(payload.error??'No fue posible consultar el lote');setTurns(current=>[...current,{id:crypto.randomUUID(),question:clean,answer:payload.answer!,sources:payload.sources??[],generatedAt:payload.generatedAt!,scope:payload.scope!,engine:payload.engine??'Asistente Senior de Erizo',policyVersion:payload.policyVersion??'seafood.ai.evidence.v2'}])}catch(cause){setError(cause instanceof Error?cause.message:'No fue posible consultar el lote')}finally{setLoading(false);requestAnimationFrame(()=>inputRef.current?.focus())}}
 function submit(event:FormEvent){event.preventDefault();void ask()}
 function changeLot(value:string){setReceptionId(value);setTurns([]);setError('');setQuestion('')}
 if(!visible||!operator)return null
 return <>
  <button type="button" className={`urchin-assistant-trigger ${open?'is-open':''}`} onClick={()=>setOpen(value=>!value)} aria-expanded={open} aria-controls="urchin-assistant-panel" aria-label="Abrir Asistente Senior de Erizo"><span className="urchin-assistant-trigger-mark"><Sparkles size={18}/></span><span><b>IA Erizo</b><small>{selectedLot?selectedLot.id:'Asistente senior'}</small></span></button>
  {open?<><button className="urchin-assistant-backdrop" type="button" onClick={()=>setOpen(false)} aria-label="Cerrar asistente"/><aside id="urchin-assistant-panel" className="urchin-assistant-panel" aria-label="Asistente Senior de Erizo">
   <header className="urchin-assistant-head"><div><span className="urchin-assistant-icon"><Bot size={18}/></span><div><small>Seafood AI · evidence-native</small><b>Asistente Senior de Erizo</b></div></div><button type="button" onClick={()=>setOpen(false)} aria-label="Cerrar"><X size={18}/></button></header>
   <div className="urchin-assistant-scope"><label>Lote<select value={receptionId} onChange={event=>changeLot(event.target.value)}><option value="">Seleccionar lote</option>{erizoLots.map(lot=><option key={lot.receptionId} value={lot.receptionId}>{lot.id} · {lot.supplier}</option>)}</select></label>{selectedLot?<span><b>{selectedLot.supplier}</b><small>{selectedLot.zone} · {selectedLot.accepted.toLocaleString('es-CL')} kg aceptados</small></span>:null}</div>
   <div ref={threadRef} className="urchin-assistant-thread" aria-live="polite">{turns.length?turns.map(turn=><article className="urchin-assistant-turn" key={turn.id}><div className="urchin-assistant-user">{turn.question}</div><div className="urchin-assistant-response"><span><Sparkles size={15}/></span><div><Answer text={turn.answer} sources={turn.sources}/>{turn.sources.length?<details><summary>Evidencia consultada</summary><div className="urchin-assistant-sources">{turn.sources.map(source=><Link key={source.id} to={source.path}>{source.label}<ExternalLink size={12}/></Link>)}</div></details>:null}</div></div></article>):<div className="urchin-assistant-empty"><span><Sparkles size={22}/></span><h3>{selectedLot?`Consulta ${selectedLot.id}`:'Selecciona un lote'}</h3><p>Lee el Digital Twin, proceso, Color/Grade, rayos X, packing, frío, regulación y Japan Release. Nunca declara APTO JAPÓN sin liberación determinística.</p>{selectedLot?<div className="urchin-assistant-prompts">{prompts.map(prompt=><button type="button" key={prompt} onClick={()=>void ask(prompt)}>{prompt}<ChevronRight size={14}/></button>)}</div>:null}</div>}{loading?<div className="urchin-assistant-thinking"><span/><span/><span/>Analizando evidencia canónica y operacional…</div>:null}{error?<div className="urchin-assistant-error" role="alert">{error}</div>:null}</div>
   <form className="urchin-assistant-composer" onSubmit={submit}><textarea ref={inputRef} rows={2} maxLength={1800} value={question} onChange={event=>setQuestion(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();void ask()}}} placeholder={selectedLot?'Pregunta por Japón, Grade, proceso, frío o siguiente acción…':'Selecciona un lote para consultar…'} disabled={loading||!receptionId}/><button type="submit" disabled={loading||!question.trim()||!receptionId} aria-label="Enviar pregunta"><Send size={17}/></button><small>Lectura solamente · hechos, cálculos e inferencias separados</small></form>
  </aside></>:null}
 </>
}

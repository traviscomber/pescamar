import {useCallback,useEffect,useMemo,useState} from 'react'
import {CheckCircle2,ExternalLink,ScanLine,ShieldCheck,Target,XCircle} from 'lucide-react'
import {useAuth} from '../auth'

type Review={decision:'accepted'|'rejected';rejection_reason:string|null;note:string|null;reviewed_by:string;reviewed_at:string}|null
type VisionTest={status:string;analyzed_at:string;engine:string;provider?:string;model?:string;mask_mode?:string;usable_ratio?:number;l_mean?:number;a_mean?:number;b_mean?:number;dispersion?:number;border_candidate_ratio?:number;confidence:string;recommendation:string;observed?:Record<string,string>;summary?:string;operational_evidence:boolean;automatic_training:boolean;human_decision_required:boolean}|null
type Reference={id:string;title:string;source_page:string;image_url:string|null;scene:string;intended_use:string;source_type:string;quality_status:'unlabeled';official_grade:null;reviewPriority:number;reviewReason:string;latest_review:Review;visionTest:VisionTest}
type QualityKnowledge={reviewed:number;accepted:number;rejected:number;acceptanceRate:number;rejectionReasons:{reason:string;count:number}[];basis:string;interpretation:string;automaticTraining:false}|null
type VisionQualityComparison={compared:number;compatibleAccepted:number;compatibleRejected:number;cautionAccepted:number;cautionRejected:number;basis:string;interpretation:string;authority:'human_quality';automaticTraining:false}|null
type Payload={ok?:boolean;references?:Reference[];reviewQueue?:{total:number;pending:number;reviewed:number;analyzedPending:number;analyzed:number;unanalyzed:number;highPriority:number;firstBatch:string[];rule:string};qualityKnowledge?:QualityKnowledge;visionQualityComparison?:VisionQualityComparison;error?:string}

const reasons=[['color_fuera_objetivo','Color fuera de objetivo'],['color_poco_uniforme','Color poco uniforme'],['dano_visual','Daño visual'],['apariencia_no_conforme','Apariencia no conforme'],['material_extrano_visible','Material extraño visible'],['presentacion_no_conforme','Presentación no conforme'],['otro','Otro']] as const
const reasonLabels=Object.fromEntries(reasons) as Record<string,string>
const fmt=(value:number,digits=1)=>value.toLocaleString('es-CL',{maximumFractionDigits:digits})
const referenceImageUrl=(id:string)=>`/api/sea-urchin-reference-image?id=${encodeURIComponent(id)}`

export function UniReferenceReviewQueue(){
 const {operator}=useAuth()
 const allowed=operator&&['admin','quality'].includes(operator.role)
 const [payload,setPayload]=useState<Payload|null>(null)
 const [error,setError]=useState('')
 const [busy,setBusy]=useState('')
 const [preparing,setPreparing]=useState(false)
 const [prepareProgress,setPrepareProgress]=useState('')
 const [reasonById,setReasonById]=useState<Record<string,string>>({})
 const [noteById,setNoteById]=useState<Record<string,string>>({})
 const load=useCallback(async()=>{if(!allowed)return;const response=await fetch('/api/sea-urchin-external-references',{credentials:'same-origin',cache:'no-store'});const data=await response.json().catch(()=>({})) as Payload;if(!response.ok)throw new Error(data.error||'No fue posible cargar referencias Uni');setPayload(data)},[allowed])
 useEffect(()=>{if(!allowed)return;let active=true;void load().catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'No fue posible cargar referencias Uni')});return()=>{active=false}},[allowed,load])
 const firstBatch=useMemo(()=>payload?.references?.filter(item=>!item.latest_review).slice(0,12)??[],[payload])
 async function prepareAll(){
  if(preparing)return
  setPreparing(true);setError('');setPrepareProgress('Preparando resultados Vision…')
  try{
   let remaining=payload?.reviewQueue?.unanalyzed??0,totalDone=0,safety=0
   while(remaining>0&&safety<20){
    safety++
    const response=await fetch('/api/sea-urchin-external-references',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'analyze_pending',limit:5})})
    const data=await response.json().catch(()=>({})) as {error?:string;analysis?:{processed?:number;succeeded?:number;failed?:number;remaining?:number|null;failures?:Array<{id:string;error:string}>}}
    if(!response.ok)throw new Error(data.error||'No fue posible preparar los análisis Vision')
    totalDone+=data.analysis?.succeeded??0
    remaining=typeof data.analysis?.remaining==='number'?data.analysis.remaining:0
    setPrepareProgress(`${totalDone} resultados preparados · ${remaining} pendientes`)
    if((data.analysis?.processed??0)===0)break
   }
   await load()
   setPrepareProgress(remaining===0?'Resultados Vision preparados para revisión de Calidad.':`${remaining} referencias requieren un nuevo intento.`)
  }catch(cause){setError(cause instanceof Error?cause.message:'No fue posible preparar los análisis Vision')}
  finally{setPreparing(false)}
 }
 async function submit(item:Reference,decision:'accepted'|'rejected'){
  const rejectionReason=decision==='rejected'?(reasonById[item.id]||''):''
  const note=(noteById[item.id]||'').trim()
  if(decision==='rejected'&&!rejectionReason){setError('Selecciona por qué rechazas la referencia.');return}
  if(decision==='rejected'&&rejectionReason==='otro'&&!note){setError('Describe el motivo cuando seleccionas Otro.');return}
  setBusy(item.id);setError('')
  try{const response=await fetch('/api/sea-urchin-external-references',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({referenceId:item.id,decision,rejectionReason:rejectionReason||null,note:note||null})});const data=await response.json().catch(()=>({})) as {error?:string};if(!response.ok)throw new Error(data.error||'No fue posible guardar la decisión de Calidad');await load()}catch(cause){setError(cause instanceof Error?cause.message:'No fue posible guardar la decisión de Calidad')}finally{setBusy('')}
 }
 if(!allowed)return null
 return <section className="panel"><div className="section-heading"><div><span className="overline teal">Calidad enseña al sistema</span><h2>Revisión humana de referencias Uni</h2></div><span>{payload?.reviewQueue?.pending??'—'} pendientes</span></div>
  <div className="governance-note"><ShieldCheck size={19}/><div><b>Vision prepara evidencia. Calidad decide.</b><p>Primero dejamos cada referencia con observaciones visuales estructuradas; después Calidad aprueba o rechaza y explica el motivo.</p><small>Los resultados Vision son evidencia derivada: no asignan Grade, no liberan producto y no reentrenan automáticamente.</small></div></div>
  {payload&&(payload.reviewQueue?.unanalyzed??0)>0?<div className="row-actions" style={{marginTop:12}}><button type="button" className="button primary" disabled={preparing} onClick={()=>void prepareAll()}><ScanLine size={14}/>{preparing?'Preparando…':`Preparar ${payload.reviewQueue?.unanalyzed??0} resultados pendientes`}</button>{prepareProgress?<span className="source-note">{prepareProgress}</span>:null}</div>:null}
  {error?<div className="notice"><div><b>Atención</b><small>{error}</small></div></div>:null}
  {!payload&&!error?<div className="notice"><div><b>Cargando referencias…</b><small>Consultando catálogo real almacenado en Neon.</small></div></div>:null}
  {payload?<><div className="signal-grid"><article className="signal-card"><span><ScanLine size={16}/>Vision listo</span><b>{payload.reviewQueue?.analyzedPending??0}</b><small>casos esperando decisión humana</small></article><article className="signal-card"><span><Target size={16}/>Sin análisis</span><b>{payload.reviewQueue?.unanalyzed??0}</b><small>referencias aún por preparar</small></article><article className="signal-card"><span><CheckCircle2 size={16}/>Revisadas</span><b>{payload.reviewQueue?.reviewed??0}</b><small>decisiones humanas guardadas</small></article></div>
   {payload.qualityKnowledge?<section className="panel" style={{marginTop:16}}><div className="section-heading"><div><span className="overline teal">Conocimiento observado</span><h3>Lo que Calidad ya enseñó</h3></div><span>{payload.qualityKnowledge.reviewed} decisiones</span></div><div className="signal-grid"><article className="signal-card"><span><CheckCircle2 size={16}/>Aprobadas</span><b>{payload.qualityKnowledge.accepted}</b><small>decisiones humanas</small></article><article className="signal-card"><span><XCircle size={16}/>Rechazadas</span><b>{payload.qualityKnowledge.rejected}</b><small>decisiones humanas</small></article><article className="signal-card"><span><Target size={16}/>Aceptación observada</span><b>{Math.round(payload.qualityKnowledge.acceptanceRate*100)}%</b><small>sobre referencias revisadas; no es accuracy del modelo</small></article></div>{payload.qualityKnowledge.rejectionReasons.length?<div className="compact-ledger">{payload.qualityKnowledge.rejectionReasons.map(item=><div className="alert-row static" key={item.reason}><span><XCircle size={14}/></span><div><b>{reasonLabels[item.reason]??item.reason}</b><small>{item.count} rechazo{item.count===1?'':'s'} observado{item.count===1?'':'s'}</small></div></div>)}</div>:null}<p className="source-note">{payload.qualityKnowledge.interpretation}</p></section>:null}
   {payload.visionQualityComparison?<section className="panel" style={{marginTop:16}}><div className="section-heading"><div><span className="overline teal">Vision × Calidad</span><h3>Matriz observada de resultado humano</h3></div><span>{payload.visionQualityComparison.compared} casos comparables</span></div><div className="signal-grid"><article className="signal-card"><span><CheckCircle2 size={16}/>Vision compatible + Calidad aprueba</span><b>{payload.visionQualityComparison.compatibleAccepted}</b><small>coincidencia favorable observada</small></article><article className="signal-card"><span><XCircle size={16}/>Vision compatible + Calidad rechaza</span><b>{payload.visionQualityComparison.compatibleRejected}</b><small>casos para analizar primero</small></article><article className="signal-card"><span><Target size={16}/>Vision cautela + Calidad aprueba</span><b>{payload.visionQualityComparison.cautionAccepted}</b><small>la cautela no equivale a error</small></article><article className="signal-card"><span><ShieldCheck size={16}/>Vision cautela + Calidad rechaza</span><b>{payload.visionQualityComparison.cautionRejected}</b><small>cautela confirmada por decisión humana</small></article></div><p className="source-note">{payload.visionQualityComparison.interpretation} Autoridad final: Calidad.</p></section>:null}
   {firstBatch.length===0?<div className="notice"><CheckCircle2 size={16}/><div><b>Batch de revisión completo</b><small>No quedan referencias externas pendientes en este conjunto.</small></div></div>:<div className="compact-ledger">{firstBatch.map((item,index)=><div className="alert-row static" key={item.id}><span className="os-module-step">{String(index+1).padStart(2,'0')}</span><div style={{minWidth:0,flex:1}}>{item.image_url?<div style={{width:'100%',maxWidth:520,height:300,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',marginBottom:10,background:'rgba(255,255,255,0.025)'}}><img src={referenceImageUrl(item.id)} alt={item.title} loading="lazy" referrerPolicy="no-referrer" style={{width:'100%',height:'100%',objectFit:'contain',objectPosition:'center',display:'block'}}/></div>:null}<b>{item.title}</b><small>{item.reviewReason}</small>{item.visionTest?<VisionResult result={item.visionTest}/>:<p className="source-note">Sin análisis Vision persistido · sin etiqueta humana · Grade pendiente</p>}<div className="row-actions" style={{marginTop:8}}><select aria-label={`Motivo de rechazo ${item.title}`} value={reasonById[item.id]||''} onChange={event=>setReasonById(current=>({...current,[item.id]:event.target.value}))}><option value="">Motivo si rechazas…</option>{reasons.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select><input aria-label={`Observación ${item.title}`} value={noteById[item.id]||''} onChange={event=>setNoteById(current=>({...current,[item.id]:event.target.value}))} placeholder="Observación opcional" maxLength={1000}/></div><div className="row-actions" style={{marginTop:8}}><button className="button secondary" disabled={busy===item.id} onClick={()=>void submit(item,'accepted')}><CheckCircle2 size={14}/>Aprobar</button><button className="button secondary" disabled={busy===item.id} onClick={()=>void submit(item,'rejected')}><XCircle size={14}/>Rechazar</button><a className="source-link compact" href={item.source_page} target="_blank" rel="noreferrer">Ver fuente <ExternalLink size={12}/></a></div></div></div>)}</div>}
  </>:null}
 </section>
}

function VisionResult({result}:{result:NonNullable<VisionTest>}){
 const o=result.observed
 if(o)return <div className="notice" style={{marginTop:8}}><ScanLine size={15}/><div><b>Análisis Vision listo para Calidad</b><small>{result.summary||'Observaciones visuales estructuradas disponibles.'}</small><small>Color: {o.colorFamily??'no determinado'} · Uniformidad: {o.colorUniformity??'no determinada'} · Estructura: {o.structure??'no determinada'} · Presentación: {o.presentation??'no determinada'}</small><small>Riesgo de contexto: {o.contextRisk??'no determinado'} · confianza de extracción {fmt(Number(result.confidence)||0,2)}</small><small>Evidencia derivada. Decisión humana requerida.</small></div></div>
 const hasMetrics=typeof result.usable_ratio==='number'&&typeof result.l_mean==='number'&&typeof result.a_mean==='number'&&typeof result.b_mean==='number'&&typeof result.dispersion==='number'
 return <div className="notice" style={{marginTop:8}}><ScanLine size={15}/><div><b>Análisis Vision: {result.recommendation==='visually_consistent_with_test_reference'?'visualmente consistente con referencia de prueba':'requiere revisión'}</b>{hasMetrics?<small>Producto visible {Math.round((result.usable_ratio??0)*100)}% · L* {fmt(result.l_mean??0)} · a* {fmt(result.a_mean??0)} · b* {fmt(result.b_mean??0)} · dispersión {fmt(result.dispersion??0)}</small>:null}<small>Confianza de extracción {result.confidence}. Evidencia derivada. Decisión humana requerida.</small></div></div>
}

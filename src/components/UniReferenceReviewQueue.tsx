import {useCallback,useEffect,useMemo,useState} from 'react'
import {CheckCircle2,ExternalLink,ScanLine,ShieldCheck,Target,XCircle} from 'lucide-react'
import {useAuth} from '../auth'

type Review={decision:'accepted'|'rejected';rejection_reason:string|null;note:string|null;reviewed_by:string;reviewed_at:string}|null
type VisionTest={status:string;analyzed_at:string;engine:string;mask_mode:string;usable_ratio:number;l_mean:number;a_mean:number;b_mean:number;dispersion:number;border_candidate_ratio:number;confidence:string;recommendation:string;operational_evidence:boolean;automatic_training:boolean;human_decision_required:boolean}|null
type Reference={id:string;title:string;source_page:string;image_url:string|null;scene:string;intended_use:string;source_type:string;quality_status:'unlabeled';official_grade:null;reviewPriority:number;reviewReason:string;latest_review:Review;visionTest:VisionTest}
type Payload={ok?:boolean;references?:Reference[];reviewQueue?:{total:number;pending:number;reviewed:number;analyzedPending:number;highPriority:number;firstBatch:string[];rule:string};error?:string}

const reasons=[
 ['color_fuera_objetivo','Color fuera de objetivo'],
 ['color_poco_uniforme','Color poco uniforme'],
 ['dano_visual','Daño visual'],
 ['apariencia_no_conforme','Apariencia no conforme'],
 ['material_extrano_visible','Material extraño visible'],
 ['presentacion_no_conforme','Presentación no conforme'],
 ['otro','Otro'],
] as const
const fmt=(value:number,digits=1)=>value.toLocaleString('es-CL',{maximumFractionDigits:digits})

export function UniReferenceReviewQueue(){
 const {operator}=useAuth()
 const allowed=operator&&['admin','quality'].includes(operator.role)
 const [payload,setPayload]=useState<Payload|null>(null)
 const [error,setError]=useState('')
 const [busy,setBusy]=useState('')
 const [reasonById,setReasonById]=useState<Record<string,string>>({})
 const [noteById,setNoteById]=useState<Record<string,string>>({})
 const load=useCallback(async()=>{
  if(!allowed)return
  const response=await fetch('/api/sea-urchin-external-references',{credentials:'same-origin',cache:'no-store'})
  const data=await response.json().catch(()=>({})) as Payload
  if(!response.ok)throw new Error(data.error||'No fue posible cargar referencias Uni')
  setPayload(data)
 },[allowed])
 useEffect(()=>{
  if(!allowed)return
  let active=true
  void load().catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'No fue posible cargar referencias Uni')})
  return()=>{active=false}
 },[allowed,load])
 const firstBatch=useMemo(()=>payload?.references?.filter(item=>!item.latest_review).slice(0,12)??[],[payload])
 async function submit(item:Reference,decision:'accepted'|'rejected'){
  const rejectionReason=decision==='rejected'?(reasonById[item.id]||''):''
  const note=(noteById[item.id]||'').trim()
  if(decision==='rejected'&&!rejectionReason){setError('Selecciona por qué rechazas la referencia.');return}
  if(decision==='rejected'&&rejectionReason==='otro'&&!note){setError('Describe el motivo cuando seleccionas Otro.');return}
  setBusy(item.id);setError('')
  try{
   const response=await fetch('/api/sea-urchin-external-references',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({referenceId:item.id,decision,rejectionReason:rejectionReason||null,note:note||null})})
   const data=await response.json().catch(()=>({})) as {error?:string}
   if(!response.ok)throw new Error(data.error||'No fue posible guardar la decisión de Calidad')
   await load()
  }catch(cause){setError(cause instanceof Error?cause.message:'No fue posible guardar la decisión de Calidad')}
  finally{setBusy('')}
 }
 if(!allowed)return null
 return <section className="panel"><div className="section-heading"><div><span className="overline teal">Calidad enseña al sistema</span><h2>Revisión humana de referencias Uni</h2></div><span>{payload?.reviewQueue?.pending??'—'} pendientes</span></div>
  <div className="governance-note"><ShieldCheck size={19}/><div><b>Vision propone. Calidad decide.</b><p>Los casos con análisis Vision listo aparecen primero. La medición ayuda a revisar color y consistencia, pero no significa que el producto esté bueno o malo.</p><small>Aprobar o rechazar crea feedback humano trazable; no asigna Grade, no libera producto y no reentrena automáticamente.</small></div></div>
  {error?<div className="notice"><div><b>Atención</b><small>{error}</small></div></div>:null}
  {!payload&&!error?<div className="notice"><div><b>Cargando referencias…</b><small>Consultando catálogo real almacenado en Neon.</small></div></div>:null}
  {payload?<><div className="signal-grid"><article className="signal-card"><span><ScanLine size={16}/>Vision listo</span><b>{payload.reviewQueue?.analyzedPending??0}</b><small>casos esperando decisión humana</small></article><article className="signal-card"><span><Target size={16}/>Alta prioridad</span><b>{payload.reviewQueue?.highPriority??0}</b><small>casos difíciles pendientes</small></article><article className="signal-card"><span><CheckCircle2 size={16}/>Revisadas</span><b>{payload.reviewQueue?.reviewed??0}</b><small>decisiones humanas guardadas</small></article></div>
   {firstBatch.length===0?<div className="notice"><CheckCircle2 size={16}/><div><b>Batch de revisión completo</b><small>No quedan referencias externas pendientes en este conjunto.</small></div></div>:<div className="compact-ledger">{firstBatch.map((item,index)=><div className="alert-row static" key={item.id}><span className="os-module-step">{String(index+1).padStart(2,'0')}</span><div style={{minWidth:0,flex:1}}>{item.image_url?<img src={item.image_url} alt={item.title} loading="lazy" style={{width:'100%',maxWidth:360,maxHeight:220,objectFit:'cover',display:'block',marginBottom:10}}/>:null}<b>{item.title}</b><small>{item.reviewReason}</small>{item.visionTest?<div className="notice" style={{marginTop:8}}><ScanLine size={15}/><div><b>Análisis Vision: {item.visionTest.recommendation==='visually_consistent_with_test_reference'?'visualmente consistente con referencia de prueba':'requiere revisión'}</b><small>Producto visible {Math.round(item.visionTest.usable_ratio*100)}% · L* {fmt(item.visionTest.l_mean)} · a* {fmt(item.visionTest.a_mean)} · b* {fmt(item.visionTest.b_mean)} · dispersión {fmt(item.visionTest.dispersion)} · confianza de extracción {item.visionTest.confidence}</small><small>Esto es evidencia derivada. Decisión humana requerida.</small></div></div>:<p className="source-note">Sin análisis Vision persistido · sin etiqueta humana · Grade pendiente</p>}<div className="row-actions" style={{marginTop:8}}><select aria-label={`Motivo de rechazo ${item.title}`} value={reasonById[item.id]||''} onChange={event=>setReasonById(current=>({...current,[item.id]:event.target.value}))}><option value="">Motivo si rechazas…</option>{reasons.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select><input aria-label={`Observación ${item.title}`} value={noteById[item.id]||''} onChange={event=>setNoteById(current=>({...current,[item.id]:event.target.value}))} placeholder="Observación opcional" maxLength={1000}/></div><div className="row-actions" style={{marginTop:8}}><button className="button secondary" disabled={busy===item.id} onClick={()=>void submit(item,'accepted')}><CheckCircle2 size={14}/>Aprobar</button><button className="button secondary" disabled={busy===item.id} onClick={()=>void submit(item,'rejected')}><XCircle size={14}/>Rechazar</button><a className="source-link compact" href={item.source_page} target="_blank" rel="noreferrer">Ver fuente <ExternalLink size={12}/></a></div></div></div>)}</div>}
  </>:null}
 </section>
}

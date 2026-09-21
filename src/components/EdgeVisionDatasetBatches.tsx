import {useCallback,useEffect,useState} from 'react'
import {CheckCircle2,Database,Lock,ScanLine,ShieldCheck,TriangleAlert} from 'lucide-react'
import {useAuth} from '../auth'

type QaStatus='pending_review'|'validated'|'rejected'
type Batch={id:number;plant_id:string;capability:string;source_label:string;captured_from:string;captured_to:string;image_count:number;operator_confirmed_labels:number;storage_ref:string;qa_status:QaStatus;qa_notes:string|null;promoted_at:string|null;created_by_name:string|null;created_at:string}
type Payload={ok?:boolean;items?:Batch[];plants?:string[];capabilities?:string[];error?:string}
type BaselineResponse={ok?:boolean;promoted?:boolean;batchId?:number;code?:string;reason?:string;policyBoundary?:string;error?:string}
const qaStatusLabel:Record<QaStatus,string>={pending_review:'Pendiente de revisión',validated:'Validado por QA',rejected:'Rechazado'}
const qaStatusClass:Record<QaStatus,string>={pending_review:'info',validated:'success',rejected:''}
const capabilities=[['count','Conteo'],['calibre','Calibre'],['size','Tamaño'],['defects','Defectos'],['biomass','Biomasa'],['anomaly','Anomalías']] as const
const fmtDate=(value:string)=>new Intl.DateTimeFormat('es-CL',{dateStyle:'short',timeStyle:'short',timeZone:'America/Santiago'}).format(new Date(value))

export function EdgeVisionDatasetBatches(){
 const {operator}=useAuth()
 const allowed=operator?.role==='admin'
 const [payload,setPayload]=useState<Payload|null>(null)
 const [error,setError]=useState('')
 const [busy,setBusy]=useState('')
 const [form,setForm]=useState({plantId:'',capability:'',sourceLabel:'',capturedFrom:'',capturedTo:'',imageCount:'',operatorConfirmedLabels:'',storageRef:''})
 const [qaDraft,setQaDraft]=useState<Record<number,{status:QaStatus;notes:string}>>({})
 const [promoteNote,setPromoteNote]=useState<Record<string,string>>({})
 const load=useCallback(async()=>{const response=await fetch('/api/edgevision-datasets',{credentials:'same-origin',cache:'no-store'});const data=await response.json().catch(()=>({})) as Payload;if(!response.ok)throw new Error(data.error||'No fue posible cargar lotes de datasets');setPayload(data)},[])
 useEffect(()=>{if(!allowed)return;let active=true;void load().catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'No fue posible cargar lotes de datasets')});return()=>{active=false}},[allowed,load])
 async function createBatch(event:React.FormEvent){
  event.preventDefault()
  setBusy('create');setError('')
  try{
   const body={plantId:form.plantId,capability:form.capability,sourceLabel:form.sourceLabel.trim(),capturedFrom:new Date(form.capturedFrom).toISOString(),capturedTo:new Date(form.capturedTo).toISOString(),imageCount:Number(form.imageCount),operatorConfirmedLabels:Number(form.operatorConfirmedLabels),storageRef:form.storageRef.trim()}
   const response=await fetch('/api/edgevision-datasets',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
   const data=await response.json().catch(()=>({})) as Payload
   if(!response.ok)throw new Error(data.error||'No fue posible registrar el lote')
   setForm({plantId:form.plantId,capability:form.capability,sourceLabel:'',capturedFrom:'',capturedTo:'',imageCount:'',operatorConfirmedLabels:'',storageRef:''})
   await load()
  }catch(cause){setError(cause instanceof Error?cause.message:'No fue posible registrar el lote')}finally{setBusy('')}
 }
 async function updateStatus(batch:Batch){
  const draft=qaDraft[batch.id]??{status:batch.qa_status,notes:batch.qa_notes??''}
  setBusy(`qa-${batch.id}`);setError('')
  try{
   const response=await fetch('/api/edgevision-datasets',{method:'PATCH',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:batch.id,qaStatus:draft.status,qaNotes:draft.notes})})
   const data=await response.json().catch(()=>({})) as Payload
   if(!response.ok)throw new Error(data.error||'No fue posible actualizar la revisión QA')
   await load()
  }catch(cause){setError(cause instanceof Error?cause.message:'No fue posible actualizar la revisión QA')}finally{setBusy('')}
 }
 async function promote(capability:string){
  setBusy(`promote-${capability}`);setError('');setPromoteNote(current=>({...current,[capability]:''}))
  try{
   const response=await fetch('/api/edgevision-baseline',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({capability})})
   const data=await response.json().catch(()=>({})) as BaselineResponse
   if(!response.ok)throw new Error(data.reason||data.policyBoundary||data.error||'No fue posible evaluar la línea de base')
   setPromoteNote(current=>({...current,[capability]:`Provenance registrado para el lote #${data.batchId??'?'} de '${capability}'. La frontera predictiva sigue cerrada hasta Gate 5 y Gate 7.`}))
   await load()
  }catch(cause){
   const message=cause instanceof Error?cause.message:'No fue posible evaluar la línea de base'
   setPromoteNote(current=>({...current,[capability]:message}))
  }finally{setBusy('')}
 }
 if(!allowed)return null
 const items=payload?.items??[]
 return <section className="panel"><div className="section-heading"><div><span className="overline teal">Intake de datasets reales</span><h2>Lotes de dataset EdgeVision</h2></div><span>{items.length} lote{items.length===1?'':'s'}</span></div>
  <div className="governance-note"><ShieldCheck size={19}/><div><b>Este registro NO activa capacidades predictivas.</b><p>Cada lote es evidencia de captura real en planta: metadatos, ventana temporal y referencia de almacenamiento externo. QA lo revisa y valida; promoverlo a línea de base sólo registra provenance.</p><small>La frontera predictiva permanece cerrada (predictiveBaselineAvailable: false) hasta ejecutar Gate 5 y Gate 7 de docs/SEAFOOD-GRADE-A.md con sign-off real de Pescamar.</small></div></div>
  {error?<div className="notice"><TriangleAlert size={16}/><div><b>Atención</b><small>{error}</small></div></div>:null}
  <form onSubmit={event=>void createBatch(event)} style={{marginTop:16}}>
   <div className="signal-grid">
    <label className="signal-card"><span><Database size={16}/>Planta</span><select aria-label="Planta del lote" required value={form.plantId} onChange={event=>setForm(current=>({...current,plantId:event.target.value}))}><option value="">Selecciona planta…</option>{(payload?.plants??[]).map(plant=><option key={plant} value={plant}>{plant}</option>)}</select></label>
    <label className="signal-card"><span><ScanLine size={16}/>Capacidad</span><select aria-label="Capacidad del lote" required value={form.capability} onChange={event=>setForm(current=>({...current,capability:event.target.value}))}><option value="">Selecciona capacidad…</option>{capabilities.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <label className="signal-card"><span><Database size={16}/>Etiqueta de fuente</span><input aria-label="Etiqueta de fuente" required maxLength={200} value={form.sourceLabel} onChange={event=>setForm(current=>({...current,sourceLabel:event.target.value}))} placeholder="p. ej. línea 2 · cámara A · calada 12-09"/></label>
    <label className="signal-card"><span><Database size={16}/>Referencia de almacenamiento</span><input aria-label="Referencia de almacenamiento" required maxLength={500} value={form.storageRef} onChange={event=>setForm(current=>({...current,storageRef:event.target.value}))} placeholder="URI/bucket del blob store, nunca binario en la base de datos"/></label>
    <label className="signal-card"><span><Database size={16}/>Captura desde</span><input aria-label="Captura desde" required type="datetime-local" value={form.capturedFrom} onChange={event=>setForm(current=>({...current,capturedFrom:event.target.value}))}/></label>
    <label className="signal-card"><span><Database size={16}/>Captura hasta</span><input aria-label="Captura hasta" required type="datetime-local" value={form.capturedTo} onChange={event=>setForm(current=>({...current,capturedTo:event.target.value}))}/></label>
    <label className="signal-card"><span><Database size={16}/>N° de imágenes</span><input aria-label="Número de imágenes" required min={0} inputMode="numeric" value={form.imageCount} onChange={event=>setForm(current=>({...current,imageCount:event.target.value}))} placeholder="0"/></label>
    <label className="signal-card"><span><Database size={16}/>Etiquetas confirmadas por operador</span><input aria-label="Etiquetas confirmadas por operador" required min={0} inputMode="numeric" value={form.operatorConfirmedLabels} onChange={event=>setForm(current=>({...current,operatorConfirmedLabels:event.target.value}))} placeholder="0"/></label>
   </div>
   <div className="row-actions" style={{marginTop:12}}><button type="submit" className="button primary" disabled={busy==='create'}><Database size={14}/>{busy==='create'?'Registrando…':'Registrar lote de dataset'}</button></div>
  </form>
  {items.length===0?<div className="notice" style={{marginTop:16}}><Database size={16}/><div><b>Sin lotes registrados</b><small>Registra el primer lote de captura real desde planta para que QA pueda revisarlo.</small></div></div>:<div className="compact-ledger" style={{marginTop:16}}>{items.map(batch=>{
   const draft=qaDraft[batch.id]??{status:batch.qa_status,notes:batch.qa_notes??''}
   return <div className="alert-row static" key={batch.id}><span><Database size={15}/></span><div style={{minWidth:0,flex:1}}>
    <b>#{batch.id} · {batch.capability} · {batch.plant_id}</b>
    <small>{batch.source_label} · {fmtDate(batch.captured_from)} → {fmtDate(batch.captured_to)} · {batch.image_count} imágenes · {batch.operator_confirmed_labels} etiquetas confirmadas</small>
    <small>{batch.storage_ref}</small>
    {batch.qa_notes?<small>Notas QA: {batch.qa_notes}</small>:null}
    {batch.promoted_at?<small><CheckCircle2 size={12}/> Promovido a línea de base el {fmtDate(batch.promoted_at)} (provenance registrado)</small>:null}
    <div className="row-actions" style={{marginTop:8}}>
     <select aria-label={`Estado QA del lote ${batch.id}`} value={draft.status} onChange={event=>setQaDraft(current=>({...current,[batch.id]:{status:event.target.value as QaStatus,notes:draft.notes}}))}><option value="pending_review">Pendiente de revisión</option><option value="validated">Validado por QA</option><option value="rejected">Rechazado</option></select>
     <input aria-label={`Notas QA del lote ${batch.id}`} value={draft.notes} onChange={event=>setQaDraft(current=>({...current,[batch.id]:{status:draft.status,notes:event.target.value}}))} placeholder="Notas QA (obligatorias al validar, mín. 10 caracteres)" maxLength={2000}/>
     <button type="button" className="button secondary" disabled={busy===`qa-${batch.id}`} onClick={()=>void updateStatus(batch)}><CheckCircle2 size={14}/>Guardar revisión</button>
    </div>
   </div><span className={`status ${qaStatusClass[batch.qa_status]}`}>{qaStatusLabel[batch.qa_status]}</span></div>})}</div>}
  <div className="section-heading" style={{marginTop:20}}><div><span className="overline teal">Línea de base por capacidad</span><h3>Evaluar promoción (registra provenance, no activa nada)</h3></div></div>
  <div className="os-stage-modules">{capabilities.map(([value,label])=><div className="alert-row static" key={value}><span><Lock size={14}/></span><div style={{minWidth:0,flex:1}}><b>{label}</b><small>{promoteNote[value]?(promoteNote[value].includes('frontera')||promoteNote[value].includes('Gate')||promoteNote[value].includes('No existe')||promoteNote[value].includes('umbral')||promoteNote[value].includes('ya fue')?<span><TriangleAlert size={12}/> {promoteNote[value]}</span>:<span><CheckCircle2 size={12}/> {promoteNote[value]}</span>):'Evalúa si existe un lote validado que cumpla los umbrales de evidencia; mientras no, la frontera predictiva responde 409.'}</small></div><button type="button" className="button secondary" disabled={busy===`promote-${value}`} onClick={()=>void promote(value)}><Lock size={14}/>{busy===`promote-${value}`?'Evaluando…':'Evaluar promoción'}</button></div>)}</div>
 </section>
}

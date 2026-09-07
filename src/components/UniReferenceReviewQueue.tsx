import {useEffect,useMemo,useState} from 'react'
import {ExternalLink,ShieldCheck,Target} from 'lucide-react'
import {useAuth} from '../auth'

type Reference={id:string;title:string;source_page:string;image_url:string|null;scene:string;intended_use:string;source_type:string;quality_status:'unlabeled';official_grade:null;reviewPriority:number;reviewReason:string}
type Payload={ok?:boolean;references?:Reference[];reviewQueue?:{total:number;highPriority:number;firstBatch:string[];rule:string};error?:string}

export function UniReferenceReviewQueue(){
 const {operator}=useAuth()
 const allowed=operator&&['admin','quality'].includes(operator.role)
 const [payload,setPayload]=useState<Payload|null>(null)
 const [error,setError]=useState('')
 useEffect(()=>{
  if(!allowed)return
  let active=true
  void fetch('/api/sea-urchin-external-references',{credentials:'same-origin',cache:'no-store'}).then(async response=>{
   const data=await response.json().catch(()=>({})) as Payload
   if(!response.ok)throw new Error(data.error||'No fue posible cargar referencias Uni')
   if(active)setPayload(data)
  }).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'No fue posible cargar referencias Uni')})
  return()=>{active=false}
 },[allowed])
 const firstBatch=useMemo(()=>payload?.references?.slice(0,12)??[],[payload])
 if(!allowed)return null
 return <section className="panel"><div className="section-heading"><div><span className="overline teal">Calidad enseña al sistema</span><h2>Primer lote de revisión Uni</h2></div><span>{payload?.reviewQueue?.total??'—'} referencias</span></div>
  <div className="governance-note"><ShieldCheck size={19}/><div><b>Ordenamos primero los casos que más enseñan.</b><p>Defectos/variabilidad difícil → segmentación → escenas ambiguas. Esta prioridad es derivada del contexto; no significa que el producto esté bueno o malo.</p><small>Calidad sigue siendo la única autoridad para aprobar/rechazar y explicar por qué.</small></div></div>
  {error?<div className="notice"><div><b>No disponible</b><small>{error}</small></div></div>:null}
  {!error&&!payload?<div className="notice"><div><b>Cargando referencias…</b><small>Consultando catálogo real almacenado en Neon.</small></div></div>:null}
  {payload?<><div className="signal-grid"><article className="signal-card"><span><Target size={16}/>Alta prioridad</span><b>{payload.reviewQueue?.highPriority??0}</b><small>casos difíciles para revisar primero</small></article><article className="signal-card"><span><ShieldCheck size={16}/>Etiquetas humanas</span><b>0</b><small>no se inventan decisiones antes de Calidad</small></article></div><div className="compact-ledger">{firstBatch.map((item,index)=><div className="alert-row static" key={item.id}><span className="os-module-step">{String(index+1).padStart(2,'0')}</span><div><b>{item.title}</b><small>{item.reviewReason}</small><p className="source-note">Estado: sin etiqueta humana · Grade: pendiente</p></div><a className="source-link compact" href={item.source_page} target="_blank" rel="noreferrer">Abrir fuente <ExternalLink size={12}/></a></div>)}</div></>:null}
 </section>
}

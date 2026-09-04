import {AlertTriangle,ArrowRight,FlaskConical,PackageCheck,ScanLine} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'
import {Link,useSearchParams} from 'react-router-dom'
import {PageHeader} from '../components/PageHeader'

type Stage={stage:string;status:string}
type Label={status:string}
type Run={reception_id:string;reception_number:string|number;supplier:string;status:string;grade:string|null;color_status:string;xray_status:string;stages:Stage[];labels:Label[]}
type Candidate={id:string;reception_number:string|number;supplier:string}
type Payload={runs?:Run[];candidates?:Candidate[];error?:string}

export function SeaUrchinFocus(){
 const [params]=useSearchParams(),plantId=params.get('plantId')??''
 const [data,setData]=useState<Payload|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
 useEffect(()=>{let active=true;const q=plantId?`?plantId=${encodeURIComponent(plantId)}`:'';fetch(`/api/sea-urchin-process${q}`,{cache:'no-store'}).then(async r=>({r,p:await r.json() as Payload})).then(({r,p})=>{if(!active)return;if(!r.ok)throw new Error(p.error??'No fue posible cargar proceso de erizo');setData(p);setError('')}).catch(e=>{if(active)setError(e instanceof Error?e.message:'No fue posible cargar proceso de erizo')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[plantId])
 const runs=data?.runs??[],candidates=data?.candidates??[]
 const deviations=useMemo(()=>runs.reduce((n,r)=>n+r.stages.filter(s=>['deviation','hold'].includes(s.status)).length+r.labels.filter(l=>['mismatch','blocked'].includes(l.status)).length,0),[runs])
 const active=runs.filter(r=>r.status!=='closed'),ready=runs.filter(r=>r.status==='ready_for_packing')
 const colorAttention=active.filter(r=>['ng','review'].includes(r.color_status)||r.xray_status==='failed'||r.stages.some(s=>s.stage==='color'&&['deviation','hold'].includes(s.status)))
 const priority=colorAttention[0]??active.find(r=>r.stages.some(s=>['deviation','hold'].includes(s.status))||r.labels.some(l=>['mismatch','blocked'].includes(l.status)))??active[0]
 const detailBase='/proceso-erizo/detalle'
 const detailQuery=new URLSearchParams();if(plantId)detailQuery.set('plantId',plantId);if(priority?.reception_id)detailQuery.set('receptionId',priority.reception_id)
 const detail=`${detailBase}${detailQuery.toString()?`?${detailQuery.toString()}`:''}`
 const actionLabel=colorAttention.length?'Revisar Color / Grade':deviations?'Resolver control':active.length?'Continuar proceso':candidates.length?'Iniciar proceso':'Abrir detalle'
 return <>
  <PageHeader eyebrow="Proceso específico" title="Erizo" description="Estado, prioridad y siguiente acción. Color y Grade usan medición objetiva con confirmación humana."/>
  {error?<div className="system-banner error" role="alert">{error}</div>:null}{loading?<div className="system-banner">Actualizando proceso de erizo…</div>:null}
  {!loading&&!error?<>
   <section className={`daily-cockpit ${colorAttention.length||deviations?'has-attention':'is-clear'}`}><div className="daily-cockpit-copy"><span className="overline">Estado</span><h2>{colorAttention.length?`${colorAttention.length} lote${colorAttention.length===1?'':'s'} con color por revisar`:deviations?`${deviations} control${deviations===1?'':'es'} por revisar`:active.length?'Proceso en curso':'Sin proceso activo'}</h2><p>{colorAttention.length&&priority?`REC-${priority.reception_number} · ${priority.supplier} requiere revisión objetiva de color/Grade o rayos X antes de liberación.`:deviations&&priority?`REC-${priority.reception_number} · ${priority.supplier} tiene una desviación o bloqueo que debe resolverse antes de packing.`:active.length&&priority?`REC-${priority.reception_number} · ${priority.supplier} es el siguiente proceso activo.`:candidates.length?`${candidates.length} recepción${candidates.length===1?'':'es'} disponible${candidates.length===1?'':'s'} para iniciar.`:'No hay recepciones de erizo pendientes dentro del alcance.'}</p><div className="daily-cockpit-actions"><Link className="button primary" to={detail}>{actionLabel}<ArrowRight size={15}/></Link></div></div><div className="daily-status-mark" aria-hidden="true"><span>{colorAttention.length||deviations||'✓'}</span><small>{colorAttention.length?'color':deviations?'revisar':'sin alertas'}</small></div></section>
   <section className="signal-grid"><article className="signal-card"><span><FlaskConical size={16}/>Activos</span><b>{active.length}</b><small>procesos</small></article><article className="signal-card"><span><ScanLine size={16}/>Color / Grade</span><b>{colorAttention.length}</b><small>requieren revisión</small></article><article className="signal-card"><span><PackageCheck size={16}/>Packing</span><b>{ready.length}</b><small>listos</small></article></section>
   <div className="notice"><ScanLine size={16}/><div><b>Clasificación explicable</b><small>La estación conserva evidencia, CIELAB, dispersión y ΔE contra referencias reales de planta; Calidad confirma el resultado antes de liberar.</small></div></div>
   <nav className="daily-footer-actions"><Link className="text-action inline-link" to={detail}>Ver proceso completo<ArrowRight size={14}/></Link></nav>
  </>:null}
 </>
}

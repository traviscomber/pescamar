import {Factory} from 'lucide-react'
import {useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import {useLot360} from '../components/Lot360Context'
import {PageHeader} from '../components/PageHeader'
import type {Lot} from '../types'

type PlanRow={
  action:'blocked'|'allocate_finished'|'produce'
  recommendedKg:number
  receptionId:string|null
  receptionNumber:string|number|null
  supplier:string|null
  customer:string
  product:string
  species:string
  remainingKg:number
  lineName:string|null
}
type PlanningPayload={dailyPlan?:PlanRow[];error?:string}

const kg=(value:number)=>`${value.toLocaleString('es-CL',{maximumFractionDigits:1})} kg`
const actionLabel=(value:PlanRow['action'])=>value==='allocate_finished'?'Asignar producto terminado':value==='produce'?'Producir ahora':'Resolver bloqueo'

export function ProductionFocus({lots}:{lots:Lot[]}){
  const {openLive}=useLot360()
  const [priority,setPriority]=useState<PlanRow|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')

  useEffect(()=>{
    let active=true
    void fetch('/api/planning',{cache:'no-store'})
      .then(async response=>{
        const payload=await response.json() as PlanningPayload
        if(!response.ok)throw new Error(payload.error??'No fue posible calcular la siguiente acción')
        if(active){setPriority(payload.dailyPlan?.[0]??null);setError('')}
      })
      .catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'No fue posible calcular la siguiente acción')})
      .finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[])

  const hasLots=lots.length>0
  const blocked=priority?.action==='blocked'
  return <>
    <PageHeader eyebrow="Operación" title="Producción" description="El sistema resuelve prioridad, lote y destino. Tú ejecutas la siguiente acción física; el plan completo sólo aparece cuando existe un bloqueo."/>
    {error?<div className="system-banner error" role="alert">{error}</div>:null}
    <section className="panel" aria-label="Siguiente acción de producción">
      <div className="section-heading"><div><span className="overline">Siguiente acción</span><h2>{loading?'Calculando…':priority?actionLabel(priority.action):'Sin producción priorizada'}</h2></div></div>
      {loading?<p className="data-caveat">Revisando órdenes, lotes y disponibilidad.</p>:priority?<>
        <div className="balance-summary compact">
          <div><small>Lote</small><b>{priority.receptionNumber!=null?`REC-${priority.receptionNumber}`:'Sin lote liberado'}</b></div>
          <div><small>Cantidad</small><b>{kg(priority.recommendedKg)}</b></div>
          <div><small>Destino</small><b>{priority.customer}</b></div>
        </div>
        <p className="data-caveat">{priority.product} · {priority.species}{priority.supplier?` · ${priority.supplier}`:''}{priority.lineName?` · ${priority.lineName}`:''}</p>
        <div className="page-actions">
          {blocked?<Link className="button primary" to="/planificacion">Resolver bloqueo</Link>:priority.receptionId?<button className="button primary" onClick={()=>openLive(priority.receptionId!)}>Abrir lote</button>:<Link className="button primary" to="/planificacion">Resolver en planificación</Link>}
          {blocked&&priority.receptionId?<button className="button secondary" onClick={()=>openLive(priority.receptionId!)}>Ver evidencia del lote</button>:null}
        </div>
      </>:<div className="empty-state"><Factory size={28}/><h3>{hasLots?'No hay una orden que requiera producción ahora':'Sin lotes vivos'}</h3><p>{hasLots?'No hay una acción productiva pendiente. No necesitas revisar el plan completo.':'La primera recepción operacional aparecerá aquí cuando exista.'}</p>{!hasLots?<Link className="button primary" to="/recepciones">Ir a recepciones</Link>:null}</div>}
    </section>
    <nav className="more-actions" aria-label="Más información de producción"><Link to="/lineas/detalle">Ver detalle productivo</Link></nav>
  </>
}

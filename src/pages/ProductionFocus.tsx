import {Factory} from 'lucide-react'
import {useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import {ContextualGuidance} from '../components/ContextualGuidance'
import {HistoricalContinuity} from '../components/HistoricalContinuity'
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
  const guidanceState=loading?'Revisando órdenes, lotes y disponibilidad':priority?`${priority.receptionNumber!=null?`REC-${priority.receptionNumber}`:'Plan actual'} · ${actionLabel(priority.action)}`:hasLots?'Sin producción pendiente':'Sin lotes nuevos todavía'
  const guidanceAction=loading?'Espera la prioridad calculada':priority?actionLabel(priority.action):hasLots?'Mantén la operación al día':'Registra primero una recepción'
  const guidanceReason=priority
    ?blocked?'Existe una condición que impide continuar de forma segura. Revisa la evidencia del lote antes de producir o asignar kilos.':'La recomendación cruza demanda registrada, disponibilidad y lote. Abrir el lote mantiene la decisión ligada a su evidencia.'
    :hasLots?'No hay una orden que requiera transformar producto ahora; no se fuerza trabajo cuando la evidencia no muestra una necesidad.':'La recepción inicia la identidad del lote y permite que los movimientos posteriores mantengan continuidad física.'
  const assistantPrompt=loading
    ?'Explícame qué información estás revisando para calcular la prioridad de producción y qué falta para decidir.'
    :priority
      ?`Explícame por qué la siguiente acción de producción es "${actionLabel(priority.action)}"${priority.receptionNumber!=null?` para REC-${priority.receptionNumber}`:''}. Dime qué evidencia la sostiene, qué bloqueos existen y cuál es el siguiente paso seguro.`
      :'Explícame por qué no hay producción pendiente y qué evidencia tendría que cambiar para que aparezca una acción.'
  return <>
    <PageHeader eyebrow="Operación" title="Producción" description="La producción anterior ya está cargada. Los lotes nuevos se registran desde hoy y se mantienen separados del historial."/>
    <ContextualGuidance state={guidanceState} action={guidanceAction} reason={guidanceReason} assistantLabel="Consultar producción" assistantPrompt={assistantPrompt} receptionId={priority?.receptionId} source="produccion"/>
    {error?<div className="system-banner error" role="alert">{error}</div>:null}
    <section className="panel" aria-label="Siguiente acción de producción">
      <div className="section-heading"><div><span className="overline">Siguiente acción</span><h2>{loading?'Calculando…':priority?actionLabel(priority.action):'Sin producción pendiente'}</h2></div></div>
      {loading?<p className="data-caveat">Revisando órdenes, lotes y producto disponible.</p>:priority?<>
        <div className="balance-summary compact">
          <div><small>Lote</small><b>{priority.receptionNumber!=null?`REC-${priority.receptionNumber}`:'Sin lote liberado'}</b></div>
          <div><small>Cantidad</small><b>{kg(priority.recommendedKg)}</b></div>
          <div><small>Destino</small><b>{priority.customer}</b></div>
        </div>
        <p className="data-caveat">{priority.product} · {priority.species}{priority.supplier?` · ${priority.supplier}`:''}{priority.lineName?` · ${priority.lineName}`:''}</p>
        <div className="page-actions">
          {blocked?<Link className="button primary" to="/planificacion">Resolver bloqueo</Link>:priority.receptionId?<button className="button primary" onClick={()=>openLive(priority.receptionId!)}>Abrir lote</button>:<Link className="button primary" to="/planificacion">Revisar planificación</Link>}
          {blocked&&priority.receptionId?<button className="button secondary" onClick={()=>openLive(priority.receptionId!)}>Ver registros del lote</button>:null}
        </div>
      </>:<div className="empty-state"><Factory size={28}/><h3>{hasLots?'No hay una orden que requiera producción ahora':'Sin lotes nuevos todavía'}</h3><p>{hasLots?'No hay una acción productiva pendiente.':'La producción histórica sigue disponible abajo; la primera recepción nueva continuará la operación desde hoy.'}</p>{!hasLots?<Link className="button primary" to="/recepciones">Ir a recepciones</Link>:null}</div>}
    </section>
    <HistoricalContinuity context="operation"/>
    <nav className="more-actions" aria-label="Más información de producción"><Link to="/lineas/detalle">Ver detalle de producción</Link></nav>
  </>
}

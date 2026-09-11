import {Factory} from 'lucide-react'
import {useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import {ContextualGuidance} from '../components/ContextualGuidance'
import {HistoricalContinuity} from '../components/HistoricalContinuity'
import {useLot360} from '../components/Lot360Context'
import {PageHeader} from '../components/PageHeader'
import {useLocale} from '../i18n'
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

export function ProductionFocus({lots}:{lots:Lot[]}){
  const {openLive}=useLot360()
  const {locale}=useLocale()
  const en=locale==='en'
  const text=(es:string,english:string)=>en?english:es
  const kg=(value:number)=>`${value.toLocaleString(en?'en-US':'es-CL',{maximumFractionDigits:1})} kg`
  const actionLabel=(value:PlanRow['action'])=>value==='allocate_finished'?text('Asignar producto terminado','Allocate finished product'):value==='produce'?text('Producir ahora','Produce now'):text('Resolver bloqueo','Resolve blocker')
  const [priority,setPriority]=useState<PlanRow|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')

  useEffect(()=>{
    let active=true
    void fetch('/api/planning',{cache:'no-store'})
      .then(async response=>{
        const payload=await response.json() as PlanningPayload
        if(!response.ok)throw new Error(payload.error??text('No fue posible calcular la siguiente acción','Unable to calculate the next action'))
        if(active){setPriority(payload.dailyPlan?.[0]??null);setError('')}
      })
      .catch(cause=>{if(active)setError(cause instanceof Error?cause.message:text('No fue posible calcular la siguiente acción','Unable to calculate the next action'))})
      .finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[en])

  const hasLots=lots.length>0
  const blocked=priority?.action==='blocked'
  const guidanceState=loading?text('Revisando órdenes, lotes y disponibilidad','Reviewing orders, lots and availability'):priority?`${priority.receptionNumber!=null?`REC-${priority.receptionNumber}`:text('Plan actual','Current plan')} · ${actionLabel(priority.action)}`:hasLots?text('Sin producción pendiente','No production pending'):text('Sin lotes nuevos todavía','No new lots yet')
  const guidanceAction=loading?text('Espera la prioridad calculada','Wait for the calculated priority'):priority?actionLabel(priority.action):hasLots?text('Mantén la operación al día','Keep operations up to date'):text('Registra primero una recepción','Register a reception first')
  const guidanceReason=priority
    ?blocked?text('Existe una condición que impide continuar de forma segura. Revisa la evidencia del lote antes de producir o asignar kilos.','A condition is preventing safe continuation. Review the lot evidence before producing or allocating kilograms.'):text('La recomendación cruza demanda registrada, disponibilidad y lote. Abrir el lote mantiene la decisión ligada a su evidencia.','The recommendation combines recorded demand, availability and lot context. Opening the lot keeps the decision tied to its evidence.')
    :hasLots?text('No hay una orden que requiera transformar producto ahora; no se fuerza trabajo cuando la evidencia no muestra una necesidad.','There is no order requiring product transformation now; work is not forced when the evidence shows no need.'):text('La recepción inicia la identidad del lote y permite que los movimientos posteriores mantengan continuidad física.','Reception establishes lot identity and allows later movements to preserve physical continuity.')
  const assistantPrompt=loading
    ?text('Explícame qué información estás revisando para calcular la prioridad de producción y qué falta para decidir.','Explain what information you are reviewing to calculate production priority and what is still missing to decide.')
    :priority
      ?text(`Explícame por qué la siguiente acción de producción es "${actionLabel(priority.action)}"${priority.receptionNumber!=null?` para REC-${priority.receptionNumber}`:''}. Dime qué evidencia la sostiene, qué bloqueos existen y cuál es el siguiente paso seguro.`,`Explain why the next production action is "${actionLabel(priority.action)}"${priority.receptionNumber!=null?` for REC-${priority.receptionNumber}`:''}. Tell me what evidence supports it, what blockers exist and what the next safe step is.`)
      :text('Explícame por qué no hay producción pendiente y qué evidencia tendría que cambiar para que aparezca una acción.','Explain why there is no production pending and what evidence would need to change for an action to appear.')
  return <>
    <PageHeader eyebrow={text('Operación','Operations')} title={text('Producción','Production')} description={text('La operación actual se registra desde hoy. Los períodos anteriores quedan disponibles como reportes de consulta.','Current operations are recorded from today onward. Previous periods remain available as reference reports.')}/>
    <ContextualGuidance state={guidanceState} action={guidanceAction} reason={guidanceReason} assistantLabel={text('Consultar producción','Ask about production')} assistantPrompt={assistantPrompt} receptionId={priority?.receptionId} source="produccion"/>
    {error?<div className="system-banner error" role="alert">{error}</div>:null}
    <section className="panel" aria-label={text('Siguiente acción de producción','Next production action')}>
      <div className="section-heading"><div><span className="overline">{text('Siguiente acción','Next action')}</span><h2>{loading?text('Calculando…','Calculating…'):priority?actionLabel(priority.action):text('Sin producción pendiente','No production pending')}</h2></div></div>
      {loading?<p className="data-caveat">{text('Revisando órdenes, lotes y producto disponible.','Reviewing orders, lots and available product.')}</p>:priority?<>
        <div className="balance-summary compact">
          <div><small>{text('Lote','Lot')}</small><b>{priority.receptionNumber!=null?`REC-${priority.receptionNumber}`:text('Sin lote liberado','No released lot')}</b></div>
          <div><small>{text('Cantidad','Quantity')}</small><b>{kg(priority.recommendedKg)}</b></div>
          <div><small>{text('Destino','Destination')}</small><b>{priority.customer}</b></div>
        </div>
        <p className="data-caveat">{priority.product} · {priority.species}{priority.supplier?` · ${priority.supplier}`:''}{priority.lineName?` · ${priority.lineName}`:''}</p>
        <div className="page-actions">
          {blocked?<Link className="button primary" to="/planificacion">{text('Resolver bloqueo','Resolve blocker')}</Link>:priority.receptionId?<button className="button primary" onClick={()=>openLive(priority.receptionId!)}>{text('Abrir lote','Open lot')}</button>:<Link className="button primary" to="/planificacion">{text('Revisar planificación','Review planning')}</Link>}
          {blocked&&priority.receptionId?<button className="button secondary" onClick={()=>openLive(priority.receptionId!)}>{text('Ver registros del lote','View lot records')}</button>:null}
        </div>
      </>:<div className="empty-state"><Factory size={28}/><h3>{hasLots?text('No hay una orden que requiera producción ahora','No order requires production now'):text('Sin lotes nuevos todavía','No new lots yet')}</h3><p>{hasLots?text('No hay una acción productiva pendiente.','There is no pending production action.'):text('Los reportes de producción por período siguen disponibles abajo; la primera recepción nueva continuará la operación desde hoy.','Production reports by period remain available below; the first new reception will continue operations from today.')}</p>{!hasLots?<Link className="button primary" to="/recepciones">{text('Ir a recepciones','Go to receptions')}</Link>:null}</div>}
    </section>
    <HistoricalContinuity context="operation"/>
    <nav className="more-actions" aria-label={text('Más información de producción','More production information')}><Link to="/lineas/detalle">{text('Ver detalle de producción','View production details')}</Link></nav>
  </>
}

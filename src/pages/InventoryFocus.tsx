import {AlertTriangle,ArrowRight,CheckCircle2,MapPin,PackageCheck} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'
import {Link,useSearchParams} from 'react-router-dom'
import {ContextualGuidance} from '../components/ContextualGuidance'
import {HistoricalContinuity} from '../components/HistoricalContinuity'
import {PageHeader} from '../components/PageHeader'
import {useLocale} from '../i18n'

type Lot={reception_id:string;reception_number:number|string;plant_id:string|null;species:string;supplier:string;availablePhysicalKg:number;planningAvailableKg:number;releaseStatus:'released'|'blocked';releaseBlockReasons:string[];unlocatedKg:number}
type Payload={lots?:Lot[];error?:string}

export function InventoryFocus(){
  const {locale}=useLocale()
  const en=locale==='en'
  const text=(es:string,english:string)=>en?english:es
  const kg=(value:number)=>`${value.toLocaleString(en?'en-US':'es-CL',{maximumFractionDigits:1})} kg`
  const [params]=useSearchParams()
  const plantId=params.get('plantId')??''
  const receptionId=params.get('receptionId')??''
  const [data,setData]=useState<Payload|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  useEffect(()=>{let active=true;void fetch('/api/inventory',{cache:'no-store'}).then(async response=>{const payload=await response.json() as Payload;if(!response.ok)throw new Error(payload.error??text('No fue posible cargar inventario','Unable to load inventory'));if(active)setData(payload)}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:text('No fue posible cargar inventario','Unable to load inventory'))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[en])
  const lots=useMemo(()=>{const scoped=plantId?(data?.lots??[]).filter(lot=>lot.plant_id===plantId):(data?.lots??[]);return receptionId?scoped.filter(lot=>lot.reception_id===receptionId):scoped},[data,plantId,receptionId])
  const totals=useMemo(()=>lots.reduce((acc,lot)=>({physical:acc.physical+lot.availablePhysicalKg,planning:acc.planning+lot.planningAvailableKg,unlocated:acc.unlocated+lot.unlocatedKg,blocked:acc.blocked+(lot.releaseStatus==='blocked'?1:0)}),{physical:0,planning:0,unlocated:0,blocked:0}),[lots])
  const firstBlocked=lots.find(lot=>lot.releaseStatus==='blocked')
  const detailParams=new URLSearchParams();if(plantId)detailParams.set('plantId',plantId);if(receptionId)detailParams.set('receptionId',receptionId)
  const detailPath=detailParams.size?`/inventario/detalle?${detailParams.toString()}`:'/inventario/detalle'
  const orderParams=new URLSearchParams();if(plantId)orderParams.set('plantId',plantId);if(receptionId)orderParams.set('receptionId',receptionId)
  const ordersPath=orderParams.size?`/ordenes-venta?${orderParams.toString()}`:'/ordenes-venta'
  const primary=totals.unlocated>0
    ?{tone:'warning',icon:<MapPin size={20}/>,eyebrow:text('REQUIERE ACCIÓN','ACTION REQUIRED'),title:text(`Ubicar ${kg(totals.unlocated)}`,`Locate ${kg(totals.unlocated)}`),text:text('Hay producto sin ubicación registrada.','There is product without a recorded location.'),label:text('Ubicar producto','Locate product'),to:detailPath}
    :firstBlocked
      ?{tone:'warning',icon:<AlertTriangle size={20}/>,eyebrow:text('REQUIERE ACCIÓN','ACTION REQUIRED'),title:text(`${totals.blocked} lote${totals.blocked===1?'':'s'} retenido${totals.blocked===1?'':'s'}`,`${totals.blocked} held lot${totals.blocked===1?'':'s'}`),text:firstBlocked.releaseBlockReasons.slice(0,2).join(' · ')||text('El lote todavía no está listo para despacho o venta.','The lot is not yet ready for dispatch or sale.'),label:text('Revisar lote','Review lot'),to:firstBlocked.species.toLowerCase().includes('eriz')?`/proceso-erizo?receptionId=${encodeURIComponent(firstBlocked.reception_id)}`:`/etiquetas?receptionId=${encodeURIComponent(firstBlocked.reception_id)}`}
      :totals.planning>0
        ?{tone:'success',icon:<CheckCircle2 size={20}/>,eyebrow:text('DISPONIBLE','AVAILABLE'),title:text(`${kg(totals.planning)} disponibles`,`${kg(totals.planning)} available`),text:receptionId?text('Este lote ya puede participar en una orden comercial.','This lot can now be used in a commercial order.'):text('Producto disponible para pedidos comerciales.','Product available for commercial orders.'),label:text('Abrir órdenes de venta','Open sales orders'),to:ordersPath}
        :{tone:'neutral',icon:<PackageCheck size={20}/>,eyebrow:text('SIN STOCK ACTUAL','NO CURRENT STOCK'),title:receptionId?text('Este lote aún no tiene stock disponible','This lot does not have available stock yet'):text('Sin movimientos nuevos todavía','No new movements yet'),text:receptionId?text('La Ficha 360 mantendrá este mismo lote cuando exista disponibilidad física.','The 360 record will keep this same lot when physical availability exists.'):text('Los reportes de inventario por período siguen disponibles para consulta. El stock actual comienza con los movimientos nuevos.','Inventory reports by period remain available for reference. Current stock starts with new movements.'),label:text('Ir a Operación','Go to Operations'),to:'/recepciones'}
  const guidanceAction=totals.unlocated>0?text('Registrar ubicación','Record location'):firstBlocked?text('Resolver la retención antes de prometer o despachar','Resolve the hold before promising or dispatching'):totals.planning>0?text('Usar sólo los kilos disponibles para planificación','Use only kilograms available for planning'):text('No asumir stock live desde reportes previos','Do not infer live stock from previous reports')
  const guidanceReason=totals.unlocated>0?text('Sin ubicación no existe continuidad física suficiente para saber dónde está el producto.','Without a location there is not enough physical continuity to know where the product is.'):firstBlocked?text('Un lote retenido no debe convertirse en disponibilidad comercial hasta resolver sus razones de bloqueo.','A held lot must not become commercial availability until its blockers are resolved.'):totals.planning>0?text('Los kilos mostrados ya descuentan restricciones conocidas; los períodos anteriores permanecen sólo como referencia.','The kilograms shown already discount known restrictions; previous periods remain reference only.'):text('Ausencia de movimientos actuales no significa ausencia de registros en períodos anteriores: son dos estados distintos y se mantienen separados.','No current movements does not mean no records in previous periods: these are distinct states and remain separate.')
  const assistantPrompt=totals.unlocated>0
    ?text(`Explícame por qué hay ${kg(totals.unlocated)} sin ubicación registrada, qué evidencia falta y cuál es el siguiente paso seguro.`,`Explain why ${kg(totals.unlocated)} has no recorded location, what evidence is missing and what the next safe step is.`)
    :firstBlocked
      ?text(`Explícame por qué el lote REC-${firstBlocked.reception_number} está retenido, qué evidencia sostiene el bloqueo y qué falta para liberarlo.`,`Explain why lot REC-${firstBlocked.reception_number} is held, what evidence supports the hold and what is missing before release.`)
      :totals.planning>0
        ?text('Explícame cuánto inventario está realmente disponible para planificación, qué restricciones ya fueron descontadas y qué riesgo existe antes de comprometerlo.','Explain how much inventory is actually available for planning, what restrictions have already been deducted and what risk remains before committing it.')
        :text('Explícame por qué no hay stock live disponible y separa claramente esa conclusión de los reportes de inventario de períodos anteriores.','Explain why there is no live stock available and clearly separate that conclusion from inventory reports for previous periods.')
  const assistantReceptionId=receptionId||firstBlocked?.reception_id||null
  return <>
    <PageHeader eyebrow={text('Operación de planta','Plant operations')} title={text('Inventario','Inventory')} description={receptionId?text('Disponibilidad y próxima acción del lote activo, sin mezclarlo con otros lotes de la planta.','Availability and next action for the active lot, without mixing it with other plant lots.'):text('Producto disponible hoy y reportes de inventario por período, claramente separados.','Product available today and inventory reports by period, clearly separated.')}/>
    {!loading&&!error?<ContextualGuidance state={primary.title} action={guidanceAction} reason={guidanceReason} assistantLabel={text('Consultar inventario','Ask about inventory')} assistantPrompt={assistantPrompt} plantId={plantId||null} receptionId={assistantReceptionId} source="inventario"/>:null}
    {error?<div className="system-banner error" role="alert">{error}</div>:null}
    {loading?<div className="system-banner">{text('Calculando disponibilidad…','Calculating availability…')}</div>:null}
    {!loading&&!error?<>
      <section className={`panel decision-focus ${primary.tone}`} aria-label={text('Prioridad de inventario','Inventory priority')}>
        <div className="decision-focus-icon">{primary.icon}</div>
        <div className="decision-focus-copy"><span className="overline">{primary.eyebrow}</span><h2>{primary.title}</h2><p>{primary.text}</p></div>
        <Link className="button primary" to={primary.to}>{primary.label}<ArrowRight size={16}/></Link>
      </section>
      <section className="summary-strip" aria-label={text('Resumen de inventario actual','Current inventory summary')}>
        <div><small>{text('Disponible','Available')}</small><b>{kg(totals.planning)}</b></div>
        <div><small>{text('Lotes retenidos','Held lots')}</small><b>{totals.blocked}</b></div>
        <div><small>{text('Por ubicar','Unlocated')}</small><b>{kg(totals.unlocated)}</b></div>
      </section>
      <HistoricalContinuity context="inventory"/>
      <nav className="minimal-actions" aria-label={text('Más información de inventario','More inventory information')}>
        <Link className="source-link" to={detailPath}>{text('Ver inventario completo','View full inventory')}</Link>
        <Link className="source-link" to="/pescamar-ia">{text('Consultar análisis','Open analysis')}</Link>
      </nav>
    </>:null}
  </>
}

import {AlertTriangle,ArrowRight,CheckCircle2,MapPin,PackageCheck} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'
import {Link,useSearchParams} from 'react-router-dom'
import {ContextualGuidance} from '../components/ContextualGuidance'
import {HistoricalContinuity} from '../components/HistoricalContinuity'
import {PageHeader} from '../components/PageHeader'

type Lot={reception_id:string;reception_number:number|string;plant_id:string|null;species:string;supplier:string;availablePhysicalKg:number;planningAvailableKg:number;releaseStatus:'released'|'blocked';releaseBlockReasons:string[];unlocatedKg:number}
type Payload={lots?:Lot[];error?:string}
const kg=(value:number)=>`${value.toLocaleString('es-CL',{maximumFractionDigits:1})} kg`

export function InventoryFocus(){
  const [params]=useSearchParams()
  const plantId=params.get('plantId')??''
  const receptionId=params.get('receptionId')??''
  const [data,setData]=useState<Payload|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  useEffect(()=>{let active=true;void fetch('/api/inventory',{cache:'no-store'}).then(async response=>{const payload=await response.json() as Payload;if(!response.ok)throw new Error(payload.error??'No fue posible cargar inventario');if(active)setData(payload)}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'No fue posible cargar inventario')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[])
  const lots=useMemo(()=>{const scoped=plantId?(data?.lots??[]).filter(lot=>lot.plant_id===plantId):(data?.lots??[]);return receptionId?scoped.filter(lot=>lot.reception_id===receptionId):scoped},[data,plantId,receptionId])
  const totals=useMemo(()=>lots.reduce((acc,lot)=>({physical:acc.physical+lot.availablePhysicalKg,planning:acc.planning+lot.planningAvailableKg,unlocated:acc.unlocated+lot.unlocatedKg,blocked:acc.blocked+(lot.releaseStatus==='blocked'?1:0)}),{physical:0,planning:0,unlocated:0,blocked:0}),[lots])
  const firstBlocked=lots.find(lot=>lot.releaseStatus==='blocked')
  const detailParams=new URLSearchParams();if(plantId)detailParams.set('plantId',plantId);if(receptionId)detailParams.set('receptionId',receptionId)
  const detailPath=detailParams.size?`/inventario/detalle?${detailParams.toString()}`:'/inventario/detalle'
  const orderParams=new URLSearchParams();if(plantId)orderParams.set('plantId',plantId);if(receptionId)orderParams.set('receptionId',receptionId)
  const ordersPath=orderParams.size?`/ordenes-venta?${orderParams.toString()}`:'/ordenes-venta'
  const primary=totals.unlocated>0
    ?{tone:'warning',icon:<MapPin size={20}/>,eyebrow:'REQUIERE ACCIÓN',title:`Ubicar ${kg(totals.unlocated)}`,text:'Hay producto sin ubicación registrada.',label:'Ubicar producto',to:detailPath,why:'La disponibilidad comercial debe permanecer ligada a una ubicación física registrada; producto sin ubicar requiere confirmación antes de seguir.'}
    :firstBlocked
      ?{tone:'warning',icon:<AlertTriangle size={20}/>,eyebrow:'REQUIERE ACCIÓN',title:`${totals.blocked} lote${totals.blocked===1?'':'s'} retenido${totals.blocked===1?'':'s'}`,text:firstBlocked.releaseBlockReasons.slice(0,2).join(' · ')||'El lote todavía no está listo para despacho o venta.',label:'Revisar lote',to:firstBlocked.species.toLowerCase().includes('eriz')?`/proceso-erizo?receptionId=${encodeURIComponent(firstBlocked.reception_id)}`:`/etiquetas?receptionId=${encodeURIComponent(firstBlocked.reception_id)}`,why:'Un lote retenido no debe presentarse como libre para decisión comercial hasta revisar la evidencia que origina el bloqueo.'}
      :totals.planning>0
        ?{tone:'success',icon:<CheckCircle2 size={20}/>,eyebrow:'DISPONIBLE',title:`${kg(totals.planning)} disponibles`,text:receptionId?'Este lote ya puede participar en una orden comercial.':'Producto disponible para pedidos comerciales.',label:'Abrir órdenes de venta',to:ordersPath,why:'Esta disponibilidad proviene del inventario actual elegible para planificación; el histórico permanece sólo como referencia.'}
        :{tone:'neutral',icon:<PackageCheck size={20}/>,eyebrow:'SIN STOCK ACTUAL',title:receptionId?'Este lote aún no tiene stock disponible':'Sin movimientos nuevos todavía',text:receptionId?'La Ficha 360 mantendrá este mismo lote cuando exista disponibilidad física.':'El stock histórico sigue disponible para consulta. El stock actual comienza con los movimientos nuevos.',label:'Ir a Operación',to:'/recepciones',why:'No se convierte ausencia de stock live en una conclusión sobre el historial. La operación actual empieza sólo con movimientos registrados.'}
  return <>
    <PageHeader eyebrow="Operación de planta" title="Inventario" description={receptionId?'Disponibilidad y próxima acción del lote activo, sin mezclarlo con otros lotes de la planta.':'Producto disponible hoy y stock histórico, claramente separados.'}/>
    <ContextualGuidance state={loading?'Calculando disponibilidad actual':primary.title} action={loading?'Espera el cálculo antes de decidir':primary.label} reason={loading?'Pescamar separa evidencia actual de referencias históricas antes de mostrar disponibilidad.':primary.why} assistantLabel="Consultar inventario"/>
    {error?<div className="system-banner error" role="alert">{error}</div>:null}
    {loading?<div className="system-banner">Calculando disponibilidad…</div>:null}
    {!loading&&!error?<>
      <section className={`panel decision-focus ${primary.tone}`} aria-label="Prioridad de inventario">
        <div className="decision-focus-icon">{primary.icon}</div>
        <div className="decision-focus-copy"><span className="overline">{primary.eyebrow}</span><h2>{primary.title}</h2><p>{primary.text}</p></div>
        <Link className="button primary" to={primary.to}>{primary.label}<ArrowRight size={16}/></Link>
      </section>
      <section className="summary-strip" aria-label="Resumen de inventario actual">
        <div><small>Disponible</small><b>{kg(totals.planning)}</b></div>
        <div><small>Lotes retenidos</small><b>{totals.blocked}</b></div>
        <div><small>Por ubicar</small><b>{kg(totals.unlocated)}</b></div>
      </section>
      <HistoricalContinuity context="inventory"/>
      <nav className="minimal-actions" aria-label="Más información de inventario">
        <Link className="source-link" to={detailPath}>Ver inventario completo</Link>
        <Link className="source-link" to="/pescamar-ia">Consultar análisis</Link>
      </nav>
    </>:null}
  </>
}
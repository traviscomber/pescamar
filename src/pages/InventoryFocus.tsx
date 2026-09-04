import {AlertTriangle,ArrowRight,CheckCircle2,MapPin,PackageCheck} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'
import {Link,useSearchParams} from 'react-router-dom'
import {PageHeader} from '../components/PageHeader'

type Lot={reception_id:string;reception_number:number|string;plant_id:string|null;species:string;supplier:string;availablePhysicalKg:number;planningAvailableKg:number;releaseStatus:'released'|'blocked';releaseBlockReasons:string[];unlocatedKg:number}
type Payload={lots?:Lot[];error?:string}
const kg=(value:number)=>`${value.toLocaleString('es-CL',{maximumFractionDigits:1})} kg`

export function InventoryFocus(){
  const [params]=useSearchParams()
  const plantId=params.get('plantId')??''
  const [data,setData]=useState<Payload|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  useEffect(()=>{let active=true;void fetch('/api/inventory',{cache:'no-store'}).then(async response=>{const payload=await response.json() as Payload;if(!response.ok)throw new Error(payload.error??'No fue posible cargar inventario');if(active)setData(payload)}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'No fue posible cargar inventario')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[])
  const lots=useMemo(()=>plantId?(data?.lots??[]).filter(lot=>lot.plant_id===plantId):(data?.lots??[]),[data,plantId])
  const totals=useMemo(()=>lots.reduce((acc,lot)=>({physical:acc.physical+lot.availablePhysicalKg,planning:acc.planning+lot.planningAvailableKg,unlocated:acc.unlocated+lot.unlocatedKg,blocked:acc.blocked+(lot.releaseStatus==='blocked'?1:0)}),{physical:0,planning:0,unlocated:0,blocked:0}),[lots])
  const firstBlocked=lots.find(lot=>lot.releaseStatus==='blocked')
  const detailPath=plantId?`/inventario/detalle?plantId=${encodeURIComponent(plantId)}`:'/inventario/detalle'
  const primary=totals.unlocated>0
    ?{tone:'warning',icon:<MapPin size={20}/>,eyebrow:'REQUIERE ACCIÓN',title:`Ubicar ${kg(totals.unlocated)}`,text:'Hay inventario físico sin posición registrada.',label:'Ubicar inventario',to:detailPath}
    :firstBlocked
      ?{tone:'warning',icon:<AlertTriangle size={20}/>,eyebrow:'REQUIERE ACCIÓN',title:`${totals.blocked} lote${totals.blocked===1?'':'s'} bloqueado${totals.blocked===1?'':'s'}`,text:firstBlocked.releaseBlockReasons.slice(0,2).join(' · ')||'La liberación todavía no está completa.',label:'Resolver bloqueo',to:firstBlocked.species.toLowerCase().includes('eriz')?`/proceso-erizo?receptionId=${encodeURIComponent(firstBlocked.reception_id)}`:`/etiquetas?receptionId=${encodeURIComponent(firstBlocked.reception_id)}`}
      :totals.planning>0
        ?{tone:'success',icon:<CheckCircle2 size={20}/>,eyebrow:'DISPONIBLE',title:`${kg(totals.planning)} planificables`,text:'El inventario liberado está disponible para compromisos comerciales.',label:'Abrir Comercial',to:'/ordenes-venta'}
        :{tone:'neutral',icon:<PackageCheck size={20}/>,eyebrow:'SIN INVENTARIO VIVO',title:'Nada disponible todavía',text:'El inventario operativo comenzará con la primera recepción.',label:'Ir a Operación',to:'/recepciones'}
  return <>
    <PageHeader eyebrow="Inventario" title="Inventario" description="Disponibilidad, bloqueo y siguiente acción. El detalle físico y la evidencia quedan disponibles cuando los necesitas."/>
    {error?<div className="system-banner error" role="alert">{error}</div>:null}
    {loading?<div className="system-banner">Calculando disponibilidad…</div>:null}
    {!loading&&!error?<>
      <section className={`panel decision-focus ${primary.tone}`} aria-label="Prioridad de inventario">
        <div className="decision-focus-icon">{primary.icon}</div>
        <div className="decision-focus-copy"><span className="overline">{primary.eyebrow}</span><h2>{primary.title}</h2><p>{primary.text}</p></div>
        <Link className="button primary" to={primary.to}>{primary.label}<ArrowRight size={16}/></Link>
      </section>
      <section className="summary-strip" aria-label="Resumen mínimo de inventario">
        <div><small>Planificable</small><b>{kg(totals.planning)}</b></div>
        <div><small>Bloqueados</small><b>{totals.blocked}</b></div>
        <div><small>Por ubicar</small><b>{kg(totals.unlocated)}</b></div>
      </section>
      <nav className="minimal-actions" aria-label="Más información de inventario">
        <Link className="source-link" to={detailPath}>Ver inventario completo</Link>
        <Link className="source-link" to="/pescamar-ia">Preguntar a Inteligencia</Link>
      </nav>
    </>:null}
  </>
}

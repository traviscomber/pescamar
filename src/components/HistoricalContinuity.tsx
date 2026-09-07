import {ArrowRight,Boxes,Database,Landmark,Scale,Truck} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'
import {Link} from 'react-router-dom'

type Source={fileName:string;recordCount:number;periodStart:string|null;periodEnd:string|null}
type Payload={
 sources?:{count:number;files:Source[]}
 production?:{rows:number;receivedKg:number;firstDate:string|null;lastDate:string|null}
 suppliers?:Array<{supplier:string;rows:number;receivedKg:number}>
 packingSummary?:{boxes:number;kg:number;lots:number}
 stock?:Array<{productFamily:string;observedNetKg:number;rows:number}>
 finance?:null|{ledger:{rows:number;inflowClp:number;outflowClp:number;balanceClp:number}}
 error?:string
}
type Context='operation'|'inventory'|'commercial'
const nf=new Intl.NumberFormat('es-CL',{maximumFractionDigits:1})
const kg=(value:number)=>`${nf.format(value)} kg`
const clp=(value:number)=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(value)

export function HistoricalContinuity({context}:{context:Context}){
 const [data,setData]=useState<Payload|null>(null)
 const [error,setError]=useState('')
 useEffect(()=>{let active=true;void fetch('/api/pescamar-intelligence',{cache:'no-store'}).then(async response=>{const payload=await response.json() as Payload;if(!response.ok)throw new Error(payload.error??'No fue posible cargar la base canónica');if(active)setData(payload)}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'No fue posible cargar la base canónica')});return()=>{active=false}},[])
 const stockKg=useMemo(()=>(data?.stock??[]).reduce((sum,row)=>sum+Number(row.observedNetKg||0),0),[data?.stock])
 if(error)return null
 if(!data)return null
 const production=data.production
 const packing=data.packingSummary
 const finance=data.finance
 const title=context==='operation'?'La operación no parte de cero':context==='inventory'?'El inventario live continúa una historia existente':'La capa comercial continúa sobre la evidencia histórica'
 const copy=context==='operation'
  ?'La producción histórica y sus lotes permanecen como evidencia canónica. Desde la primera recepción nueva, el OS continúa la cadena con eventos live sin reescribir el pasado.'
  :context==='inventory'
   ?'Stock y packing históricos siguen disponibles como referencia auditable. El inventario live comienza sólo con movimientos nuevos confirmados, manteniendo ambas capas separadas.'
   :'La historia productiva, packing y evidencia financiera ya están dentro del OS. Ventas y despachos nuevos se agregan como eventos live y pueden compararse con esa base canónica.'
 return <section className="panel" aria-label="Continuidad histórica y live">
  <div className="section-heading"><div><span className="overline">Histórico canónico → operación live</span><h2>{title}</h2><p className="source-note">{copy}</p></div><span>{data.sources?.count??0} fuentes</span></div>
  <div className="signal-grid">
   <article className="signal-card"><span><Scale size={16}/>Producción histórica</span><b>{production?kg(production.receivedKg):'—'}</b><small>{production?.rows??0} registros canónicos</small></article>
   <article className="signal-card"><span><Boxes size={16}/>Packing histórico</span><b>{packing?kg(packing.kg):'—'}</b><small>{packing?.boxes??0} cajas · {packing?.lots??0} lotes/referencias</small></article>
   <article className="signal-card"><span><Truck size={16}/>Stock histórico</span><b>{kg(stockKg)}</b><small>{(data.stock??[]).reduce((sum,row)=>sum+row.rows,0)} registros canónicos</small></article>
   <article className="signal-card"><span><Landmark size={16}/>Finanzas históricas</span><b>{finance?clp(finance.ledger.balanceClp):'—'}</b><small>{finance?`${finance.ledger.rows} movimientos reconstruidos`:'Visible según permisos'}</small></article>
  </div>
  <div className="notice"><Database size={16}/><div><b>Continuidad, no migración ciega</b><small>El histórico se consulta, compara y usa para inteligencia. Los nuevos hechos operacionales se registran como live; nunca convertimos automáticamente evidencia histórica en inventario o estado actual.</small></div></div>
  <div className="page-actions"><Link className="source-link" to="/inicio/detalle">Abrir inteligencia canónica <ArrowRight size={14}/></Link><Link className="source-link" to="/importaciones">Ver fuentes y trazabilidad</Link></div>
 </section>
}

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
 useEffect(()=>{let active=true;void fetch('/api/pescamar-intelligence',{cache:'no-store'}).then(async response=>{const payload=await response.json() as Payload;if(!response.ok)throw new Error(payload.error??'No fue posible cargar el historial');if(active)setData(payload)}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'No fue posible cargar el historial')});return()=>{active=false}},[])
 const stockKg=useMemo(()=>(data?.stock??[]).reduce((sum,row)=>sum+Number(row.observedNetKg||0),0),[data?.stock])
 if(error)return null
 if(!data)return null
 const production=data.production
 const packing=data.packingSummary
 const finance=data.finance
 const title=context==='operation'?'La operación continúa desde la historia de Pescamar':context==='inventory'?'El stock actual se compara con el historial':'Ventas nuevas sobre la historia de Pescamar'
 const copy=context==='operation'
  ?'La producción anterior y sus lotes siguen disponibles para consulta. Cada recepción nueva continúa la operación desde hoy, sin alterar los registros históricos.'
  :context==='inventory'
   ?'El stock y el packing históricos siguen disponibles para consulta. El stock actual comienza con movimientos nuevos confirmados y se mantiene separado del historial.'
   :'La producción, el packing y los movimientos financieros anteriores ya están disponibles. Las ventas y despachos nuevos se agregan desde hoy y pueden compararse con esa historia.'
 return <section className="panel" aria-label="Historial y operación actual">
  <div className="section-heading"><div><span className="overline">Historial → operación actual</span><h2>{title}</h2><p className="source-note">{copy}</p></div><span>{data.sources?.count??0} archivos</span></div>
  <div className="signal-grid">
   <article className="signal-card"><span><Scale size={16}/>Producción histórica</span><b>{production?kg(production.receivedKg):'—'}</b><small>{production?.rows??0} registros de producción</small></article>
   <article className="signal-card"><span><Boxes size={16}/>Packing histórico</span><b>{packing?kg(packing.kg):'—'}</b><small>{packing?.boxes??0} cajas · {packing?.lots??0} lotes/referencias</small></article>
   <article className="signal-card"><span><Truck size={16}/>Stock histórico</span><b>{kg(stockKg)}</b><small>{(data.stock??[]).reduce((sum,row)=>sum+row.rows,0)} registros de stock</small></article>
   <article className="signal-card"><span><Landmark size={16}/>Movimientos financieros</span><b>{finance?clp(finance.ledger.balanceClp):'—'}</b><small>{finance?`${finance.ledger.rows} movimientos registrados`:'Visible según permisos'}</small></article>
  </div>
  <div className="notice"><Database size={16}/><div><b>El historial se conserva</b><small>Los datos anteriores sirven para consultar y comparar. Las recepciones, producción, stock y despachos nuevos se registran desde hoy sin cambiar la historia.</small></div></div>
  <div className="page-actions"><Link className="source-link" to="/inicio/detalle">Ver historial de Pescamar <ArrowRight size={14}/></Link><Link className="source-link" to="/importaciones">Ver archivos de origen</Link></div>
 </section>
}

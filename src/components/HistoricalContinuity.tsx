import {ArrowRight,Boxes,Landmark,Scale,Truck} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'
import {Link} from 'react-router-dom'
import {useLocale} from '../i18n'

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

export function HistoricalContinuity({context}:{context:Context}){
 const {locale}=useLocale(),en=locale==='en',text=(es:string,english:string)=>en?english:es
 const nf=new Intl.NumberFormat(en?'en-US':'es-CL',{maximumFractionDigits:1})
 const kg=(value:number)=>`${nf.format(value)} kg`
 const clp=(value:number)=>new Intl.NumberFormat(en?'en-US':'es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(value)
 const [data,setData]=useState<Payload|null>(null)
 const [error,setError]=useState('')
 useEffect(()=>{let active=true;void fetch('/api/pescamar-intelligence',{cache:'no-store'}).then(async response=>{const payload=await response.json() as Payload;if(!response.ok)throw new Error(payload.error??text('No fue posible cargar los reportes del período','Unable to load period reports'));if(active)setData(payload)}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:text('No fue posible cargar los reportes del período','Unable to load period reports'))});return()=>{active=false}},[en])
 const stockKg=useMemo(()=>(data?.stock??[]).reduce((sum,row)=>sum+Number(row.observedNetKg||0),0),[data?.stock])
 if(error)return null
 if(!data)return null
 const production=data.production
 const packing=data.packingSummary
 const finance=data.finance
 const copy=context==='inventory'
  ?text('Los reportes de inventario de períodos anteriores están cargados. El stock actual se registra desde hoy.','Inventory reports from previous periods are loaded. Current stock is recorded from today onward.')
  :context==='commercial'
   ?text('Los reportes comerciales de períodos anteriores están cargados. Las ventas y despachos nuevos se agregan desde hoy.','Commercial reports from previous periods are loaded. New sales and dispatches are added from today onward.')
   :text('Los reportes de producción de períodos anteriores están cargados. La operación nueva continúa desde hoy.','Production reports from previous periods are loaded. New operations continue from today onward.')
 return <section className="panel" aria-label={text('Reportes por período','Period reports')}>
  <div className="section-heading"><div><span className="overline">{text('Reportes','Reports')}</span><h2>{text('Reportes por período','Period reports')}</h2><p className="source-note">{copy}</p></div><span>{data.sources?.count??0} {text('archivos','files')}</span></div>
  <div className="signal-grid">
   <article className="signal-card"><span><Scale size={16}/>{text('Producción','Production')}</span><b>{production?kg(production.receivedKg):'—'}</b><small>{production?.rows??0} {text('registros','records')}</small></article>
   <article className="signal-card"><span><Boxes size={16}/>Packing</span><b>{packing?kg(packing.kg):'—'}</b><small>{packing?.boxes??0} {text('cajas','boxes')} · {packing?.lots??0} {text('lotes/referencias','lots/references')}</small></article>
   <article className="signal-card"><span><Truck size={16}/>{text('Stock','Stock')}</span><b>{kg(stockKg)}</b><small>{(data.stock??[]).reduce((sum,row)=>sum+row.rows,0)} {text('registros','records')}</small></article>
   <article className="signal-card"><span><Landmark size={16}/>{text('Finanzas','Finance')}</span><b>{finance?clp(finance.ledger.balanceClp):'—'}</b><small>{finance?`${finance.ledger.rows} ${text('movimientos','movements')}`:text('Según permisos','According to permissions')}</small></article>
  </div>
  <div className="page-actions"><Link className="source-link" to="/inicio/detalle">{text('Ver reportes','View reports')} <ArrowRight size={14}/></Link><Link className="source-link" to="/importaciones">{text('Ver archivos','View files')}</Link></div>
 </section>
}

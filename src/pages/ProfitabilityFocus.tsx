import {ArrowRight,Landmark,TrendingUp} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'
import {Link} from 'react-router-dom'
import {PageHeader} from '../components/PageHeader'

type LiveRow={supplier?:string;customer?:string;plant_id?:string;revenue_clp?:number;purchase_cost_clp?:number|null;transformation_cost_clp?:number|null;contribution_clp?:number|null;contribution_pct?:number|null;economic_complete?:boolean}
type HistRow={supplier?:string;customer?:string;plant_id?:string;received_kg?:number;source_kg?:number;lots?:number;flagged_rows?:number}
type Payload={live?:{suppliers?:LiveRow[];plants?:LiveRow[];customers?:LiveRow[]};historical?:{suppliers?:HistRow[];plants?:HistRow[];customers?:HistRow[]};coverage?:{historical_rows?:number;historical_flagged?:number;account_rows?:number};documents?:{export_invoices?:number;purchase_orders?:number};boundary?:{profitabilityRule?:string;liveContributionRequires?:string};error?:string}
const clp=(v:number)=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(v)
const kg=(v:number)=>`${v.toLocaleString('es-CL',{maximumFractionDigits:1})} kg`

export function ProfitabilityFocus(){
 const [data,setData]=useState<Payload|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
 useEffect(()=>{let active=true;void fetch('/api/profitability',{cache:'no-store'}).then(async r=>{const p=await r.json() as Payload;if(!r.ok)throw new Error(p.error??'No fue posible calcular rentabilidad');if(active)setData(p)}).catch(e=>{if(active)setError(e instanceof Error?e.message:'No fue posible calcular rentabilidad')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[])
 const live=useMemo(()=>data?.live?.suppliers??[],[data?.live?.suppliers])
 const history=data?.historical?.suppliers??[]
 const revenue=useMemo(()=>live.reduce((sum,row)=>sum+Number(row.revenue_clp??0),0),[live])
 const completeLive=useMemo(()=>live.filter(row=>row.economic_complete&&row.contribution_clp!=null),[live])
 const contribution=useMemo(()=>completeLive.reduce((sum,row)=>sum+Number(row.contribution_clp),0),[completeLive])
 const hasRevenue=live.some(row=>Number(row.revenue_clp??0)>0),hasContribution=completeLive.length>0
 const topLive=useMemo(()=>[...completeLive].sort((a,b)=>Number(b.contribution_clp)-Number(a.contribution_clp))[0],[completeLive])
 const topHistory=history[0]
 const flagged=Number(data?.coverage?.historical_flagged??0)
 const statusTitle=hasContribution?'Rentabilidad disponible':hasRevenue?'Ingresos trazados; margen pendiente':'Aún falta información'
 const statusCopy=hasContribution?`La contribución conocida de lotes con cobertura económica completa es ${clp(contribution)}.`:hasRevenue?'Ya existen ventas confirmadas, pero margen sigue desconocido hasta que esos mismos lotes tengan kilos físicos, venta completa, liquidación y transformación trazadas.':'Para calcular margen faltan compra, transformación y venta conectadas por lote.'
 return <>
  <PageHeader eyebrow="Rentabilidad" title="Rentabilidad" description="Qué gana Pescamar y qué falta para saberlo."/>
  {error?<div className="system-banner error" role="alert">{error}</div>:null}
  {loading?<div className="system-banner">Calculando…</div>:null}
  {!loading&&!error?<>
   <section className="panel decision-brief">
    <div className="section-heading"><div><span className="overline">Estado</span><h2>{statusTitle}</h2></div><Landmark size={20}/></div>
    <p>{statusCopy}</p>
    {hasContribution&&topLive?<div className="decision-primary"><div><small>Principal señal</small><b>{topLive.supplier??topLive.customer??topLive.plant_id??'Operación actual'}</b><span>{clp(Number(topLive.contribution_clp))} de contribución conocida</span></div><Link className="button primary" to="/rentabilidad/detalle">Ver detalle <ArrowRight size={16}/></Link></div>:<div className="decision-primary"><div><small>Siguiente paso</small><b>Completar costos por lote</b><span>Compra + transformación + venta del mismo lote. Dato ausente no se interpreta como cero.</span></div><Link className="button primary" to="/costos-transformacion">Completar costos <ArrowRight size={16}/></Link></div>}
   </section>
   <section className="signal-grid">
    <article className="signal-card"><span><TrendingUp size={16}/>Ingresos</span><b>{hasRevenue?clp(revenue):'—'}</b><small>{hasRevenue?'Ventas confirmadas':'Pendientes'}</small></article>
    <article className="signal-card"><span><Landmark size={16}/>Contribución</span><b>{hasContribution?clp(contribution):'—'}</b><small>{hasContribution?'Cobertura completa':'Pendiente de costos completos'}</small></article>
    <article className="signal-card"><span>Historial</span><b>{Number(data?.coverage?.historical_rows??0).toLocaleString('es-CL')}</b><small>{flagged} filas por revisar</small></article>
   </section>
   {!hasContribution&&topHistory?<section className="panel"><div className="section-heading"><div><span className="overline">Historial</span><h2>{topHistory.supplier??topHistory.customer??topHistory.plant_id??'Mayor volumen observado'}</h2></div></div><p>{kg(Number(topHistory.received_kg??topHistory.source_kg??0))} en {Number(topHistory.lots??0).toLocaleString('es-CL')} lotes. Referencia de volumen, no margen.</p></section>:null}
   <div className="page-actions"><Link className="button secondary" to="/rentabilidad/detalle">Ver detalle</Link><Link className="button secondary" to="/pescamar-ia">Preguntar</Link></div>
  </>:null}
 </>
}

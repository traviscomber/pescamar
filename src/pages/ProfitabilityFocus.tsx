import {ArrowRight,Landmark,TrendingUp} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'
import {Link} from 'react-router-dom'
import {PageHeader} from '../components/PageHeader'

type LiveRow={supplier?:string;customer?:string;plant_id?:string;revenue_clp?:number;contribution_clp?:number;contribution_pct?:number}
type HistRow={supplier?:string;customer?:string;plant_id?:string;received_kg?:number;source_kg?:number;lots?:number;flagged_rows?:number}
type Payload={live?:{suppliers?:LiveRow[];plants?:LiveRow[];customers?:LiveRow[]};historical?:{suppliers?:HistRow[];plants?:HistRow[];customers?:HistRow[]};coverage?:{historical_rows?:number;historical_flagged?:number;account_rows?:number};documents?:{export_invoices?:number;purchase_orders?:number};error?:string}
const clp=(v:number)=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(v)
const kg=(v:number)=>`${v.toLocaleString('es-CL',{maximumFractionDigits:1})} kg`

export function ProfitabilityFocus(){
 const [data,setData]=useState<Payload|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
 useEffect(()=>{let active=true;void fetch('/api/profitability',{cache:'no-store'}).then(async r=>{const p=await r.json() as Payload;if(!r.ok)throw new Error(p.error??'No fue posible calcular rentabilidad');if(active)setData(p)}).catch(e=>{if(active)setError(e instanceof Error?e.message:'No fue posible calcular rentabilidad')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[])
 const live=useMemo(()=>data?.live?.suppliers??[],[data?.live?.suppliers])
 const history=data?.historical?.suppliers??[]
 const revenue=useMemo(()=>live.reduce((sum,row)=>sum+Number(row.revenue_clp??0),0),[live])
 const contribution=useMemo(()=>live.reduce((sum,row)=>sum+Number(row.contribution_clp??0),0),[live])
 const hasLive=live.some(row=>Number(row.revenue_clp??0)>0)
 const topLive=useMemo(()=>[...live].sort((a,b)=>Number(b.contribution_clp??0)-Number(a.contribution_clp??0))[0],[live])
 const topHistory=history[0]
 const flagged=Number(data?.coverage?.historical_flagged??0)
 return <>
  <PageHeader eyebrow="Rentabilidad" title="Rentabilidad" description="Qué sabemos económicamente y qué falta para decidir."/>
  {error?<div className="system-banner error" role="alert">{error}</div>:null}
  {loading?<div className="system-banner">Calculando evidencia económica…</div>:null}
  {!loading&&!error?<>
   <section className="panel decision-brief">
    <div className="section-heading"><div><span className="overline">Estado</span><h2>{hasLive?'Rentabilidad trazable disponible':'Rentabilidad viva aún incompleta'}</h2></div><Landmark size={20}/></div>
    <p>{hasLive?`La operación viva ya conecta ingresos y costos suficientes para mostrar una contribución conocida de ${clp(contribution)}.`:'La historia permite comparar volumen y diferencias, pero no debe presentarse como margen hasta conectar compra, transformación y venta por lote.'}</p>
    {hasLive&&topLive?<div className="decision-primary"><div><small>Principal señal</small><b>{topLive.supplier??topLive.customer??topLive.plant_id??'Operación viva'}</b><span>{clp(Number(topLive.contribution_clp??0))} de contribución conocida</span></div><Link className="button primary" to="/rentabilidad/detalle">Ver evidencia <ArrowRight size={16}/></Link></div>:<div className="decision-primary"><div><small>Siguiente paso</small><b>Completar trazabilidad económica</b><span>Conectar precio de venta, costo de compra y transformación por lote.</span></div><Link className="button primary" to="/costos-transformacion">Completar costos <ArrowRight size={16}/></Link></div>}
   </section>
   <section className="signal-grid">
    <article className="signal-card"><span><TrendingUp size={16}/>Ingresos trazados</span><b>{hasLive?clp(revenue):'—'}</b><small>{hasLive?'Operación viva':'No disponibles aún'}</small></article>
    <article className="signal-card"><span><Landmark size={16}/>Contribución conocida</span><b>{hasLive?clp(contribution):'—'}</b><small>{hasLive?'Sin extrapolar historia':'Pendiente de evidencia viva'}</small></article>
    <article className="signal-card"><span>Historia útil</span><b>{Number(data?.coverage?.historical_rows??0).toLocaleString('es-CL')}</b><small>{flagged} filas con observaciones</small></article>
   </section>
   {!hasLive&&topHistory?<section className="panel"><div className="section-heading"><div><span className="overline">Referencia histórica</span><h2>{topHistory.supplier??topHistory.customer??topHistory.plant_id??'Mayor volumen observado'}</h2></div></div><p>{kg(Number(topHistory.received_kg??topHistory.source_kg??0))} en {Number(topHistory.lots??0).toLocaleString('es-CL')} lotes. Úsalo como referencia operacional, no como margen.</p></section>:null}
   <div className="page-actions"><Link className="button secondary" to="/rentabilidad/detalle">Ver análisis completo</Link><Link className="button secondary" to="/pescamar-ia">Preguntar a Inteligencia</Link></div>
  </>:null}
 </>
}

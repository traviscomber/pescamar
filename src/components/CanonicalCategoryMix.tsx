import {AlertTriangle,Layers3,Scale,ShieldCheck} from 'lucide-react'
import {useCallback,useEffect,useMemo,useState} from 'react'

type Category={label:string;kg:number;sharePct:number|null}
type Supplier={supplier:string;rows:number;receivedKg:number;massReviewRows:number;eligibleRows:number;massReconciledPct:number|null;reconciledCategoryKg:number}
type Payload={ok?:boolean;method?:{version:string;rule:string};summary?:{rows:number;eligibleRows:number;excludedRows:number;missingOutputRows:number;reconciledCategoryKg:number};categories?:Category[];suppliers?:Supplier[];error?:string}
const nf=new Intl.NumberFormat('es-CL',{maximumFractionDigits:1})
const kg=(value:number)=>`${nf.format(value)} kg`
const pct=(value:number|null)=>value==null?'—':`${nf.format(value)}%`

export function CanonicalCategoryMix(){
 const [data,setData]=useState<Payload|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true)
 const load=useCallback(async(silent=false)=>{if(!silent)setLoading(true);try{const response=await fetch('/api/canonical-category-mix',{cache:'no-store'}),payload=await response.json() as Payload;if(!response.ok)throw new Error(payload.error??'No fue posible calcular el mix canónico');setData(payload);setError('')}catch(cause){setError(cause instanceof Error?cause.message:'No fue posible calcular el mix canónico')}finally{if(!silent)setLoading(false)}},[])
 useEffect(()=>{void load();const refresh=()=>void load(true),timer=window.setInterval(()=>{if(document.visibilityState==='visible')refresh()},60_000);window.addEventListener('pescamar:data-updated',refresh);return()=>{window.clearInterval(timer);window.removeEventListener('pescamar:data-updated',refresh)}},[load])
 const categories=useMemo(()=>data?.categories??[],[data?.categories]),suppliers=useMemo(()=>data?.suppliers?.slice(0,8)??[],[data?.suppliers]),summary=data?.summary
 if(loading&&!data)return <section className="panel"><div className="empty-inline"><Layers3 size={20}/><div><b>Reconciliando categorías</b><small>Separando filas físicamente comparables de las que requieren revisión.</small></div></div></section>
 if(error&&!data)return <section className="panel"><div className="notice error">{error}</div></section>
 if(!data)return null
 return <section className="panel" aria-label="Mix canónico de categorías reconciliadas" aria-live="polite">
  <div className="section-heading"><div><span className="overline">Producción canónica · composición</span><h2>Mix de categorías reconciliadas</h2><p className="source-note">Describe cómo se distribuyen los kilos reportados entre las categorías originales de la planilla, usando sólo filas físicamente reconciliables. No es rendimiento ni Supplier Score.</p></div><span>{data.method?.version??'v1'}</span></div>
  <div className="signal-grid">
   <article className="signal-card"><span><ShieldCheck size={16}/>Filas utilizables</span><b>{summary?.eligibleRows??0}</b><small>de {summary?.rows??0} registros canónicos</small></article>
   <article className="signal-card attention"><span><AlertTriangle size={16}/>Fuera por masa</span><b>{summary?.excludedRows??0}</b><small>No entran al mix ni al rendimiento</small></article>
   <article className="signal-card"><span><Scale size={16}/>Kg reconciliados</span><b>{kg(summary?.reconciledCategoryKg??0)}</b><small>Suma de categorías sólo en filas válidas</small></article>
   <article className="signal-card"><span><Layers3 size={16}/>Sin salida</span><b>{summary?.missingOutputRows??0}</b><small>Filas sin categorías productivas reportadas</small></article>
  </div>
  {categories.length?<div className="table-scroll"><table className="data-table"><thead><tr><th>Categoría original</th><th className="numeric">Kg reconciliados</th><th className="numeric">Mix</th></tr></thead><tbody>{categories.map(item=><tr key={item.label}><td><b>{item.label}</b></td><td className="numeric">{kg(item.kg)}</td><td className="numeric">{pct(item.sharePct)}</td></tr>)}</tbody></table></div>:<div className="empty-inline"><Layers3 size={20}/><div><b>Sin categorías reconciliables</b><small>La fuente no permite construir un mix válido todavía.</small></div></div>}
  <div className="section-heading"><div><span className="overline">Reconciliación por proveedor</span><h3>Qué proveedores tienen base utilizable</h3></div><span>{suppliers.length} visibles</span></div>
  {suppliers.length?<div className="table-scroll"><table className="data-table"><thead><tr><th>Proveedor</th><th className="numeric">Filas</th><th className="numeric">Recibido</th><th className="numeric">Masa reconciliada</th><th className="numeric">Fuera por masa</th><th className="numeric">Kg categorías válidas</th></tr></thead><tbody>{suppliers.map(item=><tr key={item.supplier}><td><b>{item.supplier}</b></td><td className="numeric">{item.rows}</td><td className="numeric">{kg(item.receivedKg)}</td><td className={`numeric ${(item.massReconciledPct??0)<75?'negative':''}`}>{pct(item.massReconciledPct)}</td><td className={`numeric ${item.massReviewRows?'negative':''}`}>{item.massReviewRows}</td><td className="numeric">{kg(item.reconciledCategoryKg)}</td></tr>)}</tbody></table></div>:null}
  <p className="source-note">{data.method?.rule}</p>
  {error?<div className="notice error">{error}</div>:null}
 </section>
}

import {AlertTriangle,ArrowRight,Boxes,CheckCircle2,PackagePlus} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'
import {Link} from 'react-router-dom'
import {PageHeader} from '../components/PageHeader'

type Item={id:string;sku:string|null;name:string;category:string;unit:string;minimum_stock:number|string;stock:number|string;preferred_supplier:string|null;belowMinimum:boolean}
type Payload={items?:Item[];permissions?:{canWrite:boolean};error?:string}
const qty=(value:number|string,unit:string)=>`${Number(value).toLocaleString('es-CL',{maximumFractionDigits:1})} ${unit}`

export function MaterialsFocus(){
 const [data,setData]=useState<Payload|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
 useEffect(()=>{let active=true;void fetch('/api/materials-inventory',{cache:'no-store'}).then(async response=>{const payload=await response.json() as Payload;if(!response.ok)throw new Error(payload.error??'No fue posible cargar abastecimiento');if(active){setData(payload);setError('')}}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'No fue posible cargar abastecimiento')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[])
 const items=data?.items??[]
 const critical=useMemo(()=>items.filter(item=>item.belowMinimum).sort((a,b)=>{const ar=Number(a.minimum_stock)>0?Number(a.stock)/Number(a.minimum_stock):1;const br=Number(b.minimum_stock)>0?Number(b.stock)/Number(b.minimum_stock):1;return ar-br}),[items])
 const next=critical[0]
 const healthy=items.length-critical.length
 const status=critical.length?`${critical.length} ${critical.length===1?'artículo requiere':'artículos requieren'} reposición`:items.length?'Abastecimiento en orden':'Sin artículos configurados'
 const description=next?`${next.name} está en ${qty(next.stock,next.unit)} frente a un mínimo de ${qty(next.minimum_stock,next.unit)}.`:items.length?'No hay artículos bajo su mínimo configurado.':'Crea el primer artículo para comenzar a controlar insumos y packaging.'
 return <>
  <PageHeader eyebrow="Abastecimiento" title="Materiales e insumos" description="Qué falta y qué acción tomar. El catálogo completo queda en detalle."/>
  {error?<div className="system-banner error" role="alert">{error}</div>:null}
  {loading?<div className="system-banner">Revisando mínimos de abastecimiento…</div>:null}
  {!loading&&!error?<section className="panel focus-surface" aria-label="Prioridad de abastecimiento">
    <div className="section-heading"><div><span className="overline">Estado</span><h2>{status}</h2></div>{critical.length?<AlertTriangle size={20}/>:<CheckCircle2 size={20}/>}</div>
    <p className="focus-copy">{description}</p>
    {next?<div className="focus-primary-row"><div><small>Siguiente acción</small><b>Reponer {next.name}</b><span>{next.preferred_supplier?`Proveedor preferente: ${next.preferred_supplier}`:'Proveedor preferente no definido'}</span></div><strong>{qty(next.minimum_stock,next.unit)} mínimo</strong></div>:null}
    <div className="signal-grid compact-signals" aria-label="Resumen de materiales">
      <article className="signal-card"><span><AlertTriangle size={15}/>Bajo mínimo</span><b>{critical.length}</b><small>Requieren acción</small></article>
      <article className="signal-card"><span><CheckCircle2 size={15}/>En rango</span><b>{healthy}</b><small>Sin reposición</small></article>
      <article className="signal-card"><span><Boxes size={15}/>Artículos</span><b>{items.length}</b><small>Catálogo activo</small></article>
    </div>
    <div className="focus-actions">
      {critical.length&&data?.permissions?.canWrite?<Link className="button primary" to="/inventario-materiales/detalle"><PackagePlus size={16}/>Registrar reposición</Link>:null}
      {!items.length&&data?.permissions?.canWrite?<Link className="button primary" to="/inventario-materiales/detalle">Crear artículo</Link>:null}
      <Link className="button secondary" to="/inventario-materiales/detalle">Ver detalle <ArrowRight size={15}/></Link>
    </div>
  </section>:null}
 </>
}

import {DollarSign,ReceiptText} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'
import {Link,useSearchParams} from 'react-router-dom'
import {PageHeader} from '../components/PageHeader'

type Lot={reception_id:string;reception_number:string|number;plant_id:string|null;species:string;supplier:string}
type InventoryPayload={lots?:Lot[];error?:string}
type Cost={id:string;category:string;amount_clp:string|number}
type CostPayload={costs?:Cost[];error?:string}
const clp=(v:number)=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(v)

export function TransformationCostsFocus(){
 const [params]=useSearchParams(),requested=params.get('receptionId')??''
 const [lots,setLots]=useState<Lot[]>([]),[selectedId,setSelectedId]=useState(''),[costs,setCosts]=useState<Cost[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
 useEffect(()=>{let active=true;void fetch('/api/inventory',{cache:'no-store'}).then(async r=>{const p=await r.json() as InventoryPayload;if(!r.ok)throw new Error(p.error??'No fue posible cargar lotes');if(!active)return;const next=p.lots??[];setLots(next);const selected=next.find(l=>l.reception_id===requested)?.reception_id??next[0]?.reception_id??'';setSelectedId(selected);if(!selected){setLoading(false);return}const c=await fetch(`/api/transformation-costs?receptionId=${encodeURIComponent(selected)}`,{cache:'no-store'}),cp=await c.json() as CostPayload;if(!c.ok)throw new Error(cp.error??'No fue posible cargar costos');if(active){setCosts(cp.costs??[]);setLoading(false)}}).catch(e=>{if(active){setError(e instanceof Error?e.message:'No fue posible cargar costos');setLoading(false)}});return()=>{active=false}},[requested])
 const selected=lots.find(l=>l.reception_id===selectedId)
 const total=useMemo(()=>costs.reduce((a,c)=>a+Number(c.amount_clp||0),0),[costs])
 const categories=useMemo(()=>new Set(costs.map(c=>c.category)).size,[costs])
 const complete=costs.length>0
 const title=!lots.length?'Sin lotes vivos':complete?'Costo real disponible':'Costo pendiente de completar'
 const meaning=!lots.length?'El costeo se activa con la primera recepción operacional.':complete?`${clp(total)} registrados para ${selected?`REC-${selected.reception_number}`:'el lote seleccionado'}.`:'No hay costos reales registrados para el lote seleccionado. No se imputan estimaciones.'
 const action=!lots.length?'/recepciones':complete?`/rentabilidad`:`/costos-transformacion/detalle${selectedId?`?receptionId=${encodeURIComponent(selectedId)}`:''}`
 const actionLabel=!lots.length?'Ir a Operación':complete?'Ver rentabilidad':'Registrar costo'
 return <>
  <PageHeader eyebrow="Inteligencia económica · Costos" title="Costos" description="Costo real primero. Sin estimaciones disfrazadas de evidencia."/>
  {error?<div className="system-banner error" role="alert">{error}</div>:null}
  {loading?<div className="system-banner">Leyendo costos reales…</div>:null}
  {!loading&&!error?<section className="panel decision-focus"><div className="section-heading"><div><span className="overline">Estado</span><h2>{title}</h2></div><DollarSign size={20}/></div><p>{meaning}</p><div className="signal-grid"><article className="signal-card"><span><DollarSign size={16}/>Costo registrado</span><b>{clp(total)}</b><small>Sólo evidencia real</small></article><article className="signal-card"><span><ReceiptText size={16}/>Registros</span><b>{costs.length}</b><small>{categories} categorías</small></article><article className="signal-card"><span><ReceiptText size={16}/>Cobertura</span><b>{complete?'Real':'Pendiente'}</b><small>Sin imputación automática</small></article></div><div className="page-actions"><Link className="button primary" to={action}>{actionLabel}</Link><Link className="button" to={`/costos-transformacion/detalle${selectedId?`?receptionId=${encodeURIComponent(selectedId)}`:''}`}>Ver detalle</Link></div></section>:null}
 </>
}

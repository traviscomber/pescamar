import {CircleDollarSign,ClipboardList,GitBranch,MessageCircle,MoveRight,ReceiptText} from 'lucide-react'
import {useEffect,useState} from 'react'
import {Link} from 'react-router-dom'

type Order={id:string;order_number:string|number;product:string;delivery_date:string;status:string;customer:string;allocated_kg:string|number}
type Movement={id:string;movement_type:string;moved_kg:string|number;reason:string|null;occurred_at:string;created_by:string;from_location:string|null;to_location:string|null}
type Cost={id:string;category:string;amount_clp:string|number;note:string|null;occurred_at:string;created_by:string}
type Payload={plantId?:string|null;orders?:Order[];inventoryMovements?:Movement[];costs?:Cost[];totalTransformationCostClp?:number;error?:string}
const kg=(v:string|number)=>`${Number(v).toLocaleString('es-CL',{maximumFractionDigits:1})} kg`
const clp=(v:string|number)=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(v))
const href=(path:string,receptionId:string,plantId?:string|null)=>`${path}?receptionId=${encodeURIComponent(receptionId)}${plantId?`&plantId=${encodeURIComponent(plantId)}`:''}`

export function LiveLotContinuityRail({receptionId}:{receptionId:string|null}){
  const [data,setData]=useState<Payload|null>(null),[error,setError]=useState('')
  useEffect(()=>{if(!receptionId){setData(null);return}let active=true;void fetch(`/api/lot-continuity?receptionId=${encodeURIComponent(receptionId)}`,{cache:'no-store'}).then(async r=>{const p=await r.json() as Payload;if(!r.ok)throw new Error(p.error??'No fue posible cargar continuidad');if(active){setData(p);setError('')}}).catch(e=>{if(active)setError(e instanceof Error?e.message:'No fue posible cargar continuidad')});return()=>{active=false}},[receptionId])
  if(!receptionId)return null
  const orders=data?.orders??[],moves=data?.inventoryMovements??[],costs=data?.costs??[],plantId=data?.plantId??null
  return <aside className="lot-continuity-rail" aria-label="Continuidad ampliada de la ficha 360">
    <div className="continuity-rail-head"><span>Acciones del lote</span><b>Plan · posición · costo · cierre</b></div>
    {error?<small className="continuity-rail-error">{error}</small>:null}
    <section><h4><ClipboardList size={14}/>Órdenes</h4>{orders.length?orders.slice(0,4).map(o=><p key={o.id}><b>OV-{o.order_number} · {o.customer}</b><small>{o.product} · {kg(o.allocated_kg)} · {o.delivery_date}</small></p>):<small>Sin compromisos asignados</small>}<Link className="source-link compact" to={href('/ordenes-venta',receptionId,plantId)}>Abrir órdenes</Link></section>
    <section><h4><MoveRight size={14}/>Inventario</h4>{moves.length?moves.slice(0,4).map(m=><p key={m.id}><b>{kg(m.moved_kg)} · {m.movement_type}</b><small>{m.from_location??'Ingreso'} → {m.to_location??'Salida'}</small></p>):<small>Sin movimientos físicos</small>}<Link className="source-link compact" to={href('/inventario',receptionId,plantId)}>Gestionar inventario</Link></section>
    <section><h4><CircleDollarSign size={14}/>Transformación</h4><strong>{clp(data?.totalTransformationCostClp??0)}</strong>{costs.length?costs.slice(0,4).map(c=><p key={c.id}><b>{c.category} · {clp(c.amount_clp)}</b><small>{c.note??c.created_by}</small></p>):<small>Sin costos registrados</small>}<Link className="source-link compact" to={href('/costos-transformacion',receptionId,plantId)}>Registrar costo</Link></section>
    <div className="continuity-rail-actions"><Link className="button secondary compact" to={href('/lineage',receptionId,plantId)}><GitBranch size={14}/>Lineage</Link><Link className="button secondary compact" to={href('/liquidaciones',receptionId,plantId)}><ReceiptText size={14}/>Liquidación</Link><Link className="button secondary compact" to={href('/comunicaciones',receptionId,plantId)}><MessageCircle size={14}/>Comunicaciones</Link></div>
  </aside>
}

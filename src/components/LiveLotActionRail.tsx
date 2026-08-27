import {ArrowRight,CheckCircle2,Factory,PackageCheck,ReceiptText,ShieldCheck,ShoppingCart} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'
import {Link} from 'react-router-dom'

type Reception={id:string;reception_number:string|number;plant_id:string;species:string;quality_status:string;status:string;supplier:string}
type Settlement={status:string}|null
type Dispatch={status:string}
type Sale={status:string}
type LotEvent={event_type:string}
type Payload={reception?:Reception;events?:LotEvent[];settlement?:Settlement;dispatches?:Dispatch[];sales?:Sale[];error?:string}

type NextAction={label:string;detail:string;to:string;icon:'quality'|'process'|'inventory'|'commercial'|'settlement'|'done'}

async function fetchLot(id:string){const response=await fetch(`/api/lot-360?receptionId=${encodeURIComponent(id)}`,{cache:'no-store'});const payload=await response.json() as Payload;if(!response.ok)throw new Error(payload.error??'No fue posible cargar el lote');return payload}

export function LiveLotActionRail({receptionId}:{receptionId:string|null}){
 const [data,setData]=useState<Payload|null>(null)
 useEffect(()=>{if(!receptionId){setData(null);return}let active=true;void fetchLot(receptionId).then(payload=>{if(active)setData(payload)}).catch(()=>{if(active)setData(null)});return()=>{active=false}},[receptionId])
 const r=data?.reception
 const next=useMemo<NextAction|null>(()=>{if(!receptionId||!r)return null;const q=`receptionId=${encodeURIComponent(receptionId)}&plantId=${encodeURIComponent(r.plant_id)}`;const hasProduction=(data?.events??[]).some(event=>event.event_type==='production');const hasDispatch=(data?.dispatches??[]).some(item=>item.status==='confirmed');const hasSale=(data?.sales??[]).some(item=>item.status!=='cancelled');if(r.quality_status!=='Clasificado')return{label:'Resolver calidad',detail:'El lote todavía no está liberado para avanzar.',to:`/etiquetas?${q}`,icon:'quality'};if(r.species.toLowerCase().includes('eriz')&&!hasProduction)return{label:'Continuar proceso de erizo',detail:'Completa el proceso específico antes de planificar salida.',to:`/proceso-erizo?${q}`,icon:'process'};if(!hasProduction)return{label:'Registrar producción',detail:'Calidad está conforme; el siguiente evento físico es producción.',to:`/planificacion?plantId=${encodeURIComponent(r.plant_id)}`,icon:'process'};if(!hasDispatch&&!hasSale)return{label:'Ubicar y comprometer producto',detail:'Hay producción registrada; revisa inventario y cobertura comercial.',to:`/inventario?${q}`,icon:'inventory'};if(!hasDispatch)return{label:'Preparar despacho',detail:'El lote ya tiene compromiso comercial y debe salir físicamente.',to:`/despachos-ventas?${q}`,icon:'commercial'};if(!data?.settlement)return{label:'Cerrar liquidación',detail:'El movimiento físico está registrado; falta el cierre económico.',to:`/liquidaciones?${q}`,icon:'settlement'};return{label:'Lote al día',detail:'No se detecta una acción pendiente inmediata en esta cadena.',to:`/plantas/${encodeURIComponent(r.plant_id)}`,icon:'done'}},[data,receptionId,r])
 if(!receptionId||!r||!next)return null
 const Icon=next.icon==='quality'?ShieldCheck:next.icon==='process'?Factory:next.icon==='inventory'?PackageCheck:next.icon==='commercial'?ShoppingCart:next.icon==='settlement'?ReceiptText:CheckCircle2
 return <div className="live-lot-action-rail" role="status"><div className="live-lot-action-context"><span>Contexto activo</span><b>{r.plant_id} · REC-{r.reception_number}</b><small>{r.species} · {r.supplier}</small></div><div className="live-lot-next"><Icon size={17}/><div><span>Siguiente acción</span><b>{next.label}</b><small>{next.detail}</small></div><Link className="button primary compact" to={next.to}>{next.icon==='done'?'Volver a planta':'Resolver'}<ArrowRight size={14}/></Link></div><div className="live-lot-shortcuts"><Link to={`/inventario?receptionId=${encodeURIComponent(receptionId)}&plantId=${encodeURIComponent(r.plant_id)}`}>Inventario</Link><Link to={`/planificacion?plantId=${encodeURIComponent(r.plant_id)}`}>Plan</Link><Link to={`/plantas/${encodeURIComponent(r.plant_id)}`}>Planta</Link></div></div>
}

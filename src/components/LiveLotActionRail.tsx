import {ArrowRight,CheckCircle2,Factory,PackageCheck,ReceiptText,ShieldCheck,ShoppingCart} from 'lucide-react'
import {useCallback,useEffect,useMemo,useState} from 'react'
import {Link,useLocation} from 'react-router-dom'
import './live-lot-action-rail.css'

type Reception={id:string;reception_number:string|number;plant_id:string;species:string;quality_status:string;status:string;supplier:string}
type Settlement={status:string}|null
type Dispatch={status:string}
type Sale={status:string}
type LotEvent={event_type:string}
type Payload={reception?:Reception;events?:LotEvent[];settlement?:Settlement;dispatches?:Dispatch[];sales?:Sale[];error?:string}

type NextAction={label:string;detail:string;to:string;icon:'quality'|'process'|'inventory'|'commercial'|'settlement'|'done';step:number;completed:number}
const TOTAL_STEPS=5

async function fetchLot(id:string){const response=await fetch(`/api/lot-360?receptionId=${encodeURIComponent(id)}`,{cache:'no-store'});const payload=await response.json() as Payload;if(!response.ok)throw new Error(payload.error??'No fue posible cargar el lote');return payload}

export function LiveLotActionRail({receptionId}:{receptionId:string|null}){
 const [data,setData]=useState<Payload|null>(null)
 const location=useLocation()
 const load=useCallback(async()=>{if(!receptionId){setData(null);return}try{setData(await fetchLot(receptionId))}catch{setData(null)}},[receptionId])
 useEffect(()=>{void load()},[load,location.pathname,location.search])
 useEffect(()=>{if(!receptionId)return;const refresh=()=>void load();const visibility=()=>{if(document.visibilityState==='visible')refresh()};window.addEventListener('pescamar:data-updated',refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',visibility);const timer=window.setInterval(refresh,4000);return()=>{window.removeEventListener('pescamar:data-updated',refresh);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',visibility);window.clearInterval(timer)}},[load,receptionId])
 const r=data?.reception
 const next=useMemo<NextAction|null>(()=>{if(!receptionId||!r)return null;const q=`receptionId=${encodeURIComponent(receptionId)}&plantId=${encodeURIComponent(r.plant_id)}`;const hasProduction=(data?.events??[]).some(event=>event.event_type==='production');const hasDispatch=(data?.dispatches??[]).some(item=>item.status==='confirmed');const hasSale=(data?.sales??[]).some(item=>item.status!=='cancelled');if(r.quality_status!=='Clasificado')return{label:'Resolver calidad',detail:'Libera la calidad del lote para continuar.',to:`/etiquetas?${q}`,icon:'quality',step:1,completed:0};if(r.species.toLowerCase().includes('eriz')&&!hasProduction)return{label:'Continuar proceso de erizo',detail:'Completa el proceso específico del lote.',to:`/proceso-erizo?${q}`,icon:'process',step:2,completed:1};if(!hasProduction)return{label:'Registrar producción',detail:'Registra el siguiente evento físico del lote.',to:`/planificacion?plantId=${encodeURIComponent(r.plant_id)}&receptionId=${encodeURIComponent(receptionId)}`,icon:'process',step:2,completed:1};if(!hasDispatch&&!hasSale)return{label:'Ubicar y comprometer producto',detail:'Asigna posición de inventario y compromiso comercial.',to:`/inventario?${q}`,icon:'inventory',step:3,completed:2};if(!hasDispatch)return{label:'Preparar despacho',detail:'El compromiso existe; registra la salida física.',to:`/despachos-ventas?${q}`,icon:'commercial',step:4,completed:3};if(!data?.settlement)return{label:'Cerrar liquidación',detail:'Completa el cierre económico del lote.',to:`/liquidaciones?${q}`,icon:'settlement',step:5,completed:4};return{label:'Ficha completa',detail:'El lote no tiene acciones operativas pendientes.',to:`/plantas/${encodeURIComponent(r.plant_id)}`,icon:'done',step:5,completed:5}},[data,receptionId,r])
 if(!receptionId||!r||!next)return null
 const Icon=next.icon==='quality'?ShieldCheck:next.icon==='process'?Factory:next.icon==='inventory'?PackageCheck:next.icon==='commercial'?ShoppingCart:next.icon==='settlement'?ReceiptText:CheckCircle2
 const percent=Math.round(next.completed/TOTAL_STEPS*100)
 return <div className="live-lot-action-rail" role="status" aria-live="polite"><div className="live-lot-action-context"><span>Ficha 360 activa</span><b>REC-{r.reception_number}</b><small>{r.plant_id} · {r.species} · {r.supplier}</small></div><div className="live-lot-next"><Icon size={18}/><div><div className="live-lot-progress-head"><span>{next.icon==='done'?'Completado':`Paso ${next.step} de ${TOTAL_STEPS}`}</span><small>{next.completed}/{TOTAL_STEPS}</small></div><div className="live-lot-progress" aria-label={`Progreso ${percent}%`}><i style={{width:`${percent}%`}}/></div><b>{next.label}</b><small>{next.detail}</small></div><Link className="button primary compact" to={next.to}>{next.icon==='done'?'Volver a planta':'Continuar'}<ArrowRight size={14}/></Link></div></div>
}

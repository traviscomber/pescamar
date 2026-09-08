import {ArrowRight,CheckCircle2,Factory,PackageCheck,ReceiptText,ShieldCheck,ShoppingCart,Snowflake,Boxes} from 'lucide-react'
import {useCallback,useEffect,useMemo,useState} from 'react'
import {Link,useLocation} from 'react-router-dom'
import './live-lot-action-rail.css'

type Reception={id:string;reception_number:string|number;plant_id:string;species:string;quality_status:string;status:string;supplier:string}
type Settlement={status:string}|null
type Dispatch={status:string}
type Sale={status:string}
type LotEvent={event_type:string}
type Payload={reception?:Reception;events?:LotEvent[];settlement?:Settlement;dispatches?:Dispatch[];sales?:Sale[];error?:string}
type LineageEvent={id:string;type:string;metrics:Record<string,unknown>}
type LineageCoverage={production?:boolean;packing?:boolean;pallet?:boolean;cold?:boolean;inventory?:boolean;commercialCommitment?:boolean;dispatch?:boolean}
type LineagePayload={events?:LineageEvent[];coverage?:LineageCoverage;error?:string}
type RailData={lot:Payload;lineage:LineagePayload}

type NextAction={label:string;detail:string;to:string;icon:'quality'|'process'|'packing'|'pallet'|'cold'|'inventory'|'commercial'|'settlement'|'done';step:number;completed:number}
const TOTAL_STEPS=8

async function json<T extends {error?:string}>(url:string){const response=await fetch(url,{cache:'no-store'});const payload=await response.json() as T;if(!response.ok)throw new Error(payload.error??'No fue posible cargar la continuidad del lote');return payload}
async function fetchLot(id:string):Promise<RailData>{
 const encoded=encodeURIComponent(id)
 const [lot,lineage]=await Promise.all([json<Payload>(`/api/lot-360?receptionId=${encoded}`),json<LineagePayload>(`/api/lot-lineage?receptionId=${encoded}`)])
 return {lot,lineage}
}

export function LiveLotActionRail({receptionId}:{receptionId:string|null}){
 const [data,setData]=useState<RailData|null>(null)
 const location=useLocation()
 const load=useCallback(async()=>{if(!receptionId){setData(null);return}try{setData(await fetchLot(receptionId))}catch{setData(null)}},[receptionId])
 useEffect(()=>{void load()},[load,location.pathname,location.search])
 useEffect(()=>{if(!receptionId)return;const refresh=()=>void load();const visibility=()=>{if(document.visibilityState==='visible')refresh()};window.addEventListener('pescamar:data-updated',refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',visibility);const timer=window.setInterval(refresh,6000);return()=>{window.removeEventListener('pescamar:data-updated',refresh);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',visibility);window.clearInterval(timer)}},[load,receptionId])
 const r=data?.lot.reception
 const next=useMemo<NextAction|null>(()=>{
  if(!receptionId||!r)return null
  const q=`receptionId=${encodeURIComponent(receptionId)}&plantId=${encodeURIComponent(r.plant_id)}`
  const coverage=data?.lineage.coverage??{}
  const palletEvent=[...(data?.lineage.events??[])].reverse().find(event=>event.type==='pallet')
  const palletId=typeof palletEvent?.metrics?.palletId==='string'?palletEvent.metrics.palletId:null
  const hasProduction=coverage.production===true||(data?.lot.events??[]).some(event=>event.event_type==='production')
  const hasPacking=coverage.packing===true
  const hasPallet=coverage.pallet===true
  const hasCold=coverage.cold===true
  const hasDispatch=(data?.lot.dispatches??[]).some(item=>item.status==='confirmed')
  const hasSale=(data?.lot.sales??[]).some(item=>item.status!=='cancelled')
  if(r.quality_status!=='Clasificado')return{label:'Resolver calidad',detail:'Libera la calidad del lote para continuar.',to:`/etiquetas?${q}`,icon:'quality',step:1,completed:0}
  if(r.species.toLowerCase().includes('eriz')&&!hasProduction)return{label:'Continuar proceso de erizo',detail:'Completa el proceso específico del lote.',to:`/proceso-erizo?${q}`,icon:'process',step:2,completed:1}
  if(!hasProduction)return{label:'Registrar producción',detail:'Registra el siguiente evento físico del lote.',to:`/planificacion?${q}`,icon:'process',step:2,completed:1}
  if(!hasPacking)return{label:'Registrar packing',detail:'El lote ya está procesado. Registra sus unidades físicas de packing.',to:`/floor/detalle?${q}`,icon:'packing',step:3,completed:2}
  if(!hasPallet)return{label:'Conformar pallet',detail:'El packing existe. Agrupa sus unidades sin perder la identidad del lote.',to:`/pallets/detalle?${q}`,icon:'pallet',step:4,completed:3}
  if(!hasCold){const coldQuery=palletId?`${q}&palletId=${encodeURIComponent(palletId)}`:q;return{label:'Registrar frío',detail:'El pallet existe. Vincúlalo a un ciclo de frío y conserva su evidencia térmica.',to:`/frio/detalle?${coldQuery}`,icon:'cold',step:5,completed:4}}
  if(!hasDispatch&&!hasSale)return{label:'Ubicar y comprometer producto',detail:'La cadena física está registrada. Ubica stock y confirma sólo el compromiso comercial necesario.',to:`/inventario?${q}`,icon:'inventory',step:6,completed:5}
  if(!hasDispatch)return{label:'Preparar despacho',detail:'El compromiso existe; registra la salida física.',to:`/despachos-ventas?${q}`,icon:'commercial',step:7,completed:6}
  if(!data?.lot.settlement)return{label:'Cerrar liquidación',detail:'Completa el cierre económico del lote.',to:`/liquidaciones?${q}`,icon:'settlement',step:8,completed:7}
  return{label:'Ficha completa',detail:'El lote no tiene acciones operativas pendientes.',to:`/plantas/${encodeURIComponent(r.plant_id)}`,icon:'done',step:8,completed:8}
 },[data,receptionId,r])
 if(!receptionId||!r||!next)return null
 const Icon=next.icon==='quality'?ShieldCheck:next.icon==='process'?Factory:next.icon==='packing'?PackageCheck:next.icon==='pallet'?Boxes:next.icon==='cold'?Snowflake:next.icon==='inventory'?PackageCheck:next.icon==='commercial'?ShoppingCart:next.icon==='settlement'?ReceiptText:CheckCircle2
 const percent=Math.round(next.completed/TOTAL_STEPS*100)
 return <div className="live-lot-action-rail" role="status" aria-live="polite"><div className="live-lot-action-context"><span>Ficha 360 activa</span><b>REC-{r.reception_number}</b><small>{r.plant_id} · {r.species} · {r.supplier}</small></div><div className="live-lot-next"><Icon size={18}/><div><div className="live-lot-progress-head"><span>{next.icon==='done'?'Completado':`Paso ${next.step} de ${TOTAL_STEPS}`}</span><small>{next.completed}/{TOTAL_STEPS}</small></div><div className="live-lot-progress" aria-label={`Progreso ${percent}%`}><i style={{width:`${percent}%`}}/></div><b>{next.label}</b><small>{next.detail}</small></div><Link className="button primary compact" to={next.to}>{next.icon==='done'?'Volver a planta':'Continuar'}<ArrowRight size={14}/></Link></div></div>
}

import {AlertTriangle,ArrowRight,Factory,PackageCheck,RefreshCw,ShieldCheck,Truck} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'
import {Link,useSearchParams} from 'react-router-dom'
import {useAuth} from '../auth'
import {PageHeader} from '../components/PageHeader'
import {plants as configuredPlants} from '../plants'
import {DailyClose as AdvancedDailyClose} from './DailyCloseAdvanced'

type RiskItem={kind:'quality'|'order'|'settlement';level:'critical'|'today'|'follow_up';reason:string;impact:number;reference:string;receptionId?:string;orderId?:string;detail:string}
type Snapshot={date:string;plantId:string|null;receptions:{count:number;kg:number};production:{events:number;inputKg:number;outputKg:number;yieldPct:number|null};dispatches:{count:number;kg:number};sales:{count:number;revenueClp:number;knownContributionClp:number;knownContributionSales:number};pending:{settlements:number;qualityAlerts:number};inventory:{locatedKg:number};risk:{critical:number;today:number;followUp:number;total:number;items:RiskItem[]}}
type Payload={snapshot?:Snapshot;error?:string}

const kg=(value:number)=>`${value.toLocaleString('es-CL',{maximumFractionDigits:1})} kg`
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())

export function DailyClose(){
 const {operator}=useAuth()
 const [params]=useSearchParams()
 const accessiblePlants=useMemo(()=>operator?.role==='admin'?configuredPlants:configuredPlants.filter(plant=>operator?.plantIds.includes(plant.id)),[operator])
 const requestedPlant=params.get('plantId')??''
 const requestedAllowed=accessiblePlants.some(plant=>plant.id===requestedPlant)?requestedPlant:''
 const defaultPlant=requestedAllowed||(operator?.role!=='admin'&&accessiblePlants.length===1?accessiblePlants[0].id:'')
 const [date,setDate]=useState(today),[plantId,setPlantId]=useState(defaultPlant),[data,setData]=useState<Payload|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[showDetail,setShowDetail]=useState(false)

 async function load(nextDate=date,nextPlant=plantId){
  setLoading(true)
  try{
   const query=new URLSearchParams({date:nextDate})
   if(nextPlant)query.set('plantId',nextPlant)
   const response=await fetch(`/api/daily-close?${query}`,{cache:'no-store'})
   const payload=await response.json() as Payload
   if(!response.ok)throw new Error(payload.error??'No fue posible construir el estado del día')
   setData(payload);setError('')
  }catch(cause){setError(cause instanceof Error?cause.message:'No fue posible construir el estado del día')}
  finally{setLoading(false)}
 }
 useEffect(()=>{setPlantId(defaultPlant);void load(date,defaultPlant)},[defaultPlant])

 const snapshot=data?.snapshot,items=(snapshot?.risk.items??[]).slice(0,5),attention=snapshot?.risk.total??0
 const scope=plantId?`&plantId=${encodeURIComponent(plantId)}`:''
 const target=(item:RiskItem)=>item.kind==='quality'&&item.receptionId?`/etiquetas?receptionId=${encodeURIComponent(item.receptionId)}${scope}`:item.kind==='order'&&item.orderId?`/ordenes-venta?orderId=${encodeURIComponent(item.orderId)}&action=allocate${scope}`:item.kind==='settlement'&&item.receptionId?`/liquidaciones?receptionId=${encodeURIComponent(item.receptionId)}${scope}`:'/'
 const action=(item:RiskItem)=>item.kind==='quality'?'Resolver calidad':item.kind==='order'?'Cubrir pedido':'Cerrar costo'
 const actions=<div className="page-actions"><label className="inline-field">Fecha<input type="date" value={date} onChange={event=>{setDate(event.target.value);void load(event.target.value,plantId)}}/></label><label className="inline-field">Planta<select value={plantId} onChange={event=>{const next=event.target.value;setPlantId(next);void load(date,next)}}>{operator?.role==='admin'||accessiblePlants.length>1?<option value="">Toda la red accesible</option>:null}{accessiblePlants.map(plant=><option key={plant.id} value={plant.id}>{plant.name}</option>)}</select></label><button className="button secondary" onClick={()=>void load()}><RefreshCw size={15}/>Actualizar</button></div>

 return <><PageHeader eyebrow="Pescamar · Hoy" title="Hoy" description="Qué pasó, qué requiere atención y qué hacer ahora." actions={actions}/>
 {error?<div className="system-banner error">{error}</div>:null}
 {loading?<div className="system-banner">Actualizando estado operativo…</div>:null}
 {snapshot?<>
  <section className="panel"><div className="section-heading"><div><span className="overline">Qué pasó</span><h2>Resumen del día</h2></div></div><div className="signal-grid"><article className="signal-card"><span><Factory size={16}/>Recibido</span><b>{kg(snapshot.receptions.kg)}</b><small>{snapshot.receptions.count} recepciones</small></article><article className="signal-card"><span><Factory size={16}/>Producido</span><b>{kg(snapshot.production.outputKg)}</b><small>{snapshot.production.events} eventos de producción</small></article><article className="signal-card"><span><PackageCheck size={16}/>Inventario ubicado</span><b>{kg(snapshot.inventory.locatedKg)}</b><small>Posición física registrada</small></article><article className="signal-card"><span><Truck size={16}/>Despachado</span><b>{kg(snapshot.dispatches.kg)}</b><small>{snapshot.dispatches.count} salidas</small></article></div></section>

  <section className={`panel executive-queue ${attention?'attention':''}`}><div className="section-heading"><div><span className="overline">Qué requiere atención</span><h2>{attention?`${attention} excepción${attention===1?'':'es'} abierta${attention===1?'':'s'}`:'Sin excepciones críticas'}</h2><p className="source-note">Sólo mostramos lo que necesita una decisión o seguimiento.</p></div><span>{attention}</span></div>{items.length?<div className="queue-list">{items.map((item,index)=><Link className={`queue-row ${item.level!=='follow_up'?'attention':''}`} to={target(item)} key={`${item.kind}-${item.reference}-${index}`}><span className="queue-priority">{index+1}</span><div><b>{item.reference}</b><small>{item.reason} · {item.detail}</small></div><strong>{action(item)}</strong><ArrowRight size={15}/></Link>)}</div>:<div className="empty-inline"><ShieldCheck size={20}/><div><b>Todo en orden dentro del alcance visible</b><small>No hay excepciones críticas que requieran acción ahora.</small></div></div>}</section>

  <section className="panel"><div className="section-heading"><div><span className="overline">Qué hacer ahora</span><h2>{items.length?'Resolver primero estas prioridades':'Continuar operación'}</h2></div></div>{items.length?<div className="queue-list">{items.slice(0,3).map((item,index)=><Link className="queue-row" to={target(item)} key={`next-${item.kind}-${item.reference}-${index}`}><span className="queue-priority">{index+1}</span><div><b>{action(item)}</b><small>{item.reference} · {item.detail}</small></div><ArrowRight size={15}/></Link>)}</div>:<div className="empty-inline"><ShieldCheck size={20}/><div><b>No necesitas intervenir</b><small>La operación puede seguir. Usa Inteligencia si quieres profundizar en trazabilidad o histórico.</small></div></div>}</section>

  <div className="page-actions"><button className="button secondary" type="button" onClick={()=>setShowDetail(value=>!value)}>{showDetail?'Ocultar detalle completo':'Ver detalle completo'}</button>{!showDetail?<Link className="button secondary" to="/pescamar-ia">Abrir Inteligencia</Link>:null}</div>
  {showDetail?<section aria-label="Detalle operativo completo"><AdvancedDailyClose/></section>:null}
 </>:null}</>
}

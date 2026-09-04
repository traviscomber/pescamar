import {ArrowRight,Factory,PackageCheck,RefreshCw,ShieldCheck,Truck} from 'lucide-react'
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
 const [date,setDate]=useState(today),[plantId,setPlantId]=useState(defaultPlant),[data,setData]=useState<Payload|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[showSummary,setShowSummary]=useState(false),[showAllAttention,setShowAllAttention]=useState(false),[showDetail,setShowDetail]=useState(false)

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

 const snapshot=data?.snapshot,items=(snapshot?.risk.items??[]).slice(0,5),attention=snapshot?.risk.total??0,firstItem=items[0]
 const scope=plantId?`&plantId=${encodeURIComponent(plantId)}`:''
 const target=(item:RiskItem)=>item.kind==='quality'&&item.receptionId?`/etiquetas?receptionId=${encodeURIComponent(item.receptionId)}${scope}`:item.kind==='order'&&item.orderId?`/ordenes-venta?orderId=${encodeURIComponent(item.orderId)}&action=allocate${scope}`:item.kind==='settlement'&&item.receptionId?`/liquidaciones?receptionId=${encodeURIComponent(item.receptionId)}${scope}`:'/'
 const action=(item:RiskItem)=>item.kind==='quality'?'Resolver calidad':item.kind==='order'?'Cubrir pedido':'Cerrar costo'
 const actions=<div className="page-actions"><label className="inline-field">Fecha<input type="date" value={date} onChange={event=>{setDate(event.target.value);void load(event.target.value,plantId)}}/></label><label className="inline-field">Planta<select value={plantId} onChange={event=>{const next=event.target.value;setPlantId(next);void load(date,next)}}>{operator?.role==='admin'||accessiblePlants.length>1?<option value="">Toda la red accesible</option>:null}{accessiblePlants.map(plant=><option key={plant.id} value={plant.id}>{plant.name}</option>)}</select></label><button className="button secondary" onClick={()=>void load()}><RefreshCw size={15}/>Actualizar</button></div>

 return <><PageHeader eyebrow="Pescamar · Hoy" title="Hoy" description="Estado y siguiente acción." actions={actions}/>
 {error?<div className="system-banner error">{error}</div>:null}
 {loading?<div className="system-banner">Actualizando estado operativo…</div>:null}
 {snapshot?<>
  <section className={`daily-cockpit ${attention?'has-attention':'is-clear'}`} aria-label="Estado operativo de hoy">
   <div className="daily-cockpit-copy">
    <span className="overline">Estado de hoy</span>
    <h2>{attention?`${attention} prioridad${attention===1?'':'es'}`:'Operación en orden'}</h2>
    <p>{attention?`Hay ${attention} excepción${attention===1?'':'es'} que requiere${attention===1?'':'n'} atención. Empezamos por la más importante.`:'No hay excepciones críticas dentro del alcance visible. La operación puede continuar.'}</p>
    <div className="daily-cockpit-actions">
     {firstItem?<Link className="button primary" to={target(firstItem)}>{action(firstItem)}<ArrowRight size={15}/></Link>:<Link className="button primary" to="/recepciones">Continuar operación<ArrowRight size={15}/></Link>}
     <button className="text-action" type="button" onClick={()=>setShowSummary(value=>!value)}>{showSummary?'Ocultar resumen':'Ver resumen'}</button>
    </div>
   </div>
   <div className="daily-status-mark" aria-hidden="true"><span>{attention||'✓'}</span><small>{attention?'abiertas':'sin alertas'}</small></div>
  </section>

  {showSummary?<section className="daily-reveal" aria-label="Resumen del día"><div className="signal-grid daily-signal-grid"><article className="signal-card"><span><Factory size={16}/>Recibido</span><b>{kg(snapshot.receptions.kg)}</b><small>{snapshot.receptions.count} recepciones</small></article><article className="signal-card"><span><Factory size={16}/>Producido</span><b>{kg(snapshot.production.outputKg)}</b><small>{snapshot.production.events} eventos</small></article><article className="signal-card"><span><PackageCheck size={16}/>Inventario</span><b>{kg(snapshot.inventory.locatedKg)}</b><small>ubicado</small></article><article className="signal-card"><span><Truck size={16}/>Despachado</span><b>{kg(snapshot.dispatches.kg)}</b><small>{snapshot.dispatches.count} salidas</small></article></div></section>:null}

  {firstItem?<section className="daily-priority" aria-label="Prioridad principal"><div className="daily-priority-head"><div><span className="overline">Prioridad principal</span><h2>{firstItem.reference}</h2><p>{firstItem.reason}</p></div><Link className="text-action inline-link" to={target(firstItem)}>Abrir<ArrowRight size={14}/></Link></div><small className="daily-priority-detail">{firstItem.detail}</small>{items.length>1?<><button className="text-action daily-more" type="button" onClick={()=>setShowAllAttention(value=>!value)}>{showAllAttention?'Mostrar menos':`Ver ${items.length-1} más`}</button>{showAllAttention?<div className="queue-list daily-more-list">{items.slice(1).map((item,index)=><Link className="queue-row" to={target(item)} key={`${item.kind}-${item.reference}-${index}`}><span className="queue-priority">{index+2}</span><div><b>{item.reference}</b><small>{item.reason}</small></div><strong>{action(item)}</strong><ArrowRight size={15}/></Link>)}</div>:null}</>:null}</section>:<section className="daily-clear-note"><ShieldCheck size={19}/><div><b>No necesitas intervenir</b><small>Si quieres profundizar, abre Inteligencia o el detalle operativo.</small></div></section>}

  <nav className="daily-footer-actions" aria-label="Más información"><Link className="text-action inline-link" to="/pescamar-ia">Abrir Inteligencia<ArrowRight size={14}/></Link><button className="text-action" type="button" onClick={()=>setShowDetail(value=>!value)}>{showDetail?'Cerrar detalle':'Detalle operativo'}</button></nav>
  {showDetail?<section aria-label="Detalle operativo completo"><AdvancedDailyClose/></section>:null}
 </>:null}</>
}

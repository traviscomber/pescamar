import {ArrowRight,Factory,PackageCheck,RefreshCw,ShieldCheck,Truck} from 'lucide-react'
import {useCallback,useEffect,useMemo,useState} from 'react'
import {Link,useSearchParams} from 'react-router-dom'
import {useAuth} from '../auth'
import {PageHeader} from '../components/PageHeader'
import {plants as configuredPlants} from '../plants'
import {DailyClose as AdvancedDailyClose} from './DailyCloseAdvanced'

type RiskItem={kind:'quality'|'order'|'settlement';level:'critical'|'today'|'follow_up';reason:string;impact:number;reference:string;receptionId?:string;orderId?:string;detail:string}
type Snapshot={date:string;plantId:string|null;receptions:{count:number;kg:number};production:{events:number;inputKg:number;outputKg:number;yieldPct:number|null};dispatches:{count:number;kg:number};sales:{count:number;revenueClp:number;knownContributionClp:number;knownContributionSales:number};pending:{settlements:number;qualityAlerts:number};inventory:{locatedKg:number};risk:{critical:number;today:number;followUp:number;total:number;items:RiskItem[]}}
type Payload={snapshot?:Snapshot;error?:string}
type OperationalSignal={priority:1|2|3;kind:string;title:string;detail:string;confidence:'observed'|'derived';action:string;evidenceEventIds:string[];blockers:string[]}
type OperationalItem={receptionId:string;receptionNumber:string|null;plantId:string|null;species:string|null;supplier:string|null;latestAt:string|null;path:string;signal:OperationalSignal}
type OperationalPayload={schemaVersion?:string;scope?:{plantId:string|null;role:string};lots?:number;counts?:{p1:number;p2:number;p3:number};topSignals?:OperationalItem[];boundary?:{writesOperationalState?:boolean;liveOnly?:boolean;historicalIncluded?:boolean};error?:string}
type Priority={key:string;score:number;reference:string;reason:string;why:string;next:string;to:string;action:string;owner:string;source:'event_graph'|'daily'}

const kg=(value:number)=>`${value.toLocaleString('es-CL',{maximumFractionDigits:1})} kg`
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
const commercialPaths=['/ordenes-venta','/proveedores-clientes','/despachos-ventas','/liquidaciones','/creditos','/costos-transformacion']
const suggestedOwner=(path:string)=>commercialPaths.some(prefix=>path.startsWith(prefix))?'Comercial / administrativo':'Operador generalista'
async function readJson<T>(url:string){const response=await fetch(url,{cache:'no-store'}),payload=await response.json() as T&{error?:string};if(!response.ok)throw new Error(payload.error??'No fue posible construir el estado');return payload}

export function DailyClose(){
 const {operator}=useAuth()
 const [params]=useSearchParams()
 const accessiblePlants=useMemo(()=>operator?.role==='admin'?configuredPlants:configuredPlants.filter(plant=>operator?.plantIds.includes(plant.id)),[operator])
 const requestedPlant=params.get('plantId')??''
 const requestedAllowed=accessiblePlants.some(plant=>plant.id===requestedPlant)?requestedPlant:''
 const defaultPlant=requestedAllowed||(operator?.role!=='admin'&&accessiblePlants.length===1?accessiblePlants[0].id:'')
 const [date,setDate]=useState(today),[plantId,setPlantId]=useState(defaultPlant),[data,setData]=useState<Payload|null>(null),[operational,setOperational]=useState<OperationalPayload|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[showSummary,setShowSummary]=useState(false),[showDetail,setShowDetail]=useState(false)

 const load=useCallback(async(nextDate:string,nextPlant:string)=>{
  setLoading(true)
  try{
   const query=new URLSearchParams({date:nextDate}),operationalQuery=new URLSearchParams()
   if(nextPlant){query.set('plantId',nextPlant);operationalQuery.set('plantId',nextPlant)}
   const [dailyResult,operationalResult]=await Promise.allSettled([readJson<Payload>(`/api/daily-close?${query}`),readJson<OperationalPayload>(`/api/operational-intelligence-overview${operationalQuery.size?`?${operationalQuery}`:''}`)])
   if(dailyResult.status==='rejected')throw dailyResult.reason
   setData(dailyResult.value)
   setOperational(operationalResult.status==='fulfilled'?operationalResult.value:null)
   setError('')
  }catch(cause){setError(cause instanceof Error?cause.message:'No fue posible construir el estado del día')}
  finally{setLoading(false)}
 },[])
 useEffect(()=>{setPlantId(defaultPlant)},[defaultPlant])
 useEffect(()=>{void load(date,plantId)},[date,plantId,load])

 const snapshot=data?.snapshot,riskItems=snapshot?.risk.items??[],operationalItems=operational?.topSignals??[]
 const eventGraphReceptionIds=new Set(operationalItems.map(item=>item.receptionId)),dailyDistinct=riskItems.filter(item=>!item.receptionId||!eventGraphReceptionIds.has(item.receptionId))
 const dailyScore=(level:RiskItem['level'])=>level==='critical'?900:level==='today'?680:380
 const eventScore=(priority:OperationalSignal['priority'])=>priority===1?1000:priority===2?700:400
 const target=(item:RiskItem)=>{const scope=plantId?`&plantId=${encodeURIComponent(plantId)}`:'';return item.kind==='quality'&&item.receptionId?`/etiquetas?receptionId=${encodeURIComponent(item.receptionId)}${scope}`:item.kind==='order'&&item.orderId?`/ordenes-venta?orderId=${encodeURIComponent(item.orderId)}&action=allocate${scope}`:item.kind==='settlement'&&item.receptionId?`/liquidaciones?receptionId=${encodeURIComponent(item.receptionId)}${scope}`:'/'}
 const action=(item:RiskItem)=>item.kind==='quality'?'Resolver calidad':item.kind==='order'?'Cubrir pedido':'Cerrar costo'
 const priorities:Priority[]=[...operationalItems.map(item=>({key:`event-${item.receptionId}-${item.signal.kind}-${item.signal.evidenceEventIds.join('-')}`,score:eventScore(item.signal.priority),reference:`${item.receptionNumber?`REC-${item.receptionNumber}`:'Lote live'}${item.supplier?` · ${item.supplier}`:''}`,reason:item.signal.title,why:item.signal.detail,next:item.signal.action,to:item.path,action:'Abrir trazabilidad',owner:suggestedOwner(item.path),source:'event_graph' as const})),...dailyDistinct.map((item,index)=>{const to=target(item);return {key:`daily-${item.kind}-${item.reference}-${index}`,score:dailyScore(item.level),reference:item.reference,reason:item.reason,why:item.detail,next:action(item),to,action:action(item),owner:suggestedOwner(to),source:'daily' as const}})].sort((a,b)=>b.score-a.score).slice(0,3)
 const operationalCounts=operational?.counts??{p1:0,p2:0,p3:0},eventGraphOpen=operationalCounts.p1+operationalCounts.p2+operationalCounts.p3,dedupedDaily=Math.max(0,(snapshot?.risk.total??0)-riskItems.filter(item=>item.receptionId&&eventGraphReceptionIds.has(item.receptionId)).length),attention=eventGraphOpen+dedupedDaily,firstPriority=priorities[0]
 const actions=<div className="page-actions"><label className="inline-field">Fecha<input type="date" value={date} onChange={event=>setDate(event.target.value)}/></label><label className="inline-field">Planta<select value={plantId} onChange={event=>setPlantId(event.target.value)}>{operator?.role==='admin'||accessiblePlants.length>1?<option value="">Toda la red accesible</option>:null}{accessiblePlants.map(plant=><option key={plant.id} value={plant.id}>{plant.name}</option>)}</select></label><button className="button secondary" onClick={()=>void load(date,plantId)}><RefreshCw size={15}/>Actualizar</button></div>

 return <><PageHeader eyebrow="Pescamar · Hoy" title="Hoy" description="Estado, prioridad y siguiente acción." actions={actions}/>
 {error?<div className="system-banner error">{error}</div>:null}
 {loading?<div className="system-banner">Actualizando Control Tower…</div>:null}
 {snapshot?<>
  <section className={`daily-cockpit ${attention?'has-attention':'is-clear'}`} aria-label="Control Tower de hoy">
   <div className="daily-cockpit-copy">
    <span className="overline">Control Tower</span>
    <h2>{attention?`${attention} señal${attention===1?'':'es'} para revisar`:'Operación en orden'}</h2>
    <p>{attention?'Seafood Event Graph y las excepciones del día comparten una sola cola. Cada señal indica acción y responsable sugerido; no existe un ranking paralelo de lotes.':'No hay señales P1/P2/P3 ni pendientes visibles dentro del alcance actual. El estado verde conserva contexto operacional para seguir trabajando.'}</p>
    <div className="daily-cockpit-actions">
     {firstPriority?<Link className="button primary" to={firstPriority.to}>{firstPriority.action}<ArrowRight size={15}/></Link>:<Link className="button primary" to="/recepciones">Continuar operación<ArrowRight size={15}/></Link>}
     <button className="text-action" type="button" onClick={()=>setShowSummary(value=>!value)}>{showSummary?'Ocultar resumen':'Ver resumen'}</button>
    </div>
   </div>
   <div className="daily-status-mark" aria-hidden="true"><span>{attention||'✓'}</span><small>{attention?'por revisar':'sin alertas'}</small></div>
  </section>

  {priorities.length?<section className="daily-priority" aria-label="Prioridades operacionales"><div className="daily-priority-head"><div><span className="overline">Prioridad 1 de {priorities.length}</span><h2>{priorities[0].reference}</h2><p>{priorities[0].reason}</p></div><Link className="text-action inline-link" to={priorities[0].to}>Abrir<ArrowRight size={14}/></Link></div><small className="daily-priority-detail"><b>Por qué:</b> {priorities[0].why}</small><small className="daily-priority-detail"><b>Siguiente:</b> {priorities[0].next}</small><small className="daily-priority-detail"><b>Responsable sugerido:</b> {priorities[0].owner}</small>{priorities[0].source==='event_graph'?<small className="daily-priority-detail"><b>Fuente:</b> Operational Intelligence · Seafood Event Graph live</small>:null}{priorities.length>1?<div className="queue-list daily-more-list">{priorities.slice(1).map((item,index)=><Link className="queue-row" to={item.to} key={item.key}><span className="queue-priority">{index+2}</span><div><b>{item.reference}</b><small>{item.reason}</small><small>Siguiente: {item.next}</small><small>Responsable sugerido: {item.owner}</small></div><strong>{item.action}</strong><ArrowRight size={15}/></Link>)}</div>:null}</section>:<section className="daily-clear-note"><ShieldCheck size={19}/><div><b>No necesitas intervenir</b><small>Operational Intelligence no encontró señales prioritarias y las excepciones del día están vacías para este alcance.</small></div></section>}

  {!attention?<section className="daily-clear-context" aria-label="Contexto operacional sin alertas"><div><small>Cobertura live</small><b>{operational?.lots??0} lotes</b><span>revisados por Event Graph</span></div><div><small>Actividad del día</small><b>{snapshot.receptions.count+snapshot.production.events+snapshot.dispatches.count}</b><span>{snapshot.receptions.count} recepciones · {snapshot.production.events} producción · {snapshot.dispatches.count} despachos</span></div><div><small>Inventario ubicado</small><b>{kg(snapshot.inventory.locatedKg)}</b><span>evidencia física disponible</span></div></section>:null}

  {showSummary?<section className="daily-reveal" aria-label="Resumen del día"><div className="signal-grid daily-signal-grid"><article className="signal-card"><span><Factory size={16}/>Recibido</span><b>{kg(snapshot.receptions.kg)}</b><small>{snapshot.receptions.count} recepciones</small></article><article className="signal-card"><span><Factory size={16}/>Producido</span><b>{kg(snapshot.production.outputKg)}</b><small>{snapshot.production.events} eventos</small></article><article className="signal-card"><span><PackageCheck size={16}/>Inventario</span><b>{kg(snapshot.inventory.locatedKg)}</b><small>ubicado</small></article><article className="signal-card"><span><Truck size={16}/>Despachado</span><b>{kg(snapshot.dispatches.kg)}</b><small>{snapshot.dispatches.count} salidas</small></article></div>{operational?<p className="lot360-caveat">Operational Intelligence revisó {operational.lots??0} lote{operational.lots===1?'':'s'} live · P1 {operationalCounts.p1} · P2 {operationalCounts.p2} · P3 {operationalCounts.p3} · sólo lectura.</p>:null}</section>:null}

  <nav className="daily-footer-actions" aria-label="Más información"><Link className="text-action inline-link" to="/pescamar-ia">Preguntar a Seafood AI<ArrowRight size={14}/></Link><button className="text-action" type="button" onClick={()=>setShowDetail(value=>!value)}>{showDetail?'Cerrar detalle':'Detalle operativo'}</button></nav>
  {showDetail?<section aria-label="Detalle operativo completo"><AdvancedDailyClose/></section>:null}
 </>:null}</>
}

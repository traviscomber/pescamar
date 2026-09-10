import {ArrowRight,PackageCheck,RefreshCw,ShieldCheck} from 'lucide-react'
import {useCallback,useEffect,useMemo,useState} from 'react'
import {Link,useSearchParams} from 'react-router-dom'
import {useAuth} from '../auth'
import {PageHeader} from '../components/PageHeader'
import {plants as configuredPlants} from '../plants'

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
const suggestedOwner=(path:string)=>commercialPaths.some(prefix=>path.startsWith(prefix))?'Comercial / administrativo':'Operación'
async function readJson<T>(url:string){const response=await fetch(url,{cache:'no-store'}),payload=await response.json() as T&{error?:string};if(!response.ok)throw new Error(payload.error??'No fue posible construir el estado');return payload}

export function DailyClose(){
 const {operator}=useAuth()
 const [params]=useSearchParams()
 const accessiblePlants=useMemo(()=>operator?.role==='admin'?configuredPlants:configuredPlants.filter(plant=>operator?.plantIds.includes(plant.id)),[operator])
 const requestedPlant=params.get('plantId')??''
 const requestedAllowed=accessiblePlants.some(plant=>plant.id===requestedPlant)?requestedPlant:''
 const defaultPlant=requestedAllowed||(operator?.role!=='admin'&&accessiblePlants.length===1?accessiblePlants[0].id:'')
 const [date,setDate]=useState(today),[plantId,setPlantId]=useState(defaultPlant),[data,setData]=useState<Payload|null>(null),[operational,setOperational]=useState<OperationalPayload|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('')

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
 const action=(item:RiskItem)=>item.kind==='quality'?'Revisar calidad':item.kind==='order'?'Revisar pedido':'Completar costo'
 const priorities:Priority[]=[...operationalItems.map(item=>({key:`event-${item.receptionId}-${item.signal.kind}-${item.signal.evidenceEventIds.join('-')}`,score:eventScore(item.signal.priority),reference:`${item.receptionNumber?`REC-${item.receptionNumber}`:'Lote actual'}${item.supplier?` · ${item.supplier}`:''}`,reason:item.signal.title,why:item.signal.detail,next:item.signal.action,to:item.path,action:'Abrir',owner:suggestedOwner(item.path),source:'event_graph' as const})),...dailyDistinct.map((item,index)=>{const to=target(item);return {key:`daily-${item.kind}-${item.reference}-${index}`,score:dailyScore(item.level),reference:item.reference,reason:item.reason,why:item.detail,next:action(item),to,action:action(item),owner:suggestedOwner(to),source:'daily' as const}})].sort((a,b)=>b.score-a.score).slice(0,3)
 const operationalCounts=operational?.counts??{p1:0,p2:0,p3:0},eventGraphOpen=operationalCounts.p1+operationalCounts.p2+operationalCounts.p3,dedupedDaily=Math.max(0,(snapshot?.risk.total??0)-riskItems.filter(item=>item.receptionId&&eventGraphReceptionIds.has(item.receptionId)).length),attention=eventGraphOpen+dedupedDaily,firstPriority=priorities[0]
 const actions=<div className="page-actions"><label className="inline-field">Fecha<input type="date" value={date} onChange={event=>setDate(event.target.value)}/></label><label className="inline-field">Planta<select value={plantId} onChange={event=>setPlantId(event.target.value)}>{operator?.role==='admin'||accessiblePlants.length>1?<option value="">Todas las plantas</option>:null}{accessiblePlants.map(plant=><option key={plant.id} value={plant.id}>{plant.name}</option>)}</select></label><button className="button secondary" onClick={()=>void load(date,plantId)}><RefreshCw size={15}/>Actualizar</button></div>

 return <><PageHeader eyebrow="Pescamar" title="Inicio" description="Ve qué está pasando hoy, qué tienes que hacer y dónde continuar." actions={actions}/>
 {error?<div className="system-banner error">{error}</div>:null}
 {loading?<div className="system-banner">Actualizando operación…</div>:null}
 {snapshot?<>
  <section className={`daily-cockpit ${attention?'has-attention':'is-clear'}`} aria-label="Qué está pasando hoy">
   <div className="daily-cockpit-copy">
    <span className="overline">Qué está pasando hoy</span>
    <h2>{attention?`${attention} cosa${attention===1?'':'s'} para revisar`:'Hoy no hay tareas pendientes'}</h2>
    <p>{attention?'Hay trabajo que requiere revisión. El sistema lo ordena abajo y muestra la siguiente acción.':'No hay movimientos nuevos que requieran intervención. Puedes registrar una recepción o consultar el historial.'}</p>
   </div>
   <div className="daily-status-mark" aria-hidden="true"><span>{attention||'✓'}</span><small>{attention?'por revisar':'al día'}</small></div>
  </section>

  <section className="daily-priority" aria-label="Qué tengo que hacer">
   <div className="daily-priority-head"><div><span className="overline">Qué tengo que hacer</span><h2>{firstPriority?firstPriority.reference:'Comenzar una operación'}</h2><p>{firstPriority?firstPriority.reason:'Si llega producto, registra primero la recepción. Ese registro inicia la trazabilidad del lote.'}</p></div>{firstPriority?<Link className="button primary" to={firstPriority.to}>{firstPriority.action}<ArrowRight size={15}/></Link>:<Link className="button primary" to="/recepciones">Registrar recepción<ArrowRight size={15}/></Link>}</div>{firstPriority?<><small className="daily-priority-detail"><b>Siguiente:</b> {firstPriority.next}</small><small className="daily-priority-detail"><b>Responsable:</b> {firstPriority.owner}</small></>:null}
  </section>

  <section className="daily-clear-context" aria-label="Qué tengo disponible"><div><small>Lotes actuales</small><b>{operational?.lots??0} lotes</b><span>operación live registrada</span></div><div><small>Movimientos de hoy</small><b>{snapshot.receptions.count+snapshot.production.events+snapshot.dispatches.count}</b><span>{snapshot.receptions.count} recepciones · {snapshot.production.events} producción · {snapshot.dispatches.count} despachos</span></div><div><small>Inventario actual</small><b>{kg(snapshot.inventory.locatedKg)}</b><span>producto con ubicación registrada</span></div></section>

  <section className="daily-home-attention" aria-label="Qué requiere atención"><div className="section-heading"><div><span className="overline">Qué requiere atención</span><h2>{priorities.length?'Revisa primero estos asuntos':'Nada requiere intervención ahora'}</h2></div></div>{priorities.length?<div className="queue-list daily-more-list">{priorities.map((item,index)=><Link className="queue-row" to={item.to} key={item.key}><span className="queue-priority">{index+1}</span><div><b>{item.reference}</b><small>{item.reason}</small><small>{item.next}</small></div><strong>{item.action}</strong><ArrowRight size={15}/></Link>)}</div>:<div className="daily-clear-note"><ShieldCheck size={19}/><div><b>Sin alertas actuales</b><small>Los datos históricos siguen disponibles para consulta, pero no se mezclan con la operación de hoy.</small></div></div>}</section>

  <nav className="daily-footer-actions" aria-label="Consulta"><Link className="text-action inline-link" to="/lineage?mode=historical&year=2026">Ver historial<ArrowRight size={14}/></Link><Link className="text-action inline-link" to="/inicio/detalle">Ver reportes<ArrowRight size={14}/></Link><Link className="text-action inline-link" to="/pescamar-ia">Preguntar al asistente<ArrowRight size={14}/></Link></nav>
  <p className="lot360-caveat"><PackageCheck size={13}/> El historial es referencia de consulta. No se presenta como inventario, venta ni finanzas live.</p>
 </>:null}</>
}

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
type TowerItem={receptionId:string;receptionNumber:string|number;plantId:string|null;supplier:string;species:string;priority:'critical'|'today'|'follow_up';score:number;problem:string;why:string;nextAction:string;nextRoute:string}
type TowerPayload={summary?:{live:number;attention:number;pending:number;clear:number;evaluated:number;failed:number;limit:number};items?:TowerItem[];error?:string}
type Priority={key:string;score:number;reference:string;reason:string;why:string;next:string;to:string;action:string;source:'lot'|'daily'}

const kg=(value:number)=>`${value.toLocaleString('es-CL',{maximumFractionDigits:1})} kg`
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
async function readJson<T>(url:string){const response=await fetch(url,{cache:'no-store'}),payload=await response.json() as T&{error?:string};if(!response.ok)throw new Error(payload.error??'No fue posible construir el estado');return payload}

export function DailyClose(){
 const {operator}=useAuth()
 const [params]=useSearchParams()
 const accessiblePlants=useMemo(()=>operator?.role==='admin'?configuredPlants:configuredPlants.filter(plant=>operator?.plantIds.includes(plant.id)),[operator])
 const requestedPlant=params.get('plantId')??''
 const requestedAllowed=accessiblePlants.some(plant=>plant.id===requestedPlant)?requestedPlant:''
 const defaultPlant=requestedAllowed||(operator?.role!=='admin'&&accessiblePlants.length===1?accessiblePlants[0].id:'')
 const [date,setDate]=useState(today),[plantId,setPlantId]=useState(defaultPlant),[data,setData]=useState<Payload|null>(null),[tower,setTower]=useState<TowerPayload|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[showSummary,setShowSummary]=useState(false),[showDetail,setShowDetail]=useState(false)

 async function load(nextDate=date,nextPlant=plantId){
  setLoading(true)
  try{
   const query=new URLSearchParams({date:nextDate}),towerQuery=new URLSearchParams()
   if(nextPlant){query.set('plantId',nextPlant);towerQuery.set('plantId',nextPlant)}
   const [dailyResult,towerResult]=await Promise.allSettled([readJson<Payload>(`/api/daily-close?${query}`),readJson<TowerPayload>(`/api/control-tower${towerQuery.size?`?${towerQuery}`:''}`)])
   if(dailyResult.status==='rejected')throw dailyResult.reason
   setData(dailyResult.value)
   setTower(towerResult.status==='fulfilled'?towerResult.value:null)
   setError('')
  }catch(cause){setError(cause instanceof Error?cause.message:'No fue posible construir el estado del día')}
  finally{setLoading(false)}
 }
 useEffect(()=>{setPlantId(defaultPlant);void load(date,defaultPlant)},[defaultPlant])

 const snapshot=data?.snapshot,riskItems=snapshot?.risk.items??[],towerItems=tower?.items??[]
 const towerReceptionIds=new Set(towerItems.map(item=>item.receptionId)),dailyDistinct=riskItems.filter(item=>!item.receptionId||!towerReceptionIds.has(item.receptionId))
 const dailyScore=(level:RiskItem['level'])=>level==='critical'?900:level==='today'?680:380
 const target=(item:RiskItem)=>{const scope=plantId?`&plantId=${encodeURIComponent(plantId)}`:'';return item.kind==='quality'&&item.receptionId?`/etiquetas?receptionId=${encodeURIComponent(item.receptionId)}${scope}`:item.kind==='order'&&item.orderId?`/ordenes-venta?orderId=${encodeURIComponent(item.orderId)}&action=allocate${scope}`:item.kind==='settlement'&&item.receptionId?`/liquidaciones?receptionId=${encodeURIComponent(item.receptionId)}${scope}`:'/'}
 const action=(item:RiskItem)=>item.kind==='quality'?'Resolver calidad':item.kind==='order'?'Cubrir pedido':'Cerrar costo'
 const priorities:Priority=[...towerItems.map(item=>({key:`lot-${item.receptionId}`,score:item.score,reference:`REC-${item.receptionNumber} · ${item.supplier}`,reason:item.problem,why:item.why,next:item.nextAction,to:item.nextRoute,action:'Continuar',source:'lot' as const})),...dailyDistinct.map((item,index)=>({key:`daily-${item.kind}-${item.reference}-${index}`,score:dailyScore(item.level),reference:item.reference,reason:item.reason,why:item.detail,next:action(item),to:target(item),action:action(item),source:'daily' as const}))].sort((a,b)=>b.score-a.score).slice(0,3)
 const towerOpen=(tower?.summary?.attention??0)+(tower?.summary?.pending??0),dedupedDaily=Math.max(0,(snapshot?.risk.total??0)-riskItems.filter(item=>item.receptionId&&towerReceptionIds.has(item.receptionId)).length),attention=towerOpen+dedupedDaily,firstPriority=priorities[0]
 const actions=<div className="page-actions"><label className="inline-field">Fecha<input type="date" value={date} onChange={event=>{setDate(event.target.value);void load(event.target.value,plantId)}}/></label><label className="inline-field">Planta<select value={plantId} onChange={event=>{const next=event.target.value;setPlantId(next);void load(date,next)}}>{operator?.role==='admin'||accessiblePlants.length>1?<option value="">Toda la red accesible</option>:null}{accessiblePlants.map(plant=><option key={plant.id} value={plant.id}>{plant.name}</option>)}</select></label><button className="button secondary" onClick={()=>void load()}><RefreshCw size={15}/>Actualizar</button></div>

 return <><PageHeader eyebrow="Pescamar · Hoy" title="Hoy" description="Estado, prioridad y siguiente acción." actions={actions}/>
 {error?<div className="system-banner error">{error}</div>:null}
 {loading?<div className="system-banner">Actualizando Control Tower…</div>:null}
 {snapshot?<>
  <section className={`daily-cockpit ${attention?'has-attention':'is-clear'}`} aria-label="Control Tower de hoy">
   <div className="daily-cockpit-copy">
    <span className="overline">Control Tower</span>
    <h2>{attention?`${attention} prioridad${attention===1?'':'es'}`:'Operación en orden'}</h2>
    <p>{attention?'Lot Control y las excepciones del día están ordenadas por impacto. Se muestran sólo las tres acciones más importantes.':'No hay bloqueos o pendientes visibles dentro del alcance actual.'}</p>
    <div className="daily-cockpit-actions">
     {firstPriority?<Link className="button primary" to={firstPriority.to}>{firstPriority.action}<ArrowRight size={15}/></Link>:<Link className="button primary" to="/recepciones">Continuar operación<ArrowRight size={15}/></Link>}
     <button className="text-action" type="button" onClick={()=>setShowSummary(value=>!value)}>{showSummary?'Ocultar resumen':'Ver resumen'}</button>
    </div>
   </div>
   <div className="daily-status-mark" aria-hidden="true"><span>{attention||'✓'}</span><small>{attention?'abiertas':'sin alertas'}</small></div>
  </section>

  {priorities.length?<section className="daily-priority" aria-label="Prioridades operacionales"><div className="daily-priority-head"><div><span className="overline">Prioridad 1 de {priorities.length}</span><h2>{priorities[0].reference}</h2><p>{priorities[0].reason}</p></div><Link className="text-action inline-link" to={priorities[0].to}>Abrir<ArrowRight size={14}/></Link></div><small className="daily-priority-detail"><b>Por qué:</b> {priorities[0].why}</small><small className="daily-priority-detail"><b>Siguiente:</b> {priorities[0].next}</small>{priorities.length>1?<div className="queue-list daily-more-list">{priorities.slice(1).map((item,index)=><Link className="queue-row" to={item.to} key={item.key}><span className="queue-priority">{index+2}</span><div><b>{item.reference}</b><small>{item.reason}</small><small>Siguiente: {item.next}</small></div><strong>{item.action}</strong><ArrowRight size={15}/></Link>)}</div>:null}</section>:<section className="daily-clear-note"><ShieldCheck size={19}/><div><b>No necesitas intervenir</b><small>El Control Tower no encontró acciones prioritarias con la evidencia disponible.</small></div></section>}

  {showSummary?<section className="daily-reveal" aria-label="Resumen del día"><div className="signal-grid daily-signal-grid"><article className="signal-card"><span><Factory size={16}/>Recibido</span><b>{kg(snapshot.receptions.kg)}</b><small>{snapshot.receptions.count} recepciones</small></article><article className="signal-card"><span><Factory size={16}/>Producido</span><b>{kg(snapshot.production.outputKg)}</b><small>{snapshot.production.events} eventos</small></article><article className="signal-card"><span><PackageCheck size={16}/>Inventario</span><b>{kg(snapshot.inventory.locatedKg)}</b><small>ubicado</small></article><article className="signal-card"><span><Truck size={16}/>Despachado</span><b>{kg(snapshot.dispatches.kg)}</b><small>{snapshot.dispatches.count} salidas</small></article></div>{tower?.summary?<p className="lot360-caveat">Lot Control evaluó {tower.summary.evaluated} lote{tower.summary.evaluated===1?'':'s'} vivo{tower.summary.evaluated===1?'':'s'} · {tower.summary.clear} sin bloqueo · {tower.summary.failed} sin evaluación completa.</p>:null}</section>:null}

  <nav className="daily-footer-actions" aria-label="Más información"><Link className="text-action inline-link" to="/pescamar-ia">Preguntar a Seafood AI<ArrowRight size={14}/></Link><button className="text-action" type="button" onClick={()=>setShowDetail(value=>!value)}>{showDetail?'Cerrar detalle':'Detalle operativo'}</button></nav>
  {showDetail?<section aria-label="Detalle operativo completo"><AdvancedDailyClose/></section>:null}
 </>:null}</>
}

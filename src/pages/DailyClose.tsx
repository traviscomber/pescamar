import {ArrowRight,PackageCheck,RefreshCw,ShieldCheck} from 'lucide-react'
import {useCallback,useEffect,useMemo,useState} from 'react'
import {Link,useSearchParams} from 'react-router-dom'
import {useAuth} from '../auth'
import {PageHeader} from '../components/PageHeader'
import {useLocale,localeTag} from '../i18n'
import {plants as configuredPlants} from '../plants'

type RiskItem={kind:'quality'|'order'|'settlement';level:'critical'|'today'|'follow_up';reason:string;impact:number;reference:string;receptionId?:string;orderId?:string;detail:string}
type Snapshot={date:string;plantId:string|null;receptions:{count:number;kg:number};production:{events:number;inputKg:number;outputKg:number;yieldPct:number|null};dispatches:{count:number;kg:number};sales:{count:number;revenueClp:number;knownContributionClp:number;knownContributionSales:number};pending:{settlements:number;qualityAlerts:number};inventory:{locatedKg:number};risk:{critical:number;today:number;followUp:number;total:number;items:RiskItem[]}}
type Payload={snapshot?:Snapshot;error?:string}
type OperationalSignal={priority:1|2|3;kind:string;title:string;detail:string;confidence:'observed'|'derived';action:string;evidenceEventIds:string[];blockers:string[]}
type OperationalItem={receptionId:string;receptionNumber:string|null;plantId:string|null;species:string|null;supplier:string|null;latestAt:string|null;path:string;signal:OperationalSignal}
type OperationalPayload={schemaVersion?:string;scope?:{plantId:string|null;role:string};lots?:number;counts?:{p1:number;p2:number;p3:number};topSignals?:OperationalItem[];boundary?:{writesOperationalState?:boolean;liveOnly?:boolean;historicalIncluded?:boolean};error?:string}
type Priority={key:string;score:number;reference:string;reason:string;why:string;next:string;to:string;action:string;owner:string;source:'event_graph'|'daily'}

const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
const commercialPaths=['/ordenes-venta','/proveedores-clientes','/despachos-ventas','/liquidaciones','/creditos','/costos-transformacion']
async function readJson<T>(url:string,fallback:string){const response=await fetch(url,{cache:'no-store'}),payload=await response.json() as T&{error?:string};if(!response.ok)throw new Error(payload.error??fallback);return payload}

export function DailyClose(){
 const {operator}=useAuth()
 const {t,locale}=useLocale()
 const [params]=useSearchParams()
 const accessiblePlants=useMemo(()=>operator?.role==='admin'?configuredPlants:configuredPlants.filter(plant=>operator?.plantIds.includes(plant.id)),[operator])
 const requestedPlant=params.get('plantId')??''
 const requestedAllowed=accessiblePlants.some(plant=>plant.id===requestedPlant)?requestedPlant:''
 const defaultPlant=requestedAllowed||(operator?.role!=='admin'&&accessiblePlants.length===1?accessiblePlants[0].id:'')
 const [date,setDate]=useState(today),[plantId,setPlantId]=useState(defaultPlant),[data,setData]=useState<Payload|null>(null),[operational,setOperational]=useState<OperationalPayload|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
 const kg=(value:number)=>`${value.toLocaleString(localeTag(locale),{maximumFractionDigits:1})} kg`
 const suggestedOwner=(path:string)=>commercialPaths.some(prefix=>path.startsWith(prefix))?t('home.ownerCommercial'):t('home.ownerOperations')

 const load=useCallback(async(nextDate:string,nextPlant:string)=>{
  setLoading(true)
  try{
   const query=new URLSearchParams({date:nextDate}),operationalQuery=new URLSearchParams()
   if(nextPlant){query.set('plantId',nextPlant);operationalQuery.set('plantId',nextPlant)}
   const [dailyResult,operationalResult]=await Promise.allSettled([readJson<Payload>(`/api/daily-close?${query}`,t('home.readError')),readJson<OperationalPayload>(`/api/operational-intelligence-overview${operationalQuery.size?`?${operationalQuery}`:''}`,t('home.readError'))])
   if(dailyResult.status==='rejected')throw dailyResult.reason
   setData(dailyResult.value)
   setOperational(operationalResult.status==='fulfilled'?operationalResult.value:null)
   setError('')
  }catch(cause){setError(cause instanceof Error?cause.message:t('home.readDayError'))}
  finally{setLoading(false)}
 },[t])
 useEffect(()=>{setPlantId(defaultPlant)},[defaultPlant])
 useEffect(()=>{void load(date,plantId)},[date,plantId,load])

 const snapshot=data?.snapshot,riskItems=snapshot?.risk.items??[],operationalItems=operational?.topSignals??[]
 const eventGraphReceptionIds=new Set(operationalItems.map(item=>item.receptionId)),dailyDistinct=riskItems.filter(item=>!item.receptionId||!eventGraphReceptionIds.has(item.receptionId))
 const dailyScore=(level:RiskItem['level'])=>level==='critical'?900:level==='today'?680:380
 const eventScore=(priority:OperationalSignal['priority'])=>priority===1?1000:priority===2?700:400
 const target=(item:RiskItem)=>{const scope=plantId?`&plantId=${encodeURIComponent(plantId)}`:'';return item.kind==='quality'&&item.receptionId?`/etiquetas?receptionId=${encodeURIComponent(item.receptionId)}${scope}`:item.kind==='order'&&item.orderId?`/ordenes-venta?orderId=${encodeURIComponent(item.orderId)}&action=allocate${scope}`:item.kind==='settlement'&&item.receptionId?`/liquidaciones?receptionId=${encodeURIComponent(item.receptionId)}${scope}`:'/'}
 const action=(item:RiskItem)=>item.kind==='quality'?t('home.actionQuality'):item.kind==='order'?t('home.actionOrder'):t('home.actionCost')
 const priorities:Priority[]=[...operationalItems.map(item=>({key:`event-${item.receptionId}-${item.signal.kind}-${item.signal.evidenceEventIds.join('-')}`,score:eventScore(item.signal.priority),reference:`${item.receptionNumber?`REC-${item.receptionNumber}`:t('home.currentLot')}${item.supplier?` · ${item.supplier}`:''}`,reason:item.signal.title,why:item.signal.detail,next:item.signal.action,to:item.path,action:t('home.open'),owner:suggestedOwner(item.path),source:'event_graph' as const})),...dailyDistinct.map((item,index)=>{const to=target(item);return {key:`daily-${item.kind}-${item.reference}-${index}`,score:dailyScore(item.level),reference:item.reference,reason:item.reason,why:item.detail,next:action(item),to,action:action(item),owner:suggestedOwner(to),source:'daily' as const}})].sort((a,b)=>b.score-a.score).slice(0,3)
 const operationalCounts=operational?.counts??{p1:0,p2:0,p3:0},eventGraphOpen=operationalCounts.p1+operationalCounts.p2+operationalCounts.p3,dedupedDaily=Math.max(0,(snapshot?.risk.total??0)-riskItems.filter(item=>item.receptionId&&eventGraphReceptionIds.has(item.receptionId)).length),attention=eventGraphOpen+dedupedDaily,firstPriority=priorities[0]
 const actions=<div className="page-actions"><label className="inline-field">{t('home.date')}<input type="date" value={date} onChange={event=>setDate(event.target.value)}/></label><label className="inline-field">{t('home.plant')}<select value={plantId} onChange={event=>setPlantId(event.target.value)}>{operator?.role==='admin'||accessiblePlants.length>1?<option value="">{t('home.allPlants')}</option>:null}{accessiblePlants.map(plant=><option key={plant.id} value={plant.id}>{plant.name}</option>)}</select></label><button className="button secondary" onClick={()=>void load(date,plantId)}><RefreshCw size={15}/>{t('home.refresh')}</button></div>

 return <><PageHeader eyebrow="Pescamar" title={t('home.title')} description={t('home.description')} actions={actions}/>
 {error?<div className="system-banner error">{error}</div>:null}
 {loading?<div className="system-banner">{t('home.updating')}</div>:null}
 {snapshot?<>
  <section className={`daily-cockpit ${attention?'has-attention':'is-clear'}`} aria-label={t('home.whatHappening')}>
   <div className="daily-cockpit-copy">
    <span className="overline">{t('home.whatHappening')}</span>
    <h2>{attention?t(attention===1?'home.itemToReview':'home.itemsToReview',{count:attention}):t('home.noTasks')}</h2>
    <p>{attention?t('home.reviewCopy'):t('home.clearCopy')}</p>
   </div>
   <div className="daily-status-mark" aria-hidden="true"><span>{attention||'✓'}</span><small>{attention?t('home.reviewStatus'):t('home.upToDate')}</small></div>
  </section>

  <section className="daily-priority" aria-label={t('home.whatDo')}>
   <div className="daily-priority-head"><div><span className="overline">{t('home.whatDo')}</span><h2>{firstPriority?firstPriority.reference:t('home.startOperation')}</h2><p>{firstPriority?firstPriority.reason:t('home.startCopy')}</p></div>{firstPriority?<Link className="button primary" to={firstPriority.to}>{firstPriority.action}<ArrowRight size={15}/></Link>:<Link className="button primary" to="/recepciones">{t('home.registerReception')}<ArrowRight size={15}/></Link>}</div>{firstPriority?<><small className="daily-priority-detail"><b>{t('home.next')}:</b> {firstPriority.next}</small><small className="daily-priority-detail"><b>{t('home.owner')}:</b> {firstPriority.owner}</small>{firstPriority.source==='event_graph'?<small className="daily-priority-detail"><b>{t('home.source')}:</b> {t('home.sourceCurrent')}</small>:null}</>:null}
  </section>

  <section className="daily-clear-context" aria-label={t('home.available')}><div><small>{t('home.currentLots')}</small><b>{t('home.lots',{count:operational?.lots??0})}</b><span>{t('home.liveOperation')}</span></div><div><small>{t('home.dayMovements')}</small><b>{snapshot.receptions.count+snapshot.production.events+snapshot.dispatches.count}</b><span>{t('home.receptions',{count:snapshot.receptions.count})} · {t('home.production',{count:snapshot.production.events})} · {t('home.dispatches',{count:snapshot.dispatches.count})}</span></div><div><small>{t('home.locatedInventory')}</small><b>{kg(snapshot.inventory.locatedKg)}</b><span>{t('home.locatedProduct')}</span></div></section>

  <section className="daily-home-attention" aria-label={t('home.attention')}><div className="section-heading"><div><span className="overline">{t('home.attention')}</span><h2>{priorities.length?t('home.reviewThese'):t('home.nothingNeeds')}</h2></div></div>{priorities.length?<div className="queue-list daily-more-list">{priorities.map((item,index)=><Link className="queue-row" to={item.to} key={item.key}><span className="queue-priority">{index+1}</span><div><b>{item.reference}</b><small>{item.reason}</small><small>{item.next}</small><small>{t('home.owner')}: {item.owner}</small></div><strong>{item.action}</strong><ArrowRight size={15}/></Link>)}</div>:<div className="daily-clear-note"><ShieldCheck size={19}/><div><b>{t('home.noAlerts')}</b><small>{t('home.historyIsolation')}</small></div></div>}</section>

  <nav className="daily-footer-actions" aria-label={t('home.consultation')}><Link className="text-action inline-link" to="/lineage?mode=historical&year=2026">{t('home.viewHistory')}<ArrowRight size={14}/></Link><Link className="text-action inline-link" to="/inicio/detalle">{t('home.viewReports')}<ArrowRight size={14}/></Link><Link className="text-action inline-link" to="/pescamar-ia">{t('home.askAssistant')}<ArrowRight size={14}/></Link></nav>
  <p className="lot360-caveat"><PackageCheck size={13}/> {t('home.historyCaveat')}</p>
 </>:null}</>
}

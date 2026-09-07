import {ArrowRight,Factory} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'
import {Link,useSearchParams} from 'react-router-dom'
import {useAuth} from '../auth'
import {useLot360} from '../components/Lot360Context'
import {PageHeader} from '../components/PageHeader'
import {useLocale} from '../i18n'
import {plants} from '../plants'
import './timeline.css'

type LivePlant={plant_id:string;lots:number|string;received_kg:number|string;produced_kg:number|string;available_kg:number|string}
type HistoricalPlant={historical_key:string;display_name:string;source_rows:number|string;received_kg:number|string|null;quality_rows:number|string;review_rows:number|string;first_date:string|null;last_date:string|null}
type PlantPerformance={plants?:LivePlant[];historicalPlants?:HistoricalPlant[]}
type TimelineEvent={id:string;occurredAt:string;module:string;kind:string;title:string;detail:string;plantId?:string;actor?:string;historical?:boolean;severity?:'normal'|'attention'|'critical';metrics?:Record<string,number|string|null>}
type TimelinePayload={events?:TimelineEvent[]}
type HistoricalRecord={source_row:number;record_status:string;reception_date:string|null;process_date:string|null;production_date:string|null;process_site_original:string|null;lot_code:string|null;supplier_name:string|null;guide_number:string|null;received_kg:number|string|null;data_quality_flags?:string[]|null}
type HistoryPayload={records?:HistoricalRecord[]}

const kg=(value:number|string|null|undefined,locale:'es'|'en')=>`${Number(value??0).toLocaleString(locale==='en'?'en-GB':'es-CL',{maximumFractionDigits:1})} kg`
const date=(value:string|null|undefined,locale:'es'|'en')=>value?new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString(locale==='en'?'en-GB':'es-CL',{day:'2-digit',month:'short',year:'numeric'}):''
const plantKey=(value:string|null|undefined)=>(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\bplanta\b/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
const eventTime=(value:string)=>{const parsed=Date.parse(value);return Number.isFinite(parsed)?parsed:Number.NEGATIVE_INFINITY}

export function ProcessFocus(){
 const {operator}=useAuth()
 const {locale}=useLocale()
 const {openBySourceRow,openLive}=useLot360()
 const [params,setParams]=useSearchParams()
 const [performance,setPerformance]=useState<PlantPerformance|null>(null)
 const [currentEvents,setCurrentEvents]=useState<TimelineEvent[]>([])
 const [historyRecords,setHistoryRecords]=useState<HistoricalRecord[]>([])
 const [timelineFilter,setTimelineFilter]=useState('all')
 const accessible=operator?.role==='admin'?plants:plants.filter(plant=>operator?.plantIds.includes(plant.id))
 const requested=params.get('plantId')??''
 const selected=accessible.find(plant=>plant.id===requested)??(accessible.length===1?accessible[0]:null)
 const hasUrchin=selected?.products.some(product=>/erizo/i.test(product))??false
 useEffect(()=>{let active=true;Promise.all([
  fetch('/api/plant-performance',{cache:'no-store'}).then(async response=>response.ok?response.json():null),
  fetch('/api/timeline',{cache:'no-store'}).then(async response=>response.ok?response.json():null),
  fetch('/api/continuity-events',{cache:'no-store'}).then(async response=>response.ok?response.json():null),
  fetch('/api/history',{cache:'no-store'}).then(async response=>response.ok?response.json():null),
 ]).then(([plantPayload,timelinePayload,continuityPayload,historyPayload])=>{if(!active)return;setPerformance(plantPayload as PlantPerformance|null);setCurrentEvents([...(timelinePayload as TimelinePayload|null)?.events??[],...(continuityPayload as TimelinePayload|null)?.events??[]].filter(event=>!event.historical));setHistoryRecords((historyPayload as HistoryPayload|null)?.records??[])}).catch(()=>{if(active){setPerformance(null);setCurrentEvents([]);setHistoryRecords([])}});return()=>{active=false}},[])
 const live=useMemo(()=>selected?(performance?.plants??[]).find(row=>row.plant_id===selected.id):undefined,[performance,selected])
 const historical=useMemo(()=>selected?(performance?.historicalPlants??[]).find(row=>row.historical_key===selected.id):undefined,[performance,selected])
 const liveLots=Number(live?.lots??0),liveReceived=Number(live?.received_kg??0),liveProduced=Number(live?.produced_kg??0),liveAvailable=Number(live?.available_kg??0)
 const historicalRows=Number(historical?.source_rows??0),historicalReceived=Number(historical?.received_kg??0),historicalQuality=Number(historical?.quality_rows??0),historicalReview=Number(historical?.review_rows??0)
 const hasLiveEvidence=Boolean(live&&(liveLots>0||liveReceived>0||liveProduced>0||liveAvailable>0))
 const hasHistoricalEvidence=Boolean(historical&&historicalRows>0)
 const copy=locale==='en'?{
  eyebrow:'Operations · Process',title:'Process',description:'Each plant operates differently. The system shows only the process context and recorded evidence available for the selected plant.',plant:'Plant',all:'Select a plant',configured:'Configured operation',products:'Products / process scope',empty:'Select a plant to review its configured process scope.',special:'Sea urchin process',specialText:'This plant includes sea urchin in its configured scope. Open the specialized flow only when that product is being processed.',open:'Open sea urchin flow',note:'Process steps, measurements and controls come from the real operation of each plant. They are never copied from another plant.',recorded:'Recorded operation',current:'Current records',history:'Historical records',lots:'Lots',received:'Received',produced:'Produced',available:'Available',quality:'Quality records',review:'Require review',period:'Period',noData:'No plant-specific operating records are linked yet. Only the confirmed plant configuration is shown.',timeline:'Plant activity',timelineText:'A chronological view built only from recorded dates and events. Current operation and historical evidence remain explicitly identified.',allEvents:'All',reception:'Reception',process:'Process',production:'Production',inventory:'Inventory',dispatch:'Dispatch',currentTag:'Current',historyTag:'Historical',noTimeline:'No dated events are linked to this plant yet.',guide:'Guide',supplier:'Supplier',lot:'Lot'
 }:{
  eyebrow:'Operación · Proceso',title:'Proceso',description:'Cada planta opera distinto. El sistema muestra sólo el contexto y la evidencia registrada disponible para la planta seleccionada.',plant:'Planta',all:'Selecciona una planta',configured:'Operación configurada',products:'Productos / alcance de proceso',empty:'Selecciona una planta para revisar su alcance de proceso configurado.',special:'Proceso de erizo',specialText:'Esta planta incluye erizo dentro de su alcance configurado. El flujo especializado se abre sólo cuando corresponde a ese producto.',open:'Abrir proceso de erizo',note:'Las etapas, mediciones y controles vienen de la operación real de cada planta. Nunca se copian desde otra planta.',recorded:'Operación registrada',current:'Registros actuales',history:'Histórico vinculado',lots:'Lotes',received:'Recibido',produced:'Producido',available:'Disponible',quality:'Registros de calidad',review:'Requieren revisión',period:'Período',noData:'Todavía no hay registros operacionales vinculados a esta planta. Se muestra sólo la configuración confirmada.',timeline:'Actividad de planta',timelineText:'Secuencia cronológica construida sólo con fechas y eventos registrados. La operación actual y la evidencia histórica permanecen identificadas por separado.',allEvents:'Todo',reception:'Recepción',process:'Proceso',production:'Producción',inventory:'Inventario',dispatch:'Despacho',currentTag:'Actual',historyTag:'Histórico',noTimeline:'Todavía no hay eventos con fecha vinculados a esta planta.',guide:'Guía',supplier:'Proveedor',lot:'Lote'
 }
 const moduleLabel:Record<string,string>={recepcion:copy.reception,proceso:copy.process,calidad:copy.quality,produccion:copy.production,inventario:copy.inventory,despachos:copy.dispatch}
 const historicalEvents=useMemo(()=>{
  if(!selected)return []
  const events:TimelineEvent[]=[]
  for(const row of historyRecords){
   if(row.record_status!=='operational'||plantKey(row.process_site_original)!==selected.id)continue
   const shared=[row.lot_code?`${copy.lot} ${row.lot_code}`:'',row.supplier_name?`${copy.supplier} ${row.supplier_name}`:'',row.guide_number?`${copy.guide} ${row.guide_number}`:''].filter(Boolean).join(' · ')
   const severity:TimelineEvent['severity']=(row.data_quality_flags?.length??0)>0?'attention':'normal'
   if(row.reception_date)events.push({id:`history-${row.source_row}-reception`,occurredAt:`${String(row.reception_date).slice(0,10)}T12:00:00`,module:'recepcion',kind:'historical-reception',title:row.lot_code||`${copy.reception} #${row.source_row}`,detail:[shared,row.received_kg!=null?kg(row.received_kg,locale):''].filter(Boolean).join(' · '),plantId:selected.id,historical:true,severity,metrics:{sourceRow:row.source_row}})
   if(row.process_date)events.push({id:`history-${row.source_row}-process`,occurredAt:`${String(row.process_date).slice(0,10)}T12:00:00`,module:'proceso',kind:'historical-process',title:row.lot_code||`${copy.process} #${row.source_row}`,detail:shared,plantId:selected.id,historical:true,severity,metrics:{sourceRow:row.source_row}})
   if(row.production_date)events.push({id:`history-${row.source_row}-production`,occurredAt:`${String(row.production_date).slice(0,10)}T12:00:00`,module:'produccion',kind:'historical-production',title:row.lot_code||`${copy.production} #${row.source_row}`,detail:shared,plantId:selected.id,historical:true,severity,metrics:{sourceRow:row.source_row}})
  }
  return events
 },[historyRecords,selected,copy.guide,copy.lot,copy.process,copy.production,copy.reception,copy.supplier,locale])
 const plantTimeline=useMemo(()=>{
  if(!selected)return []
  const allowed=new Set(['recepcion','calidad','produccion','inventario','despachos'])
  const current=currentEvents.filter(event=>event.plantId===selected.id&&allowed.has(event.module))
  return [...current,...historicalEvents].sort((a,b)=>eventTime(b.occurredAt)-eventTime(a.occurredAt)).slice(0,120)
 },[currentEvents,historicalEvents,selected])
 const timelineModules=useMemo(()=>Array.from(new Set(plantTimeline.map(event=>event.module))),[plantTimeline])
 const visibleTimeline=timelineFilter==='all'?plantTimeline:plantTimeline.filter(event=>event.module===timelineFilter)
 const formatTimelineDate=(value:string)=>new Intl.DateTimeFormat(locale==='en'?'en-GB':'es-CL',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value))
 const openEvent=(event:TimelineEvent)=>{const sourceRow=Number(event.metrics?.sourceRow),receptionId=typeof event.metrics?.receptionId==='string'?event.metrics.receptionId:'';if(event.historical&&Number.isFinite(sourceRow))openBySourceRow(sourceRow);else if(receptionId)openLive(receptionId)}
 const changePlant=(plantId:string)=>{const next=new URLSearchParams(params);if(plantId)next.set('plantId',plantId);else next.delete('plantId');setParams(next);setTimelineFilter('all')}
 return <>
  <PageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description} actions={<label className="inline-field">{copy.plant}<select value={selected?.id??''} onChange={event=>changePlant(event.target.value)}><option value="">{copy.all}</option>{accessible.map(plant=><option key={plant.id} value={plant.id}>{plant.name}</option>)}</select></label>}/>
  {!selected?<section className="daily-clear-note"><Factory size={19}/><div><b>{copy.empty}</b><small>{copy.note}</small></div></section>:<>
   <section className="daily-cockpit is-clear" aria-label={copy.configured}><div className="daily-cockpit-copy"><span className="overline">{copy.configured}</span><h2>{selected.name}</h2><p>{selected.location} · {selected.mode}</p></div><div className="daily-status-mark" aria-hidden="true"><Factory size={24}/></div></section>
   <section className="panel"><span className="overline">{copy.products}</span><div className="queue-list">{selected.products.map(product=><div className="queue-row" key={product}><span>—</span><div><b>{product}</b></div></div>)}</div></section>
   {hasLiveEvidence||hasHistoricalEvidence?<section className="panel"><span className="overline">{copy.recorded}</span><div className="signal-grid">{hasLiveEvidence?<><article className="signal-card"><span>{copy.current}</span><b>{liveLots}</b><small>{copy.lots}</small></article>{liveReceived>0?<article className="signal-card"><span>{copy.received}</span><b>{kg(liveReceived,locale)}</b><small>{copy.current}</small></article>:null}{liveProduced>0?<article className="signal-card"><span>{copy.produced}</span><b>{kg(liveProduced,locale)}</b><small>{copy.current}</small></article>:null}{liveAvailable>0?<article className="signal-card"><span>{copy.available}</span><b>{kg(liveAvailable,locale)}</b><small>{copy.current}</small></article>:null}</>:null}{hasHistoricalEvidence?<><article className="signal-card"><span>{copy.history}</span><b>{historicalRows}</b><small>{copy.lots}</small></article>{historicalReceived>0?<article className="signal-card"><span>{copy.received}</span><b>{kg(historicalReceived,locale)}</b><small>{copy.history}</small></article>:null}{historicalQuality>0?<article className="signal-card"><span>{copy.quality}</span><b>{historicalQuality}</b><small>{copy.history}</small></article>:null}{historicalReview>0?<article className="signal-card"><span>{copy.review}</span><b>{historicalReview}</b><small>{copy.history}</small></article>:null}</>:null}</div>{historical?.first_date||historical?.last_date?<div className="notice"><Factory size={16}/><div><b>{copy.period}</b><small>{date(historical.first_date,locale)}{historical.first_date&&historical.last_date?' → ':''}{date(historical.last_date,locale)}</small></div></div>:null}</section>:<div className="notice"><Factory size={16}/><div><b>{copy.noData}</b></div></div>}
   <section className="panel"><div className="panel-header"><div><span className="overline">{copy.timeline}</span><h2>{copy.timeline}</h2><p>{copy.timelineText}</p></div></div>{plantTimeline.length?<><div className="timeline-filters" aria-label={copy.timeline}><button className={timelineFilter==='all'?'active':''} onClick={()=>setTimelineFilter('all')}>{copy.allEvents}</button>{timelineModules.map(module=><button key={module} className={timelineFilter===module?'active':''} onClick={()=>setTimelineFilter(module)}>{moduleLabel[module]??module}</button>)}</div><div className="infinite-timeline"><div className="timeline-spine" aria-hidden="true"/>{visibleTimeline.map(event=>{const sourceRow=Number(event.metrics?.sourceRow),receptionId=typeof event.metrics?.receptionId==='string'?event.metrics.receptionId:'';const navigable=(event.historical&&Number.isFinite(sourceRow))||Boolean(receptionId);return <article key={event.id} className={`timeline-event ${event.historical?'historical':''} ${event.severity??'normal'} ${navigable?'navigable':''}`} onClick={navigable?()=>openEvent(event):undefined} onKeyDown={navigable?key=>{if(key.key==='Enter'||key.key===' '){key.preventDefault();openEvent(event)}}:undefined} role={navigable?'button':undefined} tabIndex={navigable?0:undefined}><span className="timeline-node" aria-hidden="true"/><div className="timeline-event-main"><div className="timeline-event-meta"><span>{moduleLabel[event.module]??event.module}</span><em>{event.historical?copy.historyTag:copy.currentTag}</em></div><h3>{event.title}</h3>{event.detail?<p>{event.detail}</p>:null}</div><time dateTime={event.occurredAt}>{formatTimelineDate(event.occurredAt)}</time></article>})}</div></>:<div className="notice"><Factory size={16}/><div><b>{copy.noTimeline}</b></div></div>}</section>
   {hasUrchin?<section className="daily-priority"><div className="daily-priority-head"><div><span className="overline">{copy.special}</span><h2>{copy.special}</h2><p>{copy.specialText}</p></div><Link className="button primary" to={`/proceso-erizo/detalle?plantId=${encodeURIComponent(selected.id)}`}>{copy.open}<ArrowRight size={15}/></Link></div></section>:null}
   <div className="notice"><Factory size={16}/><div><b>{copy.note}</b></div></div>
  </>}
 </>
}

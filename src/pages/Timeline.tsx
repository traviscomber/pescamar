import {AlertTriangle,ArrowDown,Boxes,CalendarCheck2,CheckCheck,Database,DollarSign,Factory,Landmark,LoaderCircle,PackageSearch,ReceiptText,RefreshCw,Target,Users} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'
import {useLot360} from '../components/Lot360Context'
import {PageHeader} from '../components/PageHeader'
import './timeline.css'

type TimelineEvent={id:string;occurredAt:string;module:string;kind:string;title:string;detail:string;plantId?:string;actor?:string;historical?:boolean;severity?:'normal'|'attention'|'critical';metrics?:Record<string,number|string|null>}
type Continuity={historicalStart:string|null;historicalEnd:string|null;historicalRecords:number;voidRecords:number;live:boolean;total:number}
type Payload={events?:TimelineEvent[];continuity?:Continuity;error?:string}
type ExtraPayload={events?:TimelineEvent[];error?:string}

const moduleLabels:Record<string,string>={recepcion:'Recepción',calidad:'Calidad',produccion:'Producción',decisiones:'Decisiones',creditos:'Créditos',liquidaciones:'Liquidaciones',datos:'Datos',equipo:'Equipo',planificacion:'Planificación',inventario:'Inventario',costos:'Costos',cierre:'Cierre'}
const icons:Record<string,typeof Boxes>={recepcion:Boxes,calidad:AlertTriangle,produccion:Factory,decisiones:CheckCheck,creditos:Landmark,liquidaciones:ReceiptText,datos:Database,equipo:Users,planificacion:Target,inventario:PackageSearch,costos:DollarSign,cierre:CalendarCheck2}
const plantLabels:Record<string,string>={ancud:'Ancud',quellon:'Quellón',iquique:'Iquique','piedra-azul':'Piedra Azul','aqua-austral':'Aqua Austral',natales:'Natales'}

function parseTimelineDate(value:string){
  if(!value)return null
  const direct=new Date(value)
  if(Number.isFinite(direct.getTime()))return direct
  const match=value.trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
  if(!match)return null
  const [,day,month,year,hour='0',minute='0',second='0']=match
  const parsed=new Date(Number(year),Number(month)-1,Number(day),Number(hour),Number(minute),Number(second))
  return Number.isFinite(parsed.getTime())?parsed:null
}
const eventTime=(value:string)=>parseTimelineDate(value)?.getTime()??Number.NEGATIVE_INFINITY
const fmt=(value:string)=>{const date=parseTimelineDate(value);return date?new Intl.DateTimeFormat('es-CL',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(date):'Fecha no disponible'}
const eventYear=(event:TimelineEvent)=>parseTimelineDate(event.occurredAt)?.getFullYear()??(event.historical?2025:null)

async function fetchTimeline(){
  const [baseResponse,extraResponse]=await Promise.all([fetch('/api/timeline',{cache:'no-store'}),fetch('/api/continuity-events',{cache:'no-store'})])
  const base=await baseResponse.json() as Payload,extra=await extraResponse.json() as ExtraPayload
  if(!baseResponse.ok)throw new Error(base.error??'No fue posible cargar la línea operacional')
  if(!extraResponse.ok)throw new Error(extra.error??'No fue posible extender la continuidad')
  return {...base,events:[...(base.events??[]),...(extra.events??[])].sort((a,b)=>eventTime(b.occurredAt)-eventTime(a.occurredAt))}
}

export function Timeline(){
  const {openBySourceRow,openLive}=useLot360()
  const [events,setEvents]=useState<TimelineEvent[]>([]),[continuity,setContinuity]=useState<Continuity|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[filter,setFilter]=useState('all')
  useEffect(()=>{let active=true;fetchTimeline().then(payload=>{if(active){setEvents(payload.events??[]);setContinuity(payload.continuity??null)}}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:'No fue posible cargar la línea operacional')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[])
  async function reload(){setLoading(true);setError('');try{const payload=await fetchTimeline();setEvents(payload.events??[]);setContinuity(payload.continuity??null)}catch(reason){setError(reason instanceof Error?reason.message:'No fue posible cargar la línea operacional')}finally{setLoading(false)}}
  const modules=useMemo(()=>Array.from(new Set(events.map(event=>event.module))),[events])
  const visible=filter==='all'?events:events.filter(event=>event.module===filter)
  const historicalCount=events.filter(event=>event.historical).length,liveCount=events.length-historicalCount
  const openEvent=(event:TimelineEvent)=>{const sourceRow=Number(event.metrics?.sourceRow),receptionId=typeof event.metrics?.receptionId==='string'?event.metrics.receptionId:'';if(event.historical&&Number.isFinite(sourceRow))openBySourceRow(sourceRow);else if(receptionId)openLive(receptionId)}

  return <>
    <PageHeader eyebrow="Memoria operacional" title="Línea de tiempo" description="Una sola secuencia: 2025 como base canónica y, desde la primera recepción nueva, continuidad operativa real."/>
    <section className="timeline-context" aria-label="Estado de continuidad"><div><b>{continuity?.historicalRecords??historicalCount}</b><span>registros canónicos 2025</span></div><div><b>{liveCount}</b><span>eventos vivos posteriores</span></div><small>{continuity?.voidRecords??0} anulado conservado · la historia no se reinicia por año</small></section>
    <section className="timeline-toolbar panel"><div className="timeline-filters" aria-label="Filtrar línea de tiempo"><button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>Todo</button>{modules.map(module=><button key={module} className={filter===module?'active':''} onClick={()=>setFilter(module)}>{moduleLabels[module]??module}</button>)}</div><button className="button secondary timeline-refresh" onClick={()=>void reload()} disabled={loading}><RefreshCw size={14}/>{loading?'Actualizando…':'Actualizar'}</button></section>
    {error?<div className="notice error" role="alert">{error}</div>:null}
    {loading&&!events.length?<div className="panel timeline-loading"><LoaderCircle className="spin"/><span>Cargando continuidad…</span></div>:<section className="infinite-timeline"><div className="timeline-spine" aria-hidden="true"/>{visible.map((event,index)=>{const Icon=icons[event.module]??Database;const previous=visible[index-1];const year=eventYear(event);const previousYear=previous?eventYear(previous):null;const historicalNavigable=event.historical&&Number.isFinite(Number(event.metrics?.sourceRow));const liveNavigable=typeof event.metrics?.receptionId==='string'&&event.metrics.receptionId.length>0;const navigable=historicalNavigable||liveNavigable;return <div key={event.id}>{year!==previousYear?<div className="timeline-year"><span>{year??'Sin fecha'}</span><small>{event.historical?'Base canónica':'Operación viva'}</small></div>:null}<article className={`timeline-event ${event.historical?'historical':''} ${event.severity??'normal'} ${navigable?'navigable':''}`} onClick={navigable?()=>openEvent(event):undefined} onKeyDown={navigable?key=>{if(key.key==='Enter'||key.key===' '){key.preventDefault();openEvent(event)}}:undefined} role={navigable?'button':undefined} tabIndex={navigable?0:undefined} aria-label={navigable?`Abrir ficha 360 de ${String(event.metrics?.lotCode??event.title)}`:undefined}><span className="timeline-node"><Icon size={15}/></span><div className="timeline-event-main"><div className="timeline-event-meta"><span>{moduleLabels[event.module]??event.module}</span>{event.plantId?<span>{plantLabels[event.plantId]??event.plantId}</span>:null}<em>{event.historical?'Canónico 2025':'Operación viva'}</em></div><h3>{event.title}</h3><p>{event.detail}</p>{event.actor?<small>{event.actor}</small>:null}</div><time dateTime={parseTimelineDate(event.occurredAt)?.toISOString()}>{fmt(event.occurredAt)}</time></article></div>})}<div className="timeline-origin"><ArrowDown size={16}/><div><b>Origen canónico</b><small>394 filas de 2025: 393 operacionales y un registro anulado, conservados sin fabricar datos faltantes.</small></div></div></section>}
  </>
}

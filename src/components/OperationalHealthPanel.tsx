import {Activity,AlertTriangle,ArrowRight,CheckCircle2,Clock3,Database,Eye,MessageCircleMore,ShieldAlert} from 'lucide-react'
import {useCallback,useEffect,useMemo,useState} from 'react'
import {Link} from 'react-router-dom'
import {canAccessPath} from '../access'
import {useAuth} from '../auth'
import './operational-health.css'

type Health='healthy'|'degraded'|'stuck'|'broken'
type Check={key:string;label:string;status:Health;detail:string;metrics?:Record<string,number|string|null|boolean>}
type Alert={id:string;severity:'critical'|'warning'|'info';domain:'data'|'traceability'|'vision'|'process'|'communications'|'platform';title:string;detail:string;actionPath:string}
type Payload={ok?:boolean;status?:Health;summary?:{checks:number;healthy:number;degraded:number;stuck:number;broken:number;critical:number;warnings:number};checks?:Check[];alerts?:Alert[];method?:{version:string;staleProcessHours:number;scheduledHealthCheck:boolean};deployment?:{environment:string;commit:string|null};checkedAt?:string;error?:string}

const statusLabel:Record<Health,string>={healthy:'Saludable',degraded:'Degradado',stuck:'Atascado',broken:'Roto'}
const severityRank:Record<Alert['severity'],number>={critical:0,warning:1,info:2}
const isoTimestamp=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

function HealthIcon({status,size=16}:{status:Health;size?:number}){if(status==='healthy')return <CheckCircle2 size={size}/>;if(status==='stuck'||status==='broken')return <ShieldAlert size={size}/>;return <AlertTriangle size={size}/>}
function DomainIcon({domain,size=15}:{domain:Alert['domain'];size?:number}){if(domain==='vision')return <Eye size={size}/>;if(domain==='communications')return <MessageCircleMore size={size}/>;if(domain==='data')return <Database size={size}/>;if(domain==='process')return <Clock3 size={size}/>;return <AlertTriangle size={size}/>}
function localizedTimestamp(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat('es-CL',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'America/Santiago'}).format(date)}
function metricValue(value:number|string|null|boolean){if(value==null)return '—';if(typeof value==='boolean')return value?'Sí':'No';if(typeof value==='number')return new Intl.NumberFormat('es-CL',{maximumFractionDigits:1}).format(value);if(isoTimestamp.test(value))return localizedTimestamp(value);return value}
function healthVersion(value?:string){return value?.match(/v\d+/i)?.[0]??'v1'}
function shortCommit(value:string|null|undefined){return value?value.slice(0,8):'commit —'}

export function OperationalHealthPanel({expanded=false}:{expanded?:boolean}){
 const {operator}=useAuth(),[data,setData]=useState<Payload|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true)
 const load=useCallback(async(silent=false)=>{if(!silent)setLoading(true);try{const response=await fetch('/api/operational-health',{cache:'no-store'}),payload=await response.json() as Payload;if(!response.ok||!payload.ok)throw new Error(payload.error??'No fue posible calcular salud operacional');setData(payload);setError('')}catch(cause){setError(cause instanceof Error?cause.message:'No fue posible calcular salud operacional')}finally{if(!silent)setLoading(false)}},[])
 useEffect(()=>{void load();const refresh=()=>void load(true),timer=window.setInterval(()=>{if(document.visibilityState==='visible')refresh()},30000);window.addEventListener('pescamar:data-updated',refresh);window.addEventListener('focus',refresh);return()=>{window.clearInterval(timer);window.removeEventListener('pescamar:data-updated',refresh);window.removeEventListener('focus',refresh)}},[load])
 const alerts=useMemo(()=>[...(data?.alerts??[])].sort((a,b)=>severityRank[a.severity]-severityRank[b.severity]),[data?.alerts])
 if(loading&&!data)return <section className="panel operational-health loading"><Activity size={18}/><div><b>Calculando salud operacional</b><small>Fuentes, trazabilidad, Vision, procesos y comunicaciones.</small></div></section>
 if(error&&!data)return <section className="panel operational-health error"><AlertTriangle size={18}/><div><b>Observabilidad no disponible</b><small>{error}</small></div></section>
 if(!data?.status)return null
 const shownAlerts=expanded?alerts:alerts.filter(item=>item.severity!=='info').slice(0,3),shownChecks=expanded?(data.checks??[]):(data.checks??[]).filter(item=>item.status!=='healthy').slice(0,4)
 const canOpen=operator?canAccessPath(operator.role,'/observabilidad'):false
 return <section className={`operational-health ${expanded?'expanded':''}`} aria-label="Observabilidad operacional" aria-live="polite">
  <div className={`operational-health-hero ${data.status}`}><div className="operational-health-title"><HealthIcon status={data.status} size={20}/><div><span className="overline">Observabilidad</span><h2>{statusLabel[data.status]} · {data.summary?.critical??0} críticas · {data.summary?.warnings??0} advertencias</h2><p>{data.status==='healthy'?'Los subsistemas observados no presentan excepciones activas.':'La plataforma sigue operativa, pero hay excepciones concretas que requieren atención.'}</p></div></div><div className="operational-health-meta"><span>Health {healthVersion(data.method?.version)}</span><b title={data.deployment?.commit??undefined}>{shortCommit(data.deployment?.commit)}</b><small>{data.checkedAt?localizedTimestamp(data.checkedAt):'—'}</small></div></div>
  <div className="operational-health-summary"><article><CheckCircle2 size={15}/><div><small>Saludables</small><b>{data.summary?.healthy??0}</b></div></article><article><AlertTriangle size={15}/><div><small>Degradados</small><b>{data.summary?.degraded??0}</b></div></article><article><ShieldAlert size={15}/><div><small>Atascados / rotos</small><b>{(data.summary?.stuck??0)+(data.summary?.broken??0)}</b></div></article><article><Clock3 size={15}/><div><small>Supervisión</small><b>{data.method?.scheduledHealthCheck?'Programada':'Live'}</b></div></article></div>
  {shownAlerts.length?<div className="operational-alert-list">{shownAlerts.map(alert=>{const allowed=operator&&canAccessPath(operator.role,alert.actionPath);const content=<><span className={`operational-alert-icon ${alert.severity}`}><DomainIcon domain={alert.domain}/></span><div><small>{alert.domain}</small><b>{alert.title}</b><span>{alert.detail}</span></div>{allowed?<ArrowRight size={15}/>:null}</>;return allowed?<Link key={alert.id} className={`operational-alert ${alert.severity}`} to={alert.actionPath}>{content}</Link>:<div key={alert.id} className={`operational-alert ${alert.severity}`}>{content}</div>})}</div>:<div className="operational-health-clear"><CheckCircle2 size={16}/><span>Sin alertas operacionales activas.</span></div>}
  {shownChecks.length?<div className="operational-check-grid">{shownChecks.map(check=><article key={check.key} className={`operational-check ${check.status}`}><header><HealthIcon status={check.status}/><div><small>{statusLabel[check.status]}</small><b>{check.label}</b></div></header><p>{check.detail}</p>{expanded&&check.metrics?<dl>{Object.entries(check.metrics).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{metricValue(value)}</dd></div>)}</dl>:null}</article>)}</div>:null}
  {!expanded&&canOpen?<div className="operational-health-footer"><Link to="/observabilidad">Abrir control plane <ArrowRight size={14}/></Link></div>:null}
 </section>
}
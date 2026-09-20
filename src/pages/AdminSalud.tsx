import {Activity,AlertTriangle,CheckCircle2,LoaderCircle} from 'lucide-react'
import {useCallback,useEffect,useState} from 'react'
import {PageHeader} from '../components/PageHeader'
import {usePlatformStatus} from '../hooks/usePlatformStatus'
import './admin-salud.css'

type LiveState={phase:'checking'}|{phase:'ok';httpStatus:number;checkedAt:string;latencyMs:number}|{phase:'down';httpStatus:number|null;latencyMs:number}

const POLL_MS=30_000

function localizedTimestamp(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat('es-CL',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'America/Santiago'}).format(date)}

function DeploymentPanel(){
 const {status,error}=usePlatformStatus()
 return <section className="panel admin-health-panel" aria-label="Información de despliegue">
  <header><span className="overline teal">Despliegue</span><h2>Build y entorno</h2></header>
  {status?<dl className="admin-health-facts">
   <div><dt>Entorno</dt><dd>{status.environment}</dd></div>
   <div><dt>Commit</dt><dd>{status.commit??'No expuesto por el build'}</dd></div>
   <div><dt>Plataforma</dt><dd>{status.platform}</dd></div>
   <div><dt>Reportado</dt><dd>{localizedTimestamp(status.checkedAt)}</dd></div>
  </dl>:error?<p className="admin-health-empty">No fue posible leer la información de despliegue desde el servidor.</p>:<p className="admin-health-empty"><LoaderCircle className="spin" size={15}/>Comprobando despliegue…</p>}
 </section>
}

function PublicHealthMonitor(){
 const [state,setState]=useState<LiveState>({phase:'checking'})
 const check=useCallback(async()=>{
  const started=performance.now()
  const latencyMs=()=>Math.max(1,Math.round(performance.now()-started))
  try{
   const response=await fetch('/api/public-health',{cache:'no-store'})
   const payload=await response.json().catch(()=>null) as {ok?:boolean;checkedAt?:string}|null
   if(response.ok&&payload?.ok)setState({phase:'ok',httpStatus:response.status,checkedAt:payload.checkedAt??new Date().toISOString(),latencyMs:latencyMs()})
   else setState({phase:'down',httpStatus:response.status,latencyMs:latencyMs()})
  }catch{setState({phase:'down',httpStatus:null,latencyMs:latencyMs()})}
 },[])
 useEffect(()=>{
  void check()
  const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void check()},POLL_MS)
  return()=>window.clearInterval(timer)
 },[check])
 const label=state.phase==='checking'?'Comprobando':state.phase==='ok'?'Operativa':'Caída'
 const Icon=state.phase==='checking'?LoaderCircle:state.phase==='ok'?CheckCircle2:AlertTriangle
 return <section className="panel admin-health-panel" aria-label="Estado en vivo del servicio público" aria-live="polite">
  <header><span className="overline teal">Liveness</span><h2>Estado en vivo del servicio</h2></header>
  <div className={`admin-health-chip ${state.phase}`}><Icon size={16} className={state.phase==='checking'?'spin':''}/><b>{label}</b></div>
  <dl className="admin-health-facts">
   <div><dt>HTTP</dt><dd>{state.phase==='checking'?'—':state.httpStatus??'Sin respuesta'}</dd></div>
   <div><dt>checkedAt</dt><dd>{state.phase==='ok'?localizedTimestamp(state.checkedAt):'—'}</dd></div>
   <div><dt>Latencia</dt><dd>{state.phase==='checking'?'—':`${state.latencyMs} ms`}</dd></div>
   <div><dt>Consulta</dt><dd>Cada 30 s · misma sesión</dd></div>
  </dl>
 </section>
}

export function AdminSalud(){
 return <>
  <PageHeader eyebrow="Configuración" title="Salud de producción" description="Vista interna del estado de producción para el equipo: build desplegado y liveness del servicio público, medidos con tu propia sesión."/>
  <div className="admin-health-grid">
   <DeploymentPanel/>
   <PublicHealthMonitor/>
  </div>
  <p className="admin-health-note"><Activity size={14}/>Un monitor externo de liveness corre cada hora desde fuera de Vercel y alerta ante cualquier caída; esta página complementa esa supervisión con el estado en vivo desde tu sesión.</p>
 </>
}

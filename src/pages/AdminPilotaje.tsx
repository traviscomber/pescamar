import {Info,LoaderCircle} from 'lucide-react'
import {useEffect,useState} from 'react'
import {PageHeader} from '../components/PageHeader'
import './admin-pilotaje.css'

type RouteRow={path:string;visits_7d:number;operators_7d:number;visits_30d:number;operators_30d:number}
type DailyRow={day:string;operators:number}
type EventRow={created_at:string;operator_id:string;operator_name:string|null;role:string;event:string;path:string}
type DownRow={created_at:string;operator_name:string|null;comment:string|null;question:string;answer:string}
type Insights={ok:boolean;generatedAt:string;routes:RouteRow[];dailyActive:DailyRow[];latestEvents:EventRow[];feedback:{total:number;up:number;down:number;pctUp:number;recentDowns:DownRow[]}}
type LoadState={phase:'loading'}|{phase:'error'}|{phase:'ready';data:Insights}

function localizedTimestamp(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat('es-CL',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'America/Santiago'}).format(date)}
function localizedDay(value:string){const date=new Date(`${value}T12:00:00`);return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat('es-CL',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'America/Santiago'}).format(date)}
function operatorLabel(event:EventRow){return event.operator_name??event.operator_id.slice(0,8)}

function RoutesPanel({data}:{data:Insights}){
 return <section className="panel admin-pilot-panel" aria-label="Visitas por ruta">
  <header><span className="overline teal">Rutas</span><h2>Visitas por ruta</h2></header>
  {data.routes.length?<>
   <dl className="admin-pilot-facts">
    <div><dt>Rutas activas · 30 días</dt><dd>{data.routes.length}</dd></div>
    <div><dt>Visitas · 7 días</dt><dd>{data.routes.reduce((sum,row)=>sum+row.visits_7d,0)}</dd></div>
    <div><dt>Visitas · 30 días</dt><dd>{data.routes.reduce((sum,row)=>sum+row.visits_30d,0)}</dd></div>
   </dl>
   <table className="admin-pilot-table">
    <thead><tr><th scope="col">Ruta</th><th scope="col" className="num">Visitas 7 d</th><th scope="col" className="num">Operadores 7 d</th><th scope="col" className="num">Visitas 30 d</th><th scope="col" className="num">Operadores 30 d</th></tr></thead>
    <tbody>{data.routes.map(row=><tr key={row.path}><td>{row.path}</td><td className="num">{row.visits_7d}</td><td className="num">{row.operators_7d}</td><td className="num">{row.visits_30d}</td><td className="num">{row.operators_30d}</td></tr>)}</tbody>
   </table>
  </>:<p className="admin-pilot-empty">Aún no hay rutas visitadas en los últimos 30 días.</p>}
 </section>
}

function DailyActivePanel({data}:{data:Insights}){
 return <section className="panel admin-pilot-panel" aria-label="Operadores activos por día">
  <header><span className="overline teal">Adopción</span><h2>Operadores activos por día</h2></header>
  {data.dailyActive.length?<>
   <dl className="admin-pilot-facts"><div><dt>Promedio · 14 días</dt><dd>{(data.dailyActive.reduce((sum,row)=>sum+row.operators,0)/data.dailyActive.length).toFixed(1)}</dd></div><div><dt>Pico</dt><dd>{Math.max(...data.dailyActive.map(row=>row.operators))}</dd></div><div><dt>Días con datos</dt><dd>{data.dailyActive.length}</dd></div></dl>
   <table className="admin-pilot-table">
    <thead><tr><th scope="col">Día</th><th scope="col" className="num">Operadores</th></tr></thead>
    <tbody>{data.dailyActive.map(row=><tr key={row.day}><td>{localizedDay(row.day)}</td><td className="num">{row.operators}</td></tr>)}</tbody>
   </table>
  </>:<p className="admin-pilot-empty">Aún no hay actividad en los últimos 14 días.</p>}
 </section>
}

function LatestEventsPanel({data}:{data:Insights}){
 return <section className="panel admin-pilot-panel" aria-label="Últimos eventos">
  <header><span className="overline teal">Eventos</span><h2>Últimos {Math.min(50,data.latestEvents.length)} eventos</h2></header>
  {data.latestEvents.length?<ul className="admin-pilot-feed">
   {data.latestEvents.map((event,index)=><li key={`${event.created_at}-${index}`}>
    <time dateTime={event.created_at}>{localizedTimestamp(event.created_at)}</time>
    <span className="who">{operatorLabel(event)} · {event.role}</span>
    <span className="what">{event.path}</span>
   </li>)}
  </ul>:<p className="admin-pilot-empty">Aún no hay eventos registrados.</p>}
 </section>
}

function FeedbackPanel({data}:{data:Insights}){
 const {feedback}=data
 return <section className="panel admin-pilot-panel" aria-label="Feedback de Seafood AI">
  <header><span className="overline teal">Seafood AI</span><h2>Feedback de calidad</h2></header>
  <dl className="admin-pilot-facts">
   <div><dt>Votos totales</dt><dd>{feedback.total}</dd></div>
   <div><dt>A favor</dt><dd>{feedback.up} · {feedback.pctUp}%</dd></div>
   <div><dt>En contra</dt><dd>{feedback.down}</dd></div>
  </dl>
  {feedback.recentDowns.length?<>
   <h3 className="admin-pilot-down-title">Últimas respuestas en contra</h3>
   <ul className="admin-pilot-down">
    {feedback.recentDowns.map((row,index)=><li key={`${row.created_at}-${index}`}>
     <p className="ctx">{localizedTimestamp(row.created_at)}{row.operator_name?` · ${row.operator_name}`:''}{row.comment?` · ${row.comment}`:''}</p>
     <p className="q">{row.question}</p>
     <p className="a">{row.answer}</p>
    </li>)}
   </ul>
  </>:<p className="admin-pilot-empty">Sin votos en contra registrados.</p>}
 </section>
}

export function AdminPilotaje(){
 const [state,setState]=useState<LoadState>({phase:'loading'})
 useEffect(()=>{
  let cancelled=false
  const load=async()=>{
   try{
    const response=await fetch('/api/pilot-insights',{cache:'no-store'})
    const payload=await response.json().catch(()=>null) as Insights|null
    if(!cancelled)setState(response.ok&&payload?.ok?{phase:'ready',data:payload}:{phase:'error'})
   }catch{if(!cancelled)setState({phase:'error'})}
  }
  void load()
  return()=>{cancelled=true}
 },[])
 return <>
  <PageHeader eyebrow="Configuración" title="Pilotaje" description="Telemetría de fricción del pilotaje: rutas visitadas, operadores activos y feedback de Seafood AI, medidos con evidencia mínima y sin tocar datos operacionales."/>
  {state.phase==='loading'?<p className="admin-pilot-empty"><LoaderCircle size={15}/>Cargando insights de pilotaje…</p>:state.phase==='error'?<p className="admin-pilot-empty" role="alert">No fue posible leer la telemetría de pilotaje desde el servidor.</p>:<>
   <div className="admin-pilot-grid">
    <RoutesPanel data={state.data}/>
    <DailyActivePanel data={state.data}/>
   </div>
   <div className="admin-pilot-grid">
    <LatestEventsPanel data={state.data}/>
    <FeedbackPanel data={state.data}/>
   </div>
  </>}
  <p className="admin-pilot-note"><Info size={14}/>Estos datos son la fuente que dispara el criterio de reactivación de UX: cuando la fricción medida aquí baje sostenidamente, se reactiva la iteración de producto. La telemetría registra sólo la ruta visitada, nunca query strings, y el rol siempre se toma de la sesión en el servidor.</p>
 </>
}

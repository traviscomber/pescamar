import { AlertTriangle, CheckCircle2, LockKeyhole, LogOut, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import "./security-audit.css";

type Summary={successful_logins:number;failed_logins:number;logouts:number;active_blocks:number};
type Event={event_type:string;occurred_at:string;operator_name:string|null;metadata?:Record<string,unknown>};
type Payload={summary?:Summary;events?:Event[];error?:string};

const labels:Record<string,string>={login_success:"Inicio correcto",login_failure:"Intento fallido",login_rate_limited:"Acceso bloqueado",logout:"Cierre de sesión"};

export function SecurityAudit(){
  const [summary,setSummary]=useState<Summary|null>(null);
  const [events,setEvents]=useState<Event[]>([]);
  const [error,setError]=useState("");
  useEffect(()=>{
    let active=true;
    fetch("/api/security-audit").then(async response=>{
      const payload=await response.json() as Payload;
      if(!response.ok)throw new Error(payload.error??"No fue posible cargar la auditoría");
      if(active){setSummary(payload.summary??null);setEvents(payload.events??[])}
    }).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:"No fue posible cargar la auditoría")});
    return()=>{active=false};
  },[]);
  return <section className="panel security-audit">
    <header className="panel-header"><div><span className="overline teal">Seguridad de acceso</span><h2>Actividad de autenticación</h2><p>Resumen de las últimas 24 horas y eventos recientes. No se muestran direcciones IP ni identificadores sensibles.</p></div><ShieldCheck/></header>
    {error?<p className="form-error" role="alert">{error}</p>:null}
    <div className="security-scorecards">
      <article><CheckCircle2/><span><small>Ingresos correctos</small><b>{summary?.successful_logins??0}</b></span></article>
      <article><AlertTriangle/><span><small>Intentos fallidos</small><b>{summary?.failed_logins??0}</b></span></article>
      <article><LockKeyhole/><span><small>Bloqueos activos</small><b>{summary?.active_blocks??0}</b></span></article>
      <article><LogOut/><span><small>Cierres de sesión</small><b>{summary?.logouts??0}</b></span></article>
    </div>
    <div className="security-events">
      {events.length?events.map((event,index)=><article key={`${event.occurred_at}-${index}`}><span className={`security-event-dot ${event.event_type}`}/><div><b>{labels[event.event_type]??event.event_type}</b><small>{event.operator_name??"Identidad no confirmada"}</small></div><time>{new Date(event.occurred_at).toLocaleString("es-CL",{dateStyle:"short",timeStyle:"short"})}</time></article>):<div className="security-empty"><ShieldCheck size={18}/>Sin eventos registrados todavía.</div>}
    </div>
  </section>
}

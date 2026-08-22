import {ArrowRight,CheckCheck,FileSpreadsheet,Plus} from "lucide-react";
import {Link} from "react-router-dom";
import {canAccessPath,canCreateReception} from "../access";
import {useAuth} from "../auth";
import {PageHeader} from "../components/PageHeader";
import {usePlatformStatus} from "../hooks/usePlatformStatus";
import {canonicalKpis} from "../canonical2025";
import type {Lot} from "../types";

export function Dashboard({lots,onNewReception}:{lots:Lot[];onNewReception:()=>void}){
  const {operator}=useAuth();
  const {status,error}=usePlatformStatus();
  const pending=status?.metrics.pendingDecisions??0;
  const reviewCount=lots.filter(lot=>lot.status==="Revisión"||lot.status==="Alerta calibre").length;
  const platformIssue=Boolean(error)||Boolean(status&&(!status.ok||!status.persistence.database));
  const mayCreate=operator?canCreateReception(operator.role):false;
  const mayApprove=operator?canAccessPath(operator.role,"/aprobaciones"):false;
  const mayConfigure=operator?canAccessPath(operator.role,"/modulos"):false;
  return <>
    <PageHeader eyebrow="Centro de mando" title="Operación de hoy" description="Qué necesita atención, por qué y cuál es la siguiente decisión." actions={mayCreate?<button className="button primary" onClick={onNewReception}><Plus size={15}/>Nueva recepción</button>:undefined}/>
    <section className={`command-deck ${pending||reviewCount?"":"idle"}`} aria-labelledby="command-title"><div className="command-copy"><span className="system-label">N3 SYS // CONTROL POR EXCEPCIÓN</span><h2 id="command-title">{pending?`${pending}${pending===1?" decisión requiere":" decisiones requieren"} criterio humano.`:"No hay decisiones operacionales pendientes."}</h2><p>{mayApprove?"La bandeja reúne únicamente decisiones compatibles con tu rol y alcance de plantas.":"Tu sesión muestra la operación autorizada sin exponer decisiones reservadas a otros roles."}</p>{mayApprove?<Link className="command-action" to="/aprobaciones"><CheckCheck size={17}/>{pending?"Revisar siguiente decisión":"Abrir bandeja"}<ArrowRight size={16}/></Link>:null}</div>
      {pending||reviewCount||(status?.metrics.pendingCredits??0)?<div className="command-metrics" aria-label="Resumen operacional">{pending?<Metric label="Pendientes" value={pending} detail="Dentro de tu alcance"/>:null}{reviewCount?<Metric label="Recepciones" value={reviewCount} detail="En revisión"/>:null}{(status?.metrics.pendingCredits??0)?<Metric label="Anticipos" value={status?.metrics.pendingCredits??0} detail="Esperando decisión"/>:null}</div>:null}
    </section>
    {platformIssue?<section className="system-alert" role="alert"><span className="health-pulse"/><p><b>La plataforma requiere revisión</b><small>Comprueba la conexión antes de continuar.</small></p>{mayConfigure?<Link to="/modulos">Ver configuración <ArrowRight size={14}/></Link>:null}</section>:null}
    <section className="secondary-action"><div><span className="overline">Histórico y control</span><p>Consulta la evidencia auditada sin mezclarla con la operación de hoy.</p></div><Link className="source-link compact" to="/operacion-2025"><FileSpreadsheet size={14}/>Fuente 2025 · {canonicalKpis.records} registros auditados</Link></section>
  </>;
}
function Metric({label,value,detail}:{label:string;value:number;detail:string}){return <div><small>{label}</small><b>{value}</b><span>{detail}</span></div>}

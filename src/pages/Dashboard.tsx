import {AlertTriangle,ArrowRight,CheckCheck,History,Info,Plus,RefreshCw,Scale} from "lucide-react";
import {useCallback,useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {canAccessPath,canCreateReception} from "../access";
import {useAuth} from "../auth";
import {useLot360} from "../components/Lot360Context";
import {PageHeader} from "../components/PageHeader";
import {usePlatformStatus} from "../hooks/usePlatformStatus";
import type {Lot} from "../types";

type QueueItem={receptionId:string;receptionNumber:number;plantId:string|null;supplier:string;species:string;lifecycle:string;qualityStatus:string;nextAction:string;priority:'normal'|'attention';receivedAt:string;lastActivityAt:string}
type ManagementAlert={id:string;severity:'critical'|'warning'|'info';kind:string;receptionId?:string;title:string;detail:string}
type Overview={queue?:QueueItem[];alerts?:ManagementAlert[];summary?:{openLots:number;attention:number;liveProductionKg:number;historicalProductionKg:number};inventory?:{summary:{totalKg:number;rawKg:number;processedKg:number}};generatedAt?:string;error?:string}

export function Dashboard({lots,onNewReception}:{lots:Lot[];onNewReception:()=>void}){
  const {operator}=useAuth();
  const {openLive,summary}=useLot360();
  const {status,error}=usePlatformStatus();
  const [overview,setOverview]=useState<Overview|null>(null);
  const [overviewError,setOverviewError]=useState('');
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);

  const loadOverview=useCallback(async(silent=false)=>{
    if(silent)setRefreshing(true);else setLoading(true);
    try{
      const response=await fetch('/api/operations-overview',{cache:'no-store'});
      const payload=await response.json() as Overview;
      if(!response.ok)throw new Error(payload.error??'No fue posible cargar la operación');
      setOverview(payload);
      setOverviewError('');
    }catch(cause){
      setOverviewError(cause instanceof Error?cause.message:'No fue posible cargar la operación');
    }finally{
      setLoading(false);
      setRefreshing(false);
    }
  },[]);

  useEffect(()=>{
    void loadOverview(false);
    const refresh=()=>{if(document.visibilityState==='visible')void loadOverview(true)};
    const interval=window.setInterval(refresh,60_000);
    window.addEventListener('focus',refresh);
    document.addEventListener('visibilitychange',refresh);
    return()=>{window.clearInterval(interval);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh)};
  },[loadOverview]);

  const mayCreate=operator?canCreateReception(operator.role):false;
  const mayConfigure=operator?canAccessPath(operator.role,"/modulos"):false;
  const queue=overview?.queue??[];
  const alerts=overview?.alerts??[];
  const attention=overview?.summary?.attention??0;
  const inventory=overview?.inventory?.summary;
  const liveStarted=lots.length>0;
  const canonicalCount=Number(summary?.total??0);
  const ready=canonicalCount===394&&Boolean(status?.persistence.database)&&Boolean(operator&&(operator.role==='admin'||operator.plantIds.length>0));
  const platformIssue=Boolean(error)||Boolean(status&&(!status.ok||!status.persistence.database));
  const next=queue[0];
  const updatedLabel=overview?.generatedAt?new Intl.DateTimeFormat('es-CL',{hour:'2-digit',minute:'2-digit'}).format(new Date(overview.generatedAt)):null;
  const headerActions=<div className="page-action-group"><button className="button secondary" type="button" onClick={()=>void loadOverview(true)} disabled={refreshing} aria-label="Actualizar estado operacional"><RefreshCw size={15}/>{refreshing?'Actualizando':'Actualizar'}{updatedLabel?<span className="button-meta">{updatedLabel}</span>:null}</button>{mayCreate?<button className="button primary" onClick={onNewReception}><Plus size={15}/>Nueva recepción</button>:null}</div>;

  return <>
    <PageHeader eyebrow="Hoy" title="Operación" description={liveStarted?"Lo importante, en orden de acción.":"2025 conserva la base canónica. La operación viva comienza con la primera recepción real."} actions={headerActions}/>

    {!liveStarted?<section className="operational-start" aria-labelledby="operational-start-title"><div className="operational-start-copy"><span className="overline">Listo para operar</span><h2 id="operational-start-title">La continuidad empieza con una recepción real.</h2><p>La base canónica 2025 permanece intacta. Desde la primera recepción nueva, el mismo lote continúa por Calidad, Producción, Inventario, Costos, Despacho y Venta.</p><div className="operational-start-actions">{mayCreate?<button className="button primary" onClick={onNewReception}><Plus size={15}/>Registrar primera recepción</button>:null}<Link className="button secondary" to="/timeline"><History size={15}/>Ver 2025</Link></div></div><div className="readiness-list"><Readiness ready={canonicalCount===394} label="Base 2025" detail={`${canonicalCount} registros`}/><Readiness ready={Boolean(status?.persistence.database)} label="Base operacional" detail={status?.persistence.database?'Conectada':'Revisar conexión'}/><Readiness ready={ready} current={ready} label="Siguiente paso" detail={ready?'Registrar primera recepción':'Completar preparación'}/></div></section>:loading&&!overview?<section className="panel" aria-live="polite"><div className="empty-inline"><RefreshCw size={20}/><div><b>Sincronizando operación</b><small>Cargando el estado vivo antes de mostrar prioridades.</small></div></div></section>:overviewError&&!overview?<section className="panel" role="alert"><div className="notice error"><AlertTriangle size={15}/><span>{overviewError}</span><button className="button secondary" type="button" onClick={()=>void loadOverview(false)}>Reintentar</button></div></section>:<>
      <section className={`command-deck ${attention?"":"idle"}`} aria-labelledby="command-title"><div className="command-copy"><span className="system-label">SIGUIENTE ACCIÓN</span><h2 id="command-title">{attention?`${attention} excepción${attention===1?' requiere':'es requieren'} atención.`:next?next.nextAction:'Operación al día.'}</h2><p>{next?`REC-${next.receptionNumber} · ${next.supplier} · ${next.species}`:'No hay trabajo vivo pendiente.'}</p>{next?<button className="command-action" onClick={()=>openLive(next.receptionId)}><CheckCheck size={17}/>Abrir lote<ArrowRight size={16}/></button>:<Link className="command-action" to="/recepciones"><Scale size={17}/>Ver recepciones<ArrowRight size={16}/></Link>}</div><div className="command-metrics"><Metric label="Abiertos" value={overview?.summary?.openLots??queue.length}/><Metric label="Alertas" value={attention}/><Metric label="Inventario" value={inventory?Math.round(inventory.totalKg):0} suffix=" kg"/></div></section>

      <section className="panel executive-queue"><div className="section-heading"><div><span className="overline">Trabajo pendiente</span><h2>Qué hacer ahora</h2></div><Link to="/recepciones">Ver todo <ArrowRight size={14}/></Link></div>{queue.length?<div className="queue-list">{queue.slice(0,5).map(item=><button key={item.receptionId} className={`queue-row ${item.priority}`} onClick={()=>openLive(item.receptionId)}><span className="queue-priority">{item.priority==='attention'?<AlertTriangle size={16}/>:<CheckCheck size={16}/>}</span><div><b>REC-{item.receptionNumber} · {item.supplier}</b><small>{item.species} · {item.plantId??'Sin planta'}</small></div><strong>{item.nextAction}</strong><ArrowRight size={15}/></button>)}</div>:<Empty title="Sin trabajo pendiente" detail="La operación viva está al día."/>}</section>

      {alerts.length||overviewError?<section className="panel executive-queue"><div className="section-heading"><div><span className="overline">Excepciones</span><h2>Requieren criterio</h2></div></div>{overviewError?<div className="notice error"><AlertTriangle size={15}/>{overviewError}</div>:<div className="alert-list">{alerts.slice(0,5).map(item=>{const content=<><span className={`alert-icon ${item.severity}`}>{item.severity==='info'?<Info size={16}/>:<AlertTriangle size={16}/>}</span><div><b>{item.title}</b><small>{item.detail}</small></div></>;return item.receptionId?<button key={item.id} className="alert-row" onClick={()=>openLive(item.receptionId!)}>{content}<ArrowRight size={15}/></button>:<div key={item.id} className="alert-row static">{content}<span/></div>})}</div>}</section>:null}
    </>}

    {platformIssue?<section className="system-alert" role="alert"><span className="health-pulse"/><p><b>La plataforma requiere revisión</b><small>Comprueba la conexión antes de continuar.</small></p>{mayConfigure?<Link to="/modulos">Ver configuración <ArrowRight size={14}/></Link>:null}</section>:null}

    <section className="secondary-action"><div><span className="overline">Continuidad</span><p>2025 es la base canónica. Todo dato nuevo continúa la misma historia operacional.</p></div><Link className="source-link compact" to="/timeline"><History size={14}/>Línea de tiempo</Link></section>
  </>;
}

function Metric({label,value,suffix=''}:{label:string;value:number;suffix?:string}){return <div><small>{label}</small><b>{value.toLocaleString('es-CL')}{suffix}</b></div>}
function Readiness({ready,current=false,label,detail}:{ready:boolean;current?:boolean;label:string;detail:string}){return <div className={`readiness-item ${ready?'ready':''} ${current?'current':''}`}><span>{ready?'✓':'○'}</span><div><b>{label}</b><small>{detail}</small></div></div>}
function Empty({title,detail}:{title:string;detail:string}){return <div className="empty-inline"><CheckCheck size={20}/><div><b>{title}</b><small>{detail}</small></div></div>}

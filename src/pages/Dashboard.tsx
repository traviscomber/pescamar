import { AlertTriangle, ArrowRight, Boxes, CheckCheck, Database, FileSpreadsheet, Landmark, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { usePlatformStatus } from '../hooks/usePlatformStatus'
import { canonicalExceptions, canonicalKpis } from '../canonical2025'
import type { Lot } from '../types'

export function Dashboard({lots,onNewReception}:{lots:Lot[];onNewReception:()=>void}){
  const {status,error}=usePlatformStatus()
  const reviewCount=lots.filter(lot=>lot.status==='Revisión'||lot.status==='Alerta calibre').length
  return <><PageHeader eyebrow="Centro de trabajo" title="Operación de hoy" description="Una vista para detectar excepciones, revisar evidencia y resolver únicamente lo que necesita criterio humano." actions={<button className="button primary" onClick={onNewReception}><Plus size={16}/>Nueva recepción</button>}/>
    <section className="today-grid">
      <Link to="/aprobaciones" className="today-card primary-task"><span><CheckCheck/></span><div><small>Decisiones pendientes</small><b>{status?.persistence.database?'Ver bandeja':'Base por conectar'}</b><p>Aprobaciones y rechazos con comentario obligatorio.</p></div><ArrowRight/></Link>
      <Link to="/recepciones" className="today-card"><span><Boxes/></span><div><small>Recepciones registradas</small><b>{lots.length}</b><p>{reviewCount} requieren revisión.</p></div><ArrowRight/></Link>
      <Link to="/creditos" className="today-card"><span><Landmark/></span><div><small>Créditos y anticipos</small><b>{status?.persistence.database?'Fuente conectada':'Sin conexión'}</b><p>Saldos y descuentos desde movimientos reales.</p></div><ArrowRight/></Link>
      <Link to="/importaciones" className="today-card"><span><FileSpreadsheet/></span><div><small>Fuentes operacionales</small><b>{canonicalKpis.records} registros</b><p>Planilla canónica 2025 validada.</p></div><ArrowRight/></Link>
    </section>
    <section className="dashboard-columns"><article className="panel action-panel"><header className="panel-header"><div><span className="overline teal">Atención requerida</span><h2>Hallazgos documentados</h2></div><Link to="/operacion-2025">Ver fuente</Link></header><div className="exception-queue">{canonicalExceptions.map(item=><div key={item.id}><span className={item.severity==='Crítica'?'critical':'attention'}><AlertTriangle/></span><div><b>{item.type}</b><small>{item.lot} · {item.detail}</small></div><em>{item.severity}</em></div>)}</div></article>
      <article className="panel readiness-panel"><span className="overline teal">Preparación del sistema</span><h2>Conexiones operativas</h2><div className="readiness-list"><Status label="Funciones Vercel" ready={Boolean(status?.ok)}/><Status label="PostgreSQL" ready={Boolean(status?.persistence.database)}/><Status label="Archivos y evidencia" ready={Boolean(status?.persistence.files)}/><Status label="Identidad de operadores" ready={false}/></div>{error?<p className="readiness-warning">No fue posible consultar el estado de plataforma.</p>:null}<Link className="button secondary full-button" to="/modulos"><Database size={15}/>Ver configuración</Link></article></section>
  </>
}

function Status({label,ready}:{label:string;ready:boolean}){return <div><i className={ready?'ready':''}/><span>{label}</span><b>{ready?'Conectado':'Pendiente'}</b></div>}

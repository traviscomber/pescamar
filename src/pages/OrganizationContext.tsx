import {Building2,CheckCircle2,Factory,GitBranch,ShieldAlert,ShieldCheck} from 'lucide-react'
import {Link} from 'react-router-dom'
import {PageHeader} from '../components/PageHeader'
import {organizationContext,organizationIsolationLabel} from '../organization'
import {plants} from '../plants'

const portability=[
  ['Product shell','Seafood Intelligence OS ya separa producto global de implementación activa.'],
  ['Event contract','seafood.event.v1 conserva organizationId, siteId, lote y provenance.'],
  ['EdgeVision registry','Las capacidades son globales; los adapters pertenecen a una implementación.'],
  ['Access map','Las rutas mantienen contratos explícitos de rol mientras se prepara membership por organización.'],
] as const

const nextGates=[
  'Persistir organization_id en entidades canónicas nuevas y definir estrategia segura para legado.',
  'Resolver membership organización → usuario → rol → sites desde autenticación, no desde branding.',
  'Aplicar organization scope en consultas y escrituras antes de habilitar una segunda implementación.',
  'Hacer que AI, Event Graph, auditoría y observabilidad hereden el mismo contexto request-scoped.',
  'Mover configuración específica de Pescamar a un adapter/tenant profile sin fork del core.',
] as const

export function OrganizationContext(){
 const activePlants=plants.filter(plant=>plant.active!==false)
 return <><PageHeader eyebrow="Seafood Intelligence OS · Productization" title="Organization Context" description="Frontera explícita entre el producto reusable y la implementación operacional activa. Esta vista no declara multi-tenant hasta que el aislamiento de datos sea verificable." actions={<div className="row-actions"><Link className="button secondary" to="/lineage"><GitBranch size={14}/>Event Graph</Link><Link className="button secondary" to="/edgevision">EdgeVision</Link></div>}/>
 <section className="signal-grid"><article className="signal-card"><span><Building2 size={16}/>Organización</span><b>{organizationContext.organizationId}</b><small>{organizationContext.implementationName}</small></article><article className="signal-card"><span><Factory size={16}/>Sites</span><b>{activePlants.length}</b><small>catálogo operacional activo</small></article><article className="signal-card"><span><ShieldCheck size={16}/>Core portable</span><b>{organizationContext.portableCore?'YES':'NO'}</b><small>producto separado del tenant visual</small></article><article className="signal-card"><span><ShieldAlert size={16}/>Aislamiento</span><b>{organizationContext.isolationMode==='organization_scoped'?'ORG':'LEGACY'}</b><small>{organizationIsolationLabel}</small></article></section>
 <section className="panel"><div className="section-heading"><div><span className="overline teal">Boundary actual</span><h2>{organizationContext.implementationLabel} · {organizationContext.implementationName}</h2></div><span className="status info">{organizationContext.isolationMode}</span></div><div className="governance-note"><ShieldAlert size={19}/><div><b>No se declara multi-tenant todavía</b><p>El contexto de organización ya es explícito y el Event Graph falla cerrado ante una organización distinta, pero el esquema operacional heredado todavía no transporta <code>organization_id</code> de extremo a extremo. No se debe habilitar Implementation 02 sobre la misma base hasta cerrar esa frontera.</p><small>Source system activo: {organizationContext.sourceSystem} · implementationId: {organizationContext.implementationId}</small></div></div></section>
 <section className="panel"><div className="section-heading"><div><span className="overline teal">Portable core</span><h2>Qué ya puede reutilizarse sin renombrar el producto</h2></div></div><div className="compact-ledger">{portability.map(([title,detail])=><div className="alert-row static" key={title}><span><CheckCircle2 size={15}/></span><div><b>{title}</b><small>{detail}</small></div><span className="status success">reusable</span></div>)}</div></section>
 <section className="panel"><div className="section-heading"><div><span className="overline teal">Implementation 02 gates</span><h2>Condiciones antes de conectar otro cliente</h2></div><span>{nextGates.length} gates</span></div><div className="os-stage-modules">{nextGates.map((gate,index)=><div className="alert-row static" key={gate}><span className="os-module-step">{String(index+1).padStart(2,'0')}</span><div><b>{gate}</b><small>{index<3?'P0 · aislamiento':'P1 · productización'}</small></div></div>)}</div></section>
 </>}

import {Activity, ArrowLeft, Building2, ClipboardCheck, Database, Eye, Factory, FileSpreadsheet, History, Link2, Settings2, ShieldCheck, UsersRound} from 'lucide-react'
import {Link,useSearchParams} from 'react-router-dom'
import {canAccessPath} from '../access'
import {useAuth} from '../auth'
import {useLocale} from '../i18n'
import {PageHeader} from '../components/PageHeader'
import {OperatingModel} from './OperatingModel'

type AdminItem={to:string;label:string;description:string;icon:typeof Settings2}
type AdminGroup={label:string;description:string;items:AdminItem[]}

const groupCopies:Record<'es'|'en',AdminGroup[]>={
 es:[
  {label:'Operación y planta',description:'Configura la estructura física y los puntos donde ocurre la operación.',items:[
   {to:'/modulos?view=modelo-operativo',label:'Modelo operativo',description:'Tareas, responsables, automatización y escalamiento.',icon:UsersRound},
   {to:'/plantas',label:'Plantas',description:'Plantas disponibles y estado de puesta en marcha.',icon:Factory},
   {to:'/estaciones',label:'Estaciones y equipos',description:'Puestos, equipos y captura en planta.',icon:Activity},
   {to:'/rollout',label:'Puesta en marcha',description:'Pruebas y habilitación por planta.',icon:ClipboardCheck},
  ]},
  {label:'Control y cumplimiento',description:'Revisa decisiones, respaldos y trazabilidad administrativa.',items:[
   {to:'/auditoria',label:'Auditoría operacional',description:'Quién hizo qué, cuándo y sobre qué registro.',icon:ShieldCheck},
   {to:'/control-regulatorio',label:'Control regulatorio',description:'Estados, bloqueos y liberaciones.',icon:ClipboardCheck},
   {to:'/uni',label:'Revisión visual (Uni)',description:'Captura visual y revisión humana del producto.',icon:Eye},
   {to:'/observabilidad',label:'Estado técnico',description:'Funcionamiento y alertas técnicas del sistema.',icon:Activity},
   {to:'/timeline',label:'Historial operativo',description:'Secuencia histórica de movimientos relevantes.',icon:History},
  ]},
  {label:'Datos y conexiones',description:'Administra archivos, conexiones y datos generales de Pescamar.',items:[
   {to:'/importaciones',label:'Archivos de origen',description:'Archivos auditados y cobertura histórica.',icon:FileSpreadsheet},
   {to:'/integrations',label:'Conexiones',description:'Sensores, archivos y sistemas externos conectados a Pescamar.',icon:Link2},
   {to:'/identidades-gs1',label:'Identidades estándar (GS1)',description:'Códigos de producto, ubicación, empresa y pallet vinculados sólo con evidencia real.',icon:Database},
   {to:'/organization',label:'Organización',description:'Datos generales, alcance y acceso.',icon:Building2},
   {to:'/identidades-plantas',label:'Equivalencias históricas',description:'Correspondencias heredadas que mantienen continuidad.',icon:Database},
  ]},
  {label:'Usuarios y sistema',description:'Gestiona accesos y configuración del sistema.',items:[
   {to:'/operadores',label:'Operadores',description:'Usuarios, roles y plantas asignadas.',icon:UsersRound},
   {to:'/comunicaciones',label:'Comunicaciones',description:'Canales y mensajes operacionales.',icon:Settings2},
  ]},
 ],
 en:[
  {label:'Operations and plant',description:'Configure the physical structure and the points where operations take place.',items:[
   {to:'/modulos?view=modelo-operativo',label:'Operating model',description:'Tasks, ownership, automation and escalation.',icon:UsersRound},
   {to:'/plantas',label:'Plants',description:'Available plants and startup status.',icon:Factory},
   {to:'/estaciones',label:'Stations and equipment',description:'Plant workstations, equipment and capture points.',icon:Activity},
   {to:'/rollout',label:'Go-live readiness',description:'Testing and enablement by plant.',icon:ClipboardCheck},
  ]},
  {label:'Control and compliance',description:'Review decisions, supporting evidence and administrative traceability.',items:[
   {to:'/auditoria',label:'Operational audit',description:'Who did what, when, and on which record.',icon:ShieldCheck},
   {to:'/control-regulatorio',label:'Regulatory control',description:'Status, holds and releases.',icon:ClipboardCheck},
   {to:'/uni',label:'Visual review (Uni)',description:'Visual capture and human product review.',icon:Eye},
   {to:'/observabilidad',label:'Technical status',description:'System operation and technical alerts.',icon:Activity},
   {to:'/timeline',label:'Operational history',description:'Historical sequence of relevant movements.',icon:History},
  ]},
  {label:'Data and connections',description:'Manage source files, connections and general Pescamar data.',items:[
   {to:'/importaciones',label:'Source files',description:'Audited files and historical coverage.',icon:FileSpreadsheet},
   {to:'/integrations',label:'Connections',description:'Sensors, files and external systems connected to Pescamar.',icon:Link2},
   {to:'/identidades-gs1',label:'Standard identities (GS1)',description:'Evidence-backed product, location, company and pallet codes.',icon:Database},
   {to:'/organization',label:'Organization',description:'General data, scope and access.',icon:Building2},
   {to:'/identidades-plantas',label:'Historical equivalences',description:'Inherited mappings that preserve continuity.',icon:Database},
  ]},
  {label:'Users and system',description:'Manage access and system configuration.',items:[
   {to:'/operadores',label:'Operators',description:'Users, roles and assigned plants.',icon:UsersRound},
   {to:'/comunicaciones',label:'Communications',description:'Operational channels and messages.',icon:Settings2},
  ]},
 ]
}

export function Modules(){
 const {operator}=useAuth()
 const {locale}=useLocale()
 const [searchParams]=useSearchParams()
 const groups=groupCopies[locale]
 if(searchParams.get('view')==='modelo-operativo')return <><Link className="admin-back-link" to="/modulos"><ArrowLeft size={15}/> {locale==='en'?'Administration':'Administración'}</Link><OperatingModel/></>
 const visibleGroups=operator?groups.map(group=>({...group,items:group.items.filter(item=>canAccessPath(operator.role,item.to.split('?')[0]))})).filter(group=>group.items.length):[]
 return <>
  <PageHeader eyebrow={locale==='en'?'Administration':'Administración'} title={locale==='en'?'Configuration and control':'Configuración y control'} description={locale==='en'?'Occasional access for system administration. Daily work remains in Today, Operations, Commercial and Intelligence.':'Accesos poco frecuentes para administrar el sistema. El trabajo diario permanece en Hoy, Operación, Comercial e Inteligencia.'}/>
  <section className="admin-hub-grid" aria-label={locale==='en'?'System administration':'Administración del sistema'}>
   {visibleGroups.map(group=><article className="panel admin-hub-group" key={group.label}>
    <header><h2>{group.label}</h2><p>{group.description}</p></header>
    <div className="admin-hub-links">
     {group.items.map(({to,label,description,icon:Icon})=><Link to={to} key={to}><Icon size={17}/><span><b>{label}</b><small>{description}</small></span></Link>)}
    </div>
   </article>)}
  </section>
 </>
}

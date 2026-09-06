import {Activity, Building2, ClipboardCheck, Database, Factory, FileSpreadsheet, History, Link2, Settings2, ShieldCheck, UsersRound} from 'lucide-react'
import {Link} from 'react-router-dom'
import {canAccessPath} from '../access'
import {useAuth} from '../auth'
import {PageHeader} from '../components/PageHeader'

type AdminItem={to:string;label:string;description:string;icon:typeof Settings2}
type AdminGroup={label:string;description:string;items:AdminItem[]}

const groups:AdminGroup[]=[
 {label:'Operación y planta',description:'Configura la estructura física y los puntos donde ocurre la operación.',items:[
  {to:'/plantas',label:'Plantas',description:'Red operacional y estado de activación.',icon:Factory},
  {to:'/estaciones',label:'Estaciones y dispositivos',description:'Puestos, equipos y captura en planta.',icon:Activity},
  {to:'/rollout',label:'Activación',description:'Gates de UAT y habilitación por planta.',icon:ClipboardCheck},
 ]},
 {label:'Control y cumplimiento',description:'Revisa evidencia, decisiones y trazabilidad administrativa.',items:[
  {to:'/auditoria',label:'Auditoría operacional',description:'Quién hizo qué, cuándo y sobre qué registro.',icon:ShieldCheck},
  {to:'/control-regulatorio',label:'Control regulatorio',description:'Estados y bloqueos de cumplimiento.',icon:ClipboardCheck},
  {to:'/observabilidad',label:'Observabilidad',description:'Salud técnica y señales del sistema.',icon:Activity},
  {to:'/timeline',label:'Línea de tiempo',description:'Secuencia histórica de eventos relevantes.',icon:History},
 ]},
 {label:'Datos e integración',description:'Administra fuentes, conectores y contexto de la organización.',items:[
  {to:'/importaciones',label:'Fuentes canónicas',description:'Archivos auditados y cobertura histórica.',icon:FileSpreadsheet},
  {to:'/integrations',label:'Integraciones',description:'Conectores y plano de intercambio de datos.',icon:Link2},
  {to:'/organization',label:'Organización',description:'Contexto de implementación y aislamiento.',icon:Building2},
  {to:'/identidades-plantas',label:'Identidades históricas',description:'Equivalencias y referencias heredadas.',icon:Database},
 ]},
 {label:'Usuarios y sistema',description:'Gestiona acceso y configuración de la instancia.',items:[
  {to:'/operadores',label:'Operadores',description:'Usuarios, roles y alcance operacional.',icon:UsersRound},
  {to:'/comunicaciones',label:'Comunicaciones',description:'Canales y mensajes operacionales.',icon:Settings2},
 ]},
]

export function Modules(){
 const {operator}=useAuth()
 const visibleGroups=operator?groups.map(group=>({...group,items:group.items.filter(item=>canAccessPath(operator.role,item.to))})).filter(group=>group.items.length):[]
 return <>
  <PageHeader eyebrow="Administración" title="Configuración y control" description="Accesos poco frecuentes para administrar la instancia. El trabajo diario permanece en Hoy, Operación, Comercial e Inteligencia."/>
  <section className="admin-hub-grid" aria-label="Administración del sistema">
   {visibleGroups.map(group=><article className="panel admin-hub-group" key={group.label}>
    <header><h2>{group.label}</h2><p>{group.description}</p></header>
    <div className="admin-hub-links">
     {group.items.map(({to,label,description,icon:Icon})=><Link to={to} key={to}><Icon size={17}/><span><b>{label}</b><small>{description}</small></span></Link>)}
    </div>
   </article>)}
  </section>
 </>
}

import {Activity, ArrowLeft, Building2, ClipboardCheck, Database, Eye, Factory, FileSpreadsheet, History, Link2, Settings2, ShieldCheck, UsersRound} from 'lucide-react'
import {Link,useSearchParams} from 'react-router-dom'
import {canAccessPath} from '../access'
import {useAuth} from '../auth'
import {PageHeader} from '../components/PageHeader'
import {OperatingModel} from './OperatingModel'

type AdminItem={to:string;label:string;description:string;icon:typeof Settings2}
type AdminGroup={label:string;description:string;items:AdminItem[]}

const groups:AdminGroup[]=[
 {label:'Operación y planta',description:'Configura la estructura física y los puntos donde ocurre la operación.',items:[
  {to:'/modulos?view=modelo-operativo',label:'Modelo operativo',description:'Tareas, responsables, automatización y escalamiento.',icon:UsersRound},
  {to:'/plantas',label:'Plantas',description:'Plantas disponibles y estado de puesta en marcha.',icon:Factory},
  {to:'/estaciones',label:'Estaciones y equipos',description:'Puestos, equipos y captura en planta.',icon:Activity},
  {to:'/rollout',label:'Puesta en marcha',description:'Pruebas y habilitación por planta.',icon:ClipboardCheck},
 ]},
 {label:'Control y cumplimiento',description:'Revisa decisiones, respaldos y trazabilidad administrativa.',items:[
  {to:'/auditoria',label:'Auditoría operacional',description:'Quién hizo qué, cuándo y sobre qué registro.',icon:ShieldCheck},
  {to:'/control-regulatorio',label:'Control regulatorio',description:'Estados y bloqueos de cumplimiento.',icon:ClipboardCheck},
  {to:'/uni',label:'Uni',description:'Captura visual y revisión del producto.',icon:Eye},
  {to:'/observabilidad',label:'Estado técnico',description:'Funcionamiento y alertas técnicas del sistema.',icon:Activity},
  {to:'/timeline',label:'Línea de tiempo',description:'Secuencia histórica de movimientos relevantes.',icon:History},
 ]},
 {label:'Datos e integración',description:'Administra archivos, conexiones y datos generales de Pescamar.',items:[
  {to:'/importaciones',label:'Archivos de origen',description:'Archivos auditados y cobertura histórica.',icon:FileSpreadsheet},
  {to:'/integrations',label:'Integraciones',description:'Conexiones con otros sistemas y fuentes.',icon:Link2},
  {to:'/organization',label:'Organización',description:'Datos generales, alcance y acceso.',icon:Building2},
  {to:'/identidades-plantas',label:'Identidades históricas',description:'Equivalencias y referencias heredadas.',icon:Database},
 ]},
 {label:'Usuarios y sistema',description:'Gestiona accesos y configuración del sistema.',items:[
  {to:'/operadores',label:'Operadores',description:'Usuarios, roles y plantas asignadas.',icon:UsersRound},
  {to:'/comunicaciones',label:'Comunicaciones',description:'Canales y mensajes operacionales.',icon:Settings2},
 ]},
]

export function Modules(){
 const {operator}=useAuth()
 const [searchParams]=useSearchParams()
 if(searchParams.get('view')==='modelo-operativo')return <><Link className="admin-back-link" to="/modulos"><ArrowLeft size={15}/> Administración</Link><OperatingModel/></>
 const visibleGroups=operator?groups.map(group=>({...group,items:group.items.filter(item=>canAccessPath(operator.role,item.to.split('?')[0]))})).filter(group=>group.items.length):[]
 return <>
  <PageHeader eyebrow="Administración" title="Configuración y control" description="Accesos poco frecuentes para administrar el sistema. El trabajo diario permanece en Hoy, Operación, Comercial e Inteligencia."/>
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

import {Boxes,ClipboardList,Factory,MessageCircleMore,PackageSearch} from 'lucide-react'
import {Link} from 'react-router-dom'

type Current='erizo'|'recepciones'|'inventario'|'planificacion'|'comunicaciones'
type Props={receptionId:string;current:Current}
const items=[
  {id:'recepciones',label:'Ficha 360',path:'/recepciones',icon:Boxes},
  {id:'erizo',label:'Proceso erizo',path:'/proceso-erizo',icon:Factory},
  {id:'inventario',label:'Inventario',path:'/inventario',icon:PackageSearch},
  {id:'planificacion',label:'Planificación',path:'/planificacion',icon:ClipboardList},
  {id:'comunicaciones',label:'Comunicaciones',path:'/comunicaciones',icon:MessageCircleMore},
] as const

export function LotContextBar({receptionId,current}:Props){
  const suffix=`?receptionId=${encodeURIComponent(receptionId)}`
  return <nav className="event-kind-tabs lot-module-links" aria-label="Contexto operativo del lote">
    {items.map(({id,label,path,icon:Icon})=>id===current?<span className="active" key={id}><Icon size={14}/>{label}</span>:<Link key={id} to={`${path}${suffix}`}><Icon size={14}/>{label}</Link>)}
  </nav>
}

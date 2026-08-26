import {ArrowRight,Boxes,CircleDollarSign,ClipboardList,MessageCircleMore,ReceiptText} from 'lucide-react'
import {Link,useSearchParams} from 'react-router-dom'
import {canAccessPath} from '../access'
import {useAuth} from '../auth'

type Props={current:'orders'|'inventory'|'costs'|'settlements'|'communications';receptionId?:string|null;label?:string|null;detail?:string|null}
const modules=[
  {id:'orders',label:'Órdenes',path:'/ordenes-venta',icon:ClipboardList},
  {id:'inventory',label:'Inventario',path:'/inventario',icon:Boxes},
  {id:'costs',label:'Costos',path:'/costos-transformacion',icon:CircleDollarSign},
  {id:'settlements',label:'Liquidación',path:'/liquidaciones',icon:ReceiptText},
  {id:'communications',label:'Comunicaciones',path:'/comunicaciones',icon:MessageCircleMore},
] as const

export function LotModuleContext({current,receptionId:provided,label,detail}:Props){
  const {operator}=useAuth()
  const [params]=useSearchParams()
  const receptionId=provided??params.get('receptionId')
  if(!receptionId)return null
  return <section className="panel lot-module-context" aria-label="Continuidad del lote entre módulos">
    <div className="section-heading"><div><span className="overline">Contexto de lote</span><h2>{label??'Lote seleccionado'}</h2>{detail?<small>{detail}</small>:null}</div><Link className="button secondary" to={`/recepciones?receptionId=${encodeURIComponent(receptionId)}`}>Ficha 360 <ArrowRight size={14}/></Link></div>
    <div className="event-kind-tabs lot-module-links">{modules.map(module=>{
      if(operator&&!canAccessPath(operator.role,module.path))return null
      const Icon=module.icon
      return module.id===current?<span key={module.id} className="active"><Icon size={14}/>{module.label}</span>:<Link key={module.id} to={`${module.path}?receptionId=${encodeURIComponent(receptionId)}`}><Icon size={14}/>{module.label}</Link>
    })}</div>
  </section>
}

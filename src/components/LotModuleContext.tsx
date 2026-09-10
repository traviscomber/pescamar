import {ArrowRight,Boxes,CircleDollarSign,ClipboardList,FlaskConical,MessageCircleMore,ReceiptText} from 'lucide-react'
import {Link,useSearchParams} from 'react-router-dom'
import {canAccessPath} from '../access'
import {useAuth} from '../auth'
import {useLocale} from '../i18n'

type Props={current:'orders'|'inventory'|'costs'|'settlements'|'communications'|'erizo';receptionId?:string|null;label?:string|null;detail?:string|null}
const modules=[
  {id:'orders',es:'Órdenes',en:'Orders',path:'/ordenes-venta',icon:ClipboardList},
  {id:'erizo',es:'Proceso erizo',en:'Sea urchin process',path:'/proceso-erizo',icon:FlaskConical},
  {id:'inventory',es:'Inventario',en:'Inventory',path:'/inventario',icon:Boxes},
  {id:'costs',es:'Costos',en:'Costs',path:'/costos-transformacion',icon:CircleDollarSign},
  {id:'settlements',es:'Liquidación',en:'Settlement',path:'/liquidaciones',icon:ReceiptText},
  {id:'communications',es:'Comunicaciones',en:'Communications',path:'/comunicaciones',icon:MessageCircleMore},
] as const

export function LotModuleContext({current,receptionId:provided,label,detail}:Props){
  const {operator}=useAuth()
  const {locale}=useLocale()
  const [params]=useSearchParams()
  const receptionId=provided??params.get('receptionId')
  if(!receptionId)return null
  const isEs=locale==='es'
  return <section className="panel lot-module-context" aria-label={isEs?'Continuidad del lote entre módulos':'Lot continuity across modules'}>
    <div className="section-heading"><div><span className="overline">{isEs?'Contexto de lote':'Lot context'}</span><h2>{label??(isEs?'Lote seleccionado':'Selected lot')}</h2>{detail?<small>{detail}</small>:null}</div><Link className="button secondary" to={`/recepciones?receptionId=${encodeURIComponent(receptionId)}`}>360 record <ArrowRight size={14}/></Link></div>
    <div className="event-kind-tabs lot-module-links">{modules.map(module=>{
      if(operator&&!canAccessPath(operator.role,module.path))return null
      const Icon=module.icon
      const moduleLabel=isEs?module.es:module.en
      return module.id===current?<span key={module.id} className="active"><Icon size={14}/>{moduleLabel}</span>:<Link key={module.id} to={`${module.path}?receptionId=${encodeURIComponent(receptionId)}`}><Icon size={14}/>{moduleLabel}</Link>
    })}</div>
  </section>
}

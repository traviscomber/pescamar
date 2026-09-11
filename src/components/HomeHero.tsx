import {ArrowRight,RefreshCw} from 'lucide-react'
import {Link} from 'react-router-dom'

type Plant={id:string;name:string}
type Props={
 locale:'es'|'en'
 date:string
 plantId:string
 plantName:string
 plants:Plant[]
 showAllPlants:boolean
 attention:number
 lots:number
 movements:number
 inventoryLabel:string
 onDate:(value:string)=>void
 onPlant:(value:string)=>void
 onRefresh:()=>void
 primaryTo:string
 primaryLabel:string
}

export function HomeHero(props:Props){
 const copy=props.locale==='es'?{
  brand:'PESCAMAR CHILE',kicker:'SEAFOOD INTELLIGENCE OS',title:'Operación de hoy',attention:props.attention===0?'Operación bajo control':`${props.attention} ${props.attention===1?'asunto requiere':'asuntos requieren'} atención`,sub:'Pesca artesanal conectada con trazabilidad, evidencia y control operacional.',date:'Fecha',plant:'Planta',all:'Todas las plantas',refresh:'Actualizar',lots:'Lotes activos',movements:'Movimientos hoy',inventory:'Inventario ubicado',live:'operación viva',flow:'recepción · proceso · despacho',available:'disponible para operar'
 }:{
  brand:'PESCAMAR CHILE',kicker:'SEAFOOD INTELLIGENCE OS',title:'Today’s operation',attention:props.attention===0?'Operation under control':`${props.attention} ${props.attention===1?'item needs':'items need'} attention`,sub:'Artisanal fishing connected with traceability, evidence and operational control.',date:'Date',plant:'Plant',all:'All plants',refresh:'Refresh',lots:'Active lots',movements:'Movements today',inventory:'Located inventory',live:'live operation',flow:'reception · process · dispatch',available:'available to operate'
 }
 return <section className="pescamar-home-hero" aria-labelledby="pescamar-home-title">
  <div className="pescamar-home-media" aria-hidden="true">
   <img src="/assets/pescamar-hero-artesanal.webp" alt="" decoding="async" fetchPriority="high"/>
   <div className="pescamar-home-tech-layer">
    <span className="tech-chip tech-chip-zone">ZONA DE PESCA · TRAZABILIDAD</span>
    <span className="tech-chip tech-chip-lot">LOTE ACTIVO · ORIGEN VERIFICADO</span>
    <span className="tech-pulse"/>
   </div>
  </div>
  <div className="pescamar-home-copy">
   <div className="pescamar-home-brand"><strong>{copy.brand}</strong><span/><small>{copy.kicker}</small></div>
   <span className="pescamar-home-kicker">{copy.kicker}</span>
   <h1 id="pescamar-home-title">{copy.title}</h1>
   <p className="pescamar-home-date">{props.plantName} · {props.date}</p>
   <p className="pescamar-home-alert"><b>{props.attention||'✓'}</b> {copy.attention}</p>
   <p className="pescamar-home-sub">{copy.sub}</p>
   <div className="pescamar-home-actions">
    <Link className="button primary" to={props.primaryTo}>{props.primaryLabel}<ArrowRight size={15}/></Link>
    <label className="inline-field">{copy.date}<input type="date" value={props.date} onChange={event=>props.onDate(event.target.value)}/></label>
    <label className="inline-field">{copy.plant}<select value={props.plantId} onChange={event=>props.onPlant(event.target.value)}>{props.showAllPlants?<option value="">{copy.all}</option>:null}{props.plants.map(plant=><option key={plant.id} value={plant.id}>{plant.name}</option>)}</select></label>
    <button className="button secondary" onClick={props.onRefresh} aria-label={copy.refresh}><RefreshCw size={15}/></button>
   </div>
  </div>
  <div className="pescamar-home-stats" aria-label="Estado operacional">
   <div><small>{copy.lots}</small><b>{props.lots}</b><span>{copy.live}</span></div>
   <div><small>{copy.movements}</small><b>{props.movements}</b><span>{copy.flow}</span></div>
   <div><small>{copy.inventory}</small><b>{props.inventoryLabel}</b><span>{copy.available}</span></div>
  </div>
 </section>
}

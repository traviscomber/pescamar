import {RefreshCw} from 'lucide-react'

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
 compact?:boolean
 onDate:(value:string)=>void
 onPlant:(value:string)=>void
 onRefresh:()=>void
}

export function HomeHero(props:Props){
 const copy=props.locale==='es'?{
  title:props.compact?'Hoy':'Operación de hoy',attention:props.attention===0?'Operación bajo control':`${props.attention} ${props.attention===1?'asunto requiere':'asuntos requieren'} atención`,sub:props.compact?'Seafood AI resume lo relevante; abre sólo la acción que requiere decisión.':'Trazabilidad, evidencia y control operacional.',date:'Fecha',plant:'Planta',all:'Todas las plantas',refresh:'Actualizar',lots:'Lotes activos',movements:'Movimientos hoy',inventory:'Inventario ubicado',live:'operación viva',flow:'recepción · proceso · despacho',available:'disponible para operar'
 }:{
  title:props.compact?'Today':'Today’s operation',attention:props.attention===0?'Operation under control':`${props.attention} ${props.attention===1?'item needs':'items need'} attention`,sub:props.compact?'Seafood AI summarizes what matters and surfaces only decisions that need action.':'Traceability, evidence and operational control.',date:'Date',plant:'Plant',all:'All plants',refresh:'Refresh',lots:'Active lots',movements:'Movements today',inventory:'Located inventory',live:'live operation',flow:'reception · process · dispatch',available:'available to operate'
 }
 return <section className={`pescamar-home-hero${props.compact?' pescamar-home-hero-compact':''}`} aria-labelledby="pescamar-home-title">
  <div className="pescamar-home-copy">
   <h1 id="pescamar-home-title">{copy.title}</h1>
   <p className="pescamar-home-date">{props.plantName} · {props.date}</p>
   <p className="pescamar-home-alert"><b>{props.attention||'✓'}</b> {copy.attention}</p>
   <p className="pescamar-home-sub">{copy.sub}</p>
   <div className="pescamar-home-actions">
    {!props.compact?<label className="inline-field">{copy.date}<input id="home-hero-date" name="homeHeroDate" type="date" value={props.date} onChange={event=>props.onDate(event.target.value)}/></label>:null}
    {(!props.compact||props.showAllPlants)?<label className="inline-field">{copy.plant}<select id="home-hero-plant" name="homeHeroPlant" value={props.plantId} onChange={event=>props.onPlant(event.target.value)}>{props.showAllPlants?<option value="">{copy.all}</option>:null}{props.plants.map(plant=><option key={plant.id} value={plant.id}>{plant.name}</option>)}</select></label>:null}
    <button className="button secondary" onClick={props.onRefresh} aria-label={copy.refresh}><RefreshCw size={15}/></button>
   </div>
  </div>
  {!props.compact?<div className="pescamar-home-stats" aria-label="Estado operacional">
   <div><small>{copy.lots}</small><b>{props.lots}</b><span>{copy.live}</span></div>
   <div><small>{copy.movements}</small><b>{props.movements}</b><span>{copy.flow}</span></div>
   <div><small>{copy.inventory}</small><b>{props.inventoryLabel}</b><span>{copy.available}</span></div>
  </div>:null}
 </section>
}

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

function ArtisanFleetVisual(){
 return <svg className="pescamar-home-visual" viewBox="0 0 900 520" role="img" aria-label="Flota artesanal conectada a la operación Pescamar">
  <path className="artisan-mountain-2" d="M0 212 92 155 142 188 221 118 294 182 365 139 430 193 501 127 574 185 642 145 711 198 790 156 900 211V260H0Z"/>
  <path className="artisan-mountain" d="M0 238 116 178 168 218 253 149 335 224 427 166 515 227 610 174 684 223 775 182 900 235V282H0Z"/>
  <path className="artisan-water" d="M0 255h900v265H0z"/>
  <path className="artisan-water-2" d="M0 330c115-22 165 24 278 4 116-20 172-12 270 8 106 22 221-11 352-3v181H0Z"/>
  <path className="artisan-tech-line" d="M55 285c146 25 251-24 392 5s255 19 398-9M92 365c145-31 260 29 404 5s242-13 330 2M174 443c111-28 229 22 346-2s196-18 284 4"/>
  <g transform="translate(518 210)">
   <path className="artisan-boat-hull" d="M17 128h276l-35 61H62L22 153Z"/>
   <path className="artisan-boat-trim" d="M25 132h263l-7 16H32Z"/>
   <path className="artisan-boat-dark" d="M134 76h74v53h-74z"/>
   <path className="artisan-boat-hull" d="M144 86h48v34h-48z"/>
   <rect className="artisan-boat-dark" x="155" y="94" width="14" height="13" rx="1"/>
   <rect className="artisan-boat-dark" x="173" y="94" width="14" height="13" rx="1"/>
   <path className="artisan-boat-dark" d="M177 20h5v66h-5zM180 23l38 44h-5l-33-35zM179 28l-45 48h6l39-39z"/>
   <path className="artisan-boat-warm" d="M71 112c13-15 29-17 44 0l-3 18H76Z"/>
   <circle cx="91" cy="102" r="8" fill="#c9dbe3"/>
   <path d="M233 117c12-14 27-16 41 0l-4 14h-34Z" fill="#6e7f57"/>
   <circle cx="253" cy="107" r="7" fill="#d4e0e4"/>
  </g>
  <g transform="translate(205 280) scale(.55)">
   <path className="artisan-boat-hull" d="M17 128h276l-35 61H62L22 153Z"/>
   <path className="artisan-boat-trim" d="M25 132h263l-7 16H32Z"/>
   <path className="artisan-boat-dark" d="M134 76h74v53h-74z"/>
   <path className="artisan-boat-hull" d="M144 86h48v34h-48z"/>
   <path className="artisan-boat-dark" d="M177 20h5v66h-5zM180 23l38 44h-5l-33-35z"/>
  </g>
  <g className="artisan-tech-line">
   <circle cx="696" cy="319" r="124"/><circle cx="696" cy="319" r="96"/><path d="M696 171v296M548 319h296"/>
   <path d="M694 194h43l18 18M696 447h-52l-16-16M579 261h-37l-17 17"/>
   <circle cx="737" cy="194" r="3" fill="#76a6c7"/><circle cx="628" cy="431" r="3" fill="#76a6c7"/><circle cx="525" cy="278" r="3" fill="#76a6c7"/>
  </g>
  <g fill="#9fc4dc" fontFamily="Montserrat, sans-serif" fontSize="10" letterSpacing="2">
   <text x="742" y="190">LIVE LOT</text><text x="553" y="274">ORIGEN</text><text x="635" y="452">TRAZA</text>
  </g>
 </svg>
}

export function HomeHero(props:Props){
 const copy=props.locale==='es'?{
  brand:'PESCAMAR CHILE',kicker:'SEAFOOD INTELLIGENCE OS',title:'Operación de hoy',attention:props.attention===0?'Operación bajo control':`${props.attention} ${props.attention===1?'asunto requiere':'asuntos requieren'} atención`,sub:'Pesca artesanal conectada con trazabilidad, evidencia y control operacional.',date:'Fecha',plant:'Planta',all:'Todas las plantas',refresh:'Actualizar',lots:'Lotes activos',movements:'Movimientos hoy',inventory:'Inventario ubicado',live:'operación viva',flow:'recepción · proceso · despacho',available:'disponible para operar'
 }:{
  brand:'PESCAMAR CHILE',kicker:'SEAFOOD INTELLIGENCE OS',title:'Today’s operation',attention:props.attention===0?'Operation under control':`${props.attention} ${props.attention===1?'item needs':'items need'} attention`,sub:'Artisanal fishing connected with traceability, evidence and operational control.',date:'Date',plant:'Plant',all:'All plants',refresh:'Refresh',lots:'Active lots',movements:'Movements today',inventory:'Located inventory',live:'live operation',flow:'reception · process · dispatch',available:'available to operate'
 }
 return <section className="pescamar-home-hero" aria-labelledby="pescamar-home-title">
  <ArtisanFleetVisual/>
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

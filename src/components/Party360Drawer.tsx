import {Building2,Handshake,Landmark,MapPin,Pencil,Scale,UserRound,X} from 'lucide-react'
import './historical-lot-drawer.css'

export type Party360Party={id:string;kind:'supplier'|'customer';legal_name:string;tax_id:string|null;phone:string|null;contact_name:string|null;email:string|null;address:string|null;city:string|null;country:string|null;payment_terms:string|null;notes:string|null;tags:string[]}
export type Party360Metric={supplier_id?:string;customer_id?:string;supplier?:string;customer?:string;receptions?:number;received_kg?:number;sold_kg?:number;revenue_clp?:number;contribution_clp?:number;contribution_pct?:number}

const kg=(value:number|null|undefined)=>value==null?'—':`${Number(value).toLocaleString('es-CL',{maximumFractionDigits:1})} kg`
const clp=(value:number|null|undefined)=>value==null?'—':new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(value))
const pct=(value:number|null|undefined)=>value==null?'—':`${Number(value).toLocaleString('es-CL',{maximumFractionDigits:1})}%`
const has=(value:unknown)=>value!==null&&value!==undefined&&value!==''

export function Party360Drawer({party,metric,canEdit,onClose,onEdit}:{party:Party360Party|null;metric?:Party360Metric;canEdit:boolean;onClose:()=>void;onEdit:()=>void}){
 if(!party)return null
 const location=[party.city,party.country].filter(Boolean).join(' · ')
 const activity=party.kind==='supplier'
  ?[
    has(metric?.receptions)?{label:'Recepciones',value:Number(metric?.receptions).toLocaleString('es-CL')}:null,
    has(metric?.received_kg)?{label:'Kg recibidos',value:kg(metric?.received_kg)}:null,
    has(metric?.contribution_clp)?{label:'Contribución',value:clp(metric?.contribution_clp)}:null,
    has(metric?.contribution_pct)?{label:'Contribución',value:pct(metric?.contribution_pct)}:null,
   ].filter(Boolean) as Array<{label:string;value:string}>
  :[
    has(metric?.sold_kg)?{label:'Kg vendidos',value:kg(metric?.sold_kg)}:null,
    has(metric?.revenue_clp)?{label:'Ventas',value:clp(metric?.revenue_clp)}:null,
    has(metric?.contribution_clp)?{label:'Contribución',value:clp(metric?.contribution_clp)}:null,
    has(metric?.contribution_pct)?{label:'Contribución',value:pct(metric?.contribution_pct)}:null,
   ].filter(Boolean) as Array<{label:string;value:string}>
 return <div className="lot-drawer-backdrop" role="presentation" onMouseDown={event=>{if(event.currentTarget===event.target)onClose()}}>
  <aside className="lot-drawer" role="dialog" aria-modal="true" aria-label={`Ficha de ${party.legal_name}`}>
   <header className="lot-drawer-header"><div><span className="overline teal">{party.kind==='supplier'?'Proveedor':'Cliente'}</span><h2>{party.legal_name}</h2><p>{location||'Pescamar'}</p></div><button className="icon-button" onClick={onClose} aria-label="Cerrar ficha"><X size={20}/></button></header>
   <section className="lot-section"><div className="lot-section-title"><Building2 size={18}/><h3>Identidad</h3></div><div className="lot-facts">{has(party.tax_id)?<div><small>RUT / Tax ID</small><b>{party.tax_id}</b></div>:null}{has(party.contact_name)?<div><small>Contacto</small><b>{party.contact_name}</b></div>:null}{has(party.payment_terms)?<div><small>Condiciones de pago</small><b>{party.payment_terms}</b></div>:null}{has(party.phone)?<div><small>Teléfono</small><b>{party.phone}</b></div>:null}{has(party.email)?<div><small>Email</small><b>{party.email}</b></div>:null}{location?<div><small>Ubicación</small><b>{location}</b></div>:null}</div></section>
   {activity.length?<section className="lot-section"><div className="lot-section-title"><Scale size={18}/><h3>Actividad resumida</h3></div><div className="lot-kpis">{activity.map(item=><div key={`${item.label}-${item.value}`}><small>{item.label}</small><b>{item.value}</b></div>)}</div></section>:null}
   <section className="lot-section"><div className="lot-section-title"><Handshake size={18}/><h3>Relación comercial</h3></div><dl className="lot-details">{has(party.address)?<div><dt>Dirección</dt><dd>{party.address}</dd></div>:null}{has(party.notes)?<div><dt>Notas</dt><dd>{party.notes}</dd></div>:null}{party.tags?.length?<div><dt>Etiquetas</dt><dd>{party.tags.join(' · ')}</dd></div>:null}</dl>{!party.address&&!party.notes&&!party.tags?.length?<p className="source-note">Sin información comercial adicional registrada.</p>:null}</section>
   <section className="lot-section"><div className="lot-section-title"><Landmark size={18}/><h3>Qué sabemos</h3></div><p className="source-note">Esta ficha resume sólo la información registrada para esta contraparte. Los campos ausentes se mantienen ausentes.</p></section>
   {canEdit?<div className="page-actions"><button className="button primary" type="button" onClick={onEdit}><Pencil size={15}/>Editar ficha</button></div>:null}
  </aside>
 </div>
}

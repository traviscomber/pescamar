import {ArrowRight,Factory} from 'lucide-react'
import {Link,useSearchParams} from 'react-router-dom'
import {useAuth} from '../auth'
import {PageHeader} from '../components/PageHeader'
import {useLocale} from '../i18n'
import {plants} from '../plants'

export function ProcessFocus(){
 const {operator}=useAuth()
 const {locale}=useLocale()
 const [params,setParams]=useSearchParams()
 const accessible=operator?.role==='admin'?plants:plants.filter(plant=>operator?.plantIds.includes(plant.id))
 const requested=params.get('plantId')??''
 const selected=accessible.find(plant=>plant.id===requested)??(accessible.length===1?accessible[0]:null)
 const hasUrchin=selected?.products.some(product=>/erizo/i.test(product))??false
 const copy=locale==='en'?{
  eyebrow:'Operations · Process',title:'Process',description:'Each plant operates differently. The system shows only the process context configured for the selected plant.',plant:'Plant',all:'Select a plant',configured:'Configured operation',products:'Products / process scope',empty:'Select a plant to review its configured process scope.',special:'Sea urchin process',specialText:'This plant includes sea urchin in its configured scope. Open the specialized flow only when that product is being processed.',open:'Open sea urchin flow',note:'Process steps, measurements and controls must come from the real plant operation. They are not assumed from another plant.'
 }:{
  eyebrow:'Operación · Proceso',title:'Proceso',description:'Cada planta opera distinto. El sistema muestra sólo el contexto de proceso configurado para la planta seleccionada.',plant:'Planta',all:'Selecciona una planta',configured:'Operación configurada',products:'Productos / alcance de proceso',empty:'Selecciona una planta para revisar su alcance de proceso configurado.',special:'Proceso de erizo',specialText:'Esta planta incluye erizo dentro de su alcance configurado. El flujo especializado se abre sólo cuando corresponde a ese producto.',open:'Abrir proceso de erizo',note:'Las etapas, mediciones y controles deben venir de la operación real de cada planta. No se heredan por defecto desde otra planta.'
 }
 const changePlant=(plantId:string)=>{const next=new URLSearchParams(params);if(plantId)next.set('plantId',plantId);else next.delete('plantId');setParams(next)}
 return <>
  <PageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description} actions={<label className="inline-field">{copy.plant}<select value={selected?.id??''} onChange={event=>changePlant(event.target.value)}><option value="">{copy.all}</option>{accessible.map(plant=><option key={plant.id} value={plant.id}>{plant.name}</option>)}</select></label>}/>
  {!selected?<section className="daily-clear-note"><Factory size={19}/><div><b>{copy.empty}</b><small>{copy.note}</small></div></section>:<>
   <section className="daily-cockpit is-clear" aria-label={copy.configured}><div className="daily-cockpit-copy"><span className="overline">{copy.configured}</span><h2>{selected.name}</h2><p>{selected.location} · {selected.mode}</p></div><div className="daily-status-mark" aria-hidden="true"><Factory size={24}/></div></section>
   <section className="panel"><span className="overline">{copy.products}</span><div className="queue-list">{selected.products.map(product=><div className="queue-row" key={product}><span>—</span><div><b>{product}</b></div></div>)}</div></section>
   {hasUrchin?<section className="daily-priority"><div className="daily-priority-head"><div><span className="overline">{copy.special}</span><h2>{copy.special}</h2><p>{copy.specialText}</p></div><Link className="button primary" to={`/proceso-erizo?plantId=${encodeURIComponent(selected.id)}`}>{copy.open}<ArrowRight size={15}/></Link></div></section>:null}
   <div className="notice"><Factory size={16}/><div><b>{copy.note}</b></div></div>
  </>}
 </>
}

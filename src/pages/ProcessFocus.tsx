import {ArrowRight,Factory} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'
import {Link,useSearchParams} from 'react-router-dom'
import {useAuth} from '../auth'
import {PageHeader} from '../components/PageHeader'
import {useLocale} from '../i18n'
import {plants} from '../plants'

type LivePlant={plant_id:string;lots:number|string;received_kg:number|string;produced_kg:number|string;available_kg:number|string}
type HistoricalPlant={historical_key:string;display_name:string;source_rows:number|string;received_kg:number|string|null;quality_rows:number|string;review_rows:number|string;first_date:string|null;last_date:string|null}
type PlantPerformance={plants?:LivePlant[];historicalPlants?:HistoricalPlant[]}

const kg=(value:number|string|null|undefined)=>`${Number(value??0).toLocaleString('es-CL',{maximumFractionDigits:1})} kg`
const date=(value:string|null|undefined)=>value?new Date(value).toLocaleDateString('es-CL',{day:'2-digit',month:'short',year:'numeric'}):''

export function ProcessFocus(){
 const {operator}=useAuth()
 const {locale}=useLocale()
 const [params,setParams]=useSearchParams()
 const [performance,setPerformance]=useState<PlantPerformance|null>(null)
 const accessible=operator?.role==='admin'?plants:plants.filter(plant=>operator?.plantIds.includes(plant.id))
 const requested=params.get('plantId')??''
 const selected=accessible.find(plant=>plant.id===requested)??(accessible.length===1?accessible[0]:null)
 const hasUrchin=selected?.products.some(product=>/erizo/i.test(product))??false
 useEffect(()=>{let active=true;fetch('/api/plant-performance',{cache:'no-store'}).then(async response=>response.ok?response.json():null).then(payload=>{if(active)setPerformance(payload as PlantPerformance|null)}).catch(()=>{if(active)setPerformance(null)});return()=>{active=false}},[])
 const live=useMemo(()=>selected?(performance?.plants??[]).find(row=>row.plant_id===selected.id):undefined,[performance,selected])
 const historical=useMemo(()=>selected?(performance?.historicalPlants??[]).find(row=>row.historical_key===selected.id):undefined,[performance,selected])
 const liveLots=Number(live?.lots??0),liveReceived=Number(live?.received_kg??0),liveProduced=Number(live?.produced_kg??0),liveAvailable=Number(live?.available_kg??0)
 const historicalRows=Number(historical?.source_rows??0),historicalReceived=Number(historical?.received_kg??0),historicalQuality=Number(historical?.quality_rows??0),historicalReview=Number(historical?.review_rows??0)
 const hasLiveEvidence=Boolean(live&&(liveLots>0||liveReceived>0||liveProduced>0||liveAvailable>0))
 const hasHistoricalEvidence=Boolean(historical&&historicalRows>0)
 const copy=locale==='en'?{
  eyebrow:'Operations · Process',title:'Process',description:'Each plant operates differently. The system shows only the process context and recorded evidence available for the selected plant.',plant:'Plant',all:'Select a plant',configured:'Configured operation',products:'Products / process scope',empty:'Select a plant to review its configured process scope.',special:'Sea urchin process',specialText:'This plant includes sea urchin in its configured scope. Open the specialized flow only when that product is being processed.',open:'Open sea urchin flow',note:'Process steps, measurements and controls come from the real operation of each plant. They are never copied from another plant.',recorded:'Recorded operation',current:'Current records',history:'Historical records',lots:'Lots',received:'Received',produced:'Produced',available:'Available',quality:'Quality records',review:'Require review',period:'Period',noData:'No plant-specific operating records are linked yet. Only the confirmed plant configuration is shown.'
 }:{
  eyebrow:'Operación · Proceso',title:'Proceso',description:'Cada planta opera distinto. El sistema muestra sólo el contexto y la evidencia registrada disponible para la planta seleccionada.',plant:'Planta',all:'Selecciona una planta',configured:'Operación configurada',products:'Productos / alcance de proceso',empty:'Selecciona una planta para revisar su alcance de proceso configurado.',special:'Proceso de erizo',specialText:'Esta planta incluye erizo dentro de su alcance configurado. El flujo especializado se abre sólo cuando corresponde a ese producto.',open:'Abrir proceso de erizo',note:'Las etapas, mediciones y controles vienen de la operación real de cada planta. Nunca se copian desde otra planta.',recorded:'Operación registrada',current:'Registros actuales',history:'Histórico vinculado',lots:'Lotes',received:'Recibido',produced:'Producido',available:'Disponible',quality:'Registros de calidad',review:'Requieren revisión',period:'Período',noData:'Todavía no hay registros operacionales vinculados a esta planta. Se muestra sólo la configuración confirmada.'
 }
 const changePlant=(plantId:string)=>{const next=new URLSearchParams(params);if(plantId)next.set('plantId',plantId);else next.delete('plantId');setParams(next)}
 return <>
  <PageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description} actions={<label className="inline-field">{copy.plant}<select value={selected?.id??''} onChange={event=>changePlant(event.target.value)}><option value="">{copy.all}</option>{accessible.map(plant=><option key={plant.id} value={plant.id}>{plant.name}</option>)}</select></label>}/>
  {!selected?<section className="daily-clear-note"><Factory size={19}/><div><b>{copy.empty}</b><small>{copy.note}</small></div></section>:<>
   <section className="daily-cockpit is-clear" aria-label={copy.configured}><div className="daily-cockpit-copy"><span className="overline">{copy.configured}</span><h2>{selected.name}</h2><p>{selected.location} · {selected.mode}</p></div><div className="daily-status-mark" aria-hidden="true"><Factory size={24}/></div></section>
   <section className="panel"><span className="overline">{copy.products}</span><div className="queue-list">{selected.products.map(product=><div className="queue-row" key={product}><span>—</span><div><b>{product}</b></div></div>)}</div></section>
   {hasLiveEvidence||hasHistoricalEvidence?<section className="panel"><span className="overline">{copy.recorded}</span><div className="signal-grid">{hasLiveEvidence?<><article className="signal-card"><span>{copy.current}</span><b>{liveLots}</b><small>{copy.lots}</small></article>{liveReceived>0?<article className="signal-card"><span>{copy.received}</span><b>{kg(liveReceived)}</b><small>{copy.current}</small></article>:null}{liveProduced>0?<article className="signal-card"><span>{copy.produced}</span><b>{kg(liveProduced)}</b><small>{copy.current}</small></article>:null}{liveAvailable>0?<article className="signal-card"><span>{copy.available}</span><b>{kg(liveAvailable)}</b><small>{copy.current}</small></article>:null}</>:null}{hasHistoricalEvidence?<><article className="signal-card"><span>{copy.history}</span><b>{historicalRows}</b><small>{copy.lots}</small></article>{historicalReceived>0?<article className="signal-card"><span>{copy.received}</span><b>{kg(historicalReceived)}</b><small>{copy.history}</small></article>:null}{historicalQuality>0?<article className="signal-card"><span>{copy.quality}</span><b>{historicalQuality}</b><small>{copy.history}</small></article>:null}{historicalReview>0?<article className="signal-card"><span>{copy.review}</span><b>{historicalReview}</b><small>{copy.history}</small></article>:null}</>:null}</div>{historical?.first_date||historical?.last_date?<div className="notice"><Factory size={16}/><div><b>{copy.period}</b><small>{date(historical.first_date)}{historical.first_date&&historical.last_date?' → ':''}{date(historical.last_date)}</small></div></div>:null}</section>:<div className="notice"><Factory size={16}/><div><b>{copy.noData}</b></div></div>}
   {hasUrchin?<section className="daily-priority"><div className="daily-priority-head"><div><span className="overline">{copy.special}</span><h2>{copy.special}</h2><p>{copy.specialText}</p></div><Link className="button primary" to={`/proceso-erizo/detalle?plantId=${encodeURIComponent(selected.id)}`}>{copy.open}<ArrowRight size={15}/></Link></div></section>:null}
   <div className="notice"><Factory size={16}/><div><b>{copy.note}</b></div></div>
  </>}
 </>
}

import {AlertTriangle,ArrowRight,Factory,Layers3,ShieldCheck,ShoppingCart} from 'lucide-react'
import {useCallback,useEffect,useMemo,useState} from 'react'
import {Link} from 'react-router-dom'
import {canAccessPath} from '../access'
import {useAuth} from '../auth'
import {normalizeSupplier,purchaseDecisionFor,purchaseScoreFor} from '../supplierDecision'
import './executive-decision-brief.css'

type ScoreSupplier={supplier:string;score:number|null;confidence:'alta'|'media'|'baja';coverage:number;components?:Array<{key:string;weight:number;score:number|null}>}
type ScorePayload={suppliers?:ScoreSupplier[];error?:string}
type EconomicSupplier={supplier:string;score:number|null}
type EconomicPayload={suppliers?:EconomicSupplier[]}
type SupportSupplier={supplier:string;physicalBlocks:number;autoLinkedBlocks:number;exceptions:number;unresolved:Array<{sheetName:string;sourceBlock:number;guide:string|null;lotReference:string|null;status:string}>}
type SupportPayload={status?:'ready'|'not_imported'|'migration_required';summary?:{blocks:number;observations:number;autoLinkedBlocks:number;exceptions:number};suppliers?:SupportSupplier[]}
type PlantReadiness={plantId:string;score:number;completed:number;total:number;metrics:{receptions:number};checks:Array<{key:string;label:string;complete:boolean;detail:string}>}
type PlantPayload={plants?:PlantReadiness[]}

type Candidate={supplier:ScoreSupplier;economics:EconomicSupplier|undefined;support:SupportSupplier|undefined;purchaseScore:number|null;decision:ReturnType<typeof purchaseDecisionFor>}
const nf=new Intl.NumberFormat('es-CL',{maximumFractionDigits:1})

export function ExecutiveDecisionBrief(){
 const {operator}=useAuth()
 const [scores,setScores]=useState<ScorePayload|null>(null),[economics,setEconomics]=useState<EconomicPayload|null>(null),[support,setSupport]=useState<SupportPayload|null>(null),[plants,setPlants]=useState<PlantPayload|null>(null),[error,setError]=useState('')
 const load=useCallback(async()=>{try{const required=await fetch('/api/supplier-intelligence',{cache:'no-store'}),scorePayload=await required.json() as ScorePayload;if(!required.ok)throw new Error(scorePayload.error??'Supplier Intelligence no disponible');const optional=<T,>(request:Promise<Response>)=>request.then(async response=>response.ok?await response.json() as T:null).catch(()=>null);const [economicPayload,supportPayload,plantPayload]=await Promise.all([optional<EconomicPayload>(fetch('/api/supplier-economic-intelligence',{cache:'no-store'})),optional<SupportPayload>(fetch('/api/supplier-support-intelligence',{cache:'no-store'})),optional<PlantPayload>(fetch('/api/plant-readiness',{cache:'no-store'}))]);setScores(scorePayload);setEconomics(economicPayload);setSupport(supportPayload);setPlants(plantPayload);setError('')}catch(cause){setError(cause instanceof Error?cause.message:'Centro de decisión no disponible')}},[])
 useEffect(()=>{void load();const refresh=()=>void load(),timer=window.setInterval(()=>{if(document.visibilityState==='visible')refresh()},30000);window.addEventListener('pescamar:data-updated',refresh);window.addEventListener('focus',refresh);return()=>{window.clearInterval(timer);window.removeEventListener('pescamar:data-updated',refresh);window.removeEventListener('focus',refresh)}},[load])
 const economicMap=useMemo(()=>new Map((economics?.suppliers??[]).map(item=>[normalizeSupplier(item.supplier),item])),[economics?.suppliers])
 const supportMap=useMemo(()=>new Map((support?.suppliers??[]).map(item=>[normalizeSupplier(item.supplier),item])),[support?.suppliers])
 const candidates=useMemo<Candidate[]>(()=>(scores?.suppliers??[]).map(supplier=>{const supplierEconomics=economicMap.get(normalizeSupplier(supplier.supplier)),supplierSupport=supportMap.get(normalizeSupplier(supplier.supplier)),purchaseScore=purchaseScoreFor(supplier,supplierEconomics),decision=purchaseDecisionFor({supplier,economics:supplierEconomics,support:supplierSupport,supportStatus:support?.status});return {supplier,economics:supplierEconomics,support:supplierSupport,purchaseScore,decision}}).sort((a,b)=>(b.purchaseScore??-1)-(a.purchaseScore??-1)),[scores?.suppliers,economicMap,supportMap,support?.status])
 const preferred=candidates.find(item=>item.decision.label==='Priorizar compra')??candidates.find(item=>item.decision.label==='Preferir')??candidates[0]??null
 const supplierAttention=candidates.find(item=>item.support?.exceptions)||[...candidates].reverse().find(item=>item.purchaseScore!=null)??null
 const weakestPlant=useMemo(()=>[...(plants?.plants??[])].sort((a,b)=>a.score-b.score)[0]??null,[plants?.plants])
 if(error&&!scores)return null
 if(!scores)return <section className="panel executive-decision-brief loading"><ShieldCheck size={18}/><div><b>Construyendo centro de decisión</b><small>Cruzando proveedor, trazabilidad y readiness operacional.</small></div></section>
 const supplierPath=operator&&canAccessPath(operator.role,'/proveedores-clientes')?'/proveedores-clientes':'/recepciones'
 const evidencePath=operator&&canAccessPath(operator.role,'/importaciones')?'/importaciones':operator&&canAccessPath(operator.role,'/aprobaciones')?'/aprobaciones':'/recepciones'
 const rolloutPath=operator&&canAccessPath(operator.role,'/rollout')?'/rollout':'/plantas'
 const supportReady=support?.status==='ready'
 return <section className="executive-decision-brief" aria-label="Centro de decisión"><div className="section-heading decision-brief-heading"><div><span className="overline teal">Centro de decisión</span><h2>Qué necesita atención ahora</h2></div><small>Una lectura ejecutiva; el detalle sigue en cada módulo.</small></div><div className="decision-brief-grid">
  <Link className={`decision-brief-card ${preferred?.decision.level??'neutral'}`} to={supplierPath}><ShoppingCart size={17}/><div><small>{preferred?.decision.label==='Priorizar compra'||preferred?.decision.label==='Preferir'?'Compra sugerida':'Mejor alternativa actual'}</small><b>{preferred?.supplier.supplier??'Sin evidencia suficiente'}</b><span>{preferred?`${preferred.decision.label} · score compra ${preferred.purchaseScore==null?'—':nf.format(preferred.purchaseScore)}`:'Supplier Intelligence aún no tiene una alternativa comparable.'}</span></div><ArrowRight size={15}/></Link>
  <Link className={`decision-brief-card ${supportReady&&(support.summary?.exceptions??0)>0?'warning':support?.status==='not_imported'?'warning':'positive'}`} to={evidencePath}><Layers3 size={17}/><div><small>Evidencia física</small><b>{supportReady?`${support.summary?.autoLinkedBlocks??0}/${support.summary?.blocks??0} cadenas`:'Carga v2 pendiente'}</b><span>{supportReady?`${support.summary?.observations??0} observaciones · ${support.summary?.exceptions??0} excepciones`:'La próxima carga canónica de producción publicará principal + soporte v2 en una sola operación.'}</span></div><ArrowRight size={15}/></Link>
  <Link className={`decision-brief-card ${supplierAttention?.decision.level??'neutral'}`} to={supplierPath}><AlertTriangle size={17}/><div><small>Proveedor a vigilar</small><b>{supplierAttention?.supplier.supplier??'Sin alerta de proveedor'}</b><span>{supplierAttention?supplierAttention.decision.label:'No hay proveedor con score comparable para revisar.'}{supplierAttention?.support?.exceptions?` · ${supplierAttention.support.exceptions} excepción física`:''}</span></div><ArrowRight size={15}/></Link>
  <Link className={`decision-brief-card ${weakestPlant&&weakestPlant.score<75?'warning':'positive'}`} to={weakestPlant?`/plantas/${weakestPlant.plantId}`:rolloutPath}><Factory size={17}/><div><small>Readiness planta</small><b>{weakestPlant?`${weakestPlant.plantId} · ${weakestPlant.score}%`:'Sin readiness'}</b><span>{weakestPlant?`${weakestPlant.completed}/${weakestPlant.total} evidencias · ${weakestPlant.metrics.receptions} recepciones vivas`:'Aún no existe evidencia suficiente por planta.'}</span></div><ArrowRight size={15}/></Link>
 </div>{support?.status==='ready'&&(support.summary?.exceptions??0)>0?<div className="decision-brief-exception"><AlertTriangle size={15}/><span><b>Calidad:</b> {support.suppliers?.flatMap(item=>item.unresolved).slice(0,2).map(item=>`${item.sheetName} · bloque ${item.sourceBlock} · guía ${item.guide??'—'} · lote ${item.lotReference??'—'}`).join(' | ')}</span></div>:null}</section>
}

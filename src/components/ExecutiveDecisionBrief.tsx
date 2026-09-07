import {AlertTriangle,ArrowRight,Factory,Layers3,ShieldAlert,ShieldCheck,ShoppingCart} from 'lucide-react'
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
type OperationalSignal={priority:1|2|3;kind:string;title:string;detail:string;confidence:'observed'|'derived';action:string;evidenceEventIds:string[];blockers:string[]}
type OperationalItem={receptionId:string;receptionNumber:string|null;plantId:string|null;species:string|null;supplier:string|null;latestAt:string|null;path:string;signal:OperationalSignal}
type OperationalPayload={schemaVersion?:string;lots?:number;counts?:{p1:number;p2:number;p3:number};topSignals?:OperationalItem[];boundary?:{writesOperationalState?:boolean;liveOnly?:boolean;historicalIncluded?:boolean};error?:string}
type Candidate={supplier:ScoreSupplier;economics:EconomicSupplier|undefined;support:SupportSupplier|undefined;purchaseScore:number|null;decision:ReturnType<typeof purchaseDecisionFor>}
const nf=new Intl.NumberFormat('es-CL',{maximumFractionDigits:1})
const ownerForPath=(path:string)=>{
 if(['/ordenes-venta','/proveedores-clientes','/despachos-ventas','/liquidaciones','/creditos','/costos-transformacion'].some(prefix=>path.startsWith(prefix)))return 'Comercial'
 if(['/aprobaciones','/rentabilidad'].some(prefix=>path.startsWith(prefix)))return 'Gerencia'
 if(['/integrations','/observabilidad','/organization','/operadores','/modulos'].some(prefix=>path.startsWith(prefix)))return 'Administración'
 return 'Operación'
}

export function ExecutiveDecisionBrief(){
 const {operator}=useAuth()
 const [scores,setScores]=useState<ScorePayload|null>(null),[economics,setEconomics]=useState<EconomicPayload|null>(null),[support,setSupport]=useState<SupportPayload|null>(null),[plants,setPlants]=useState<PlantPayload|null>(null),[operational,setOperational]=useState<OperationalPayload|null>(null),[error,setError]=useState('')
 const load=useCallback(async()=>{try{const required=await fetch('/api/supplier-intelligence',{cache:'no-store'}),scorePayload=await required.json() as ScorePayload;if(!required.ok)throw new Error(scorePayload.error??'Análisis de proveedores no disponible');const optional=<T,>(request:Promise<Response>)=>request.then(async response=>response.ok?await response.json() as T:null).catch(()=>null);const [economicPayload,supportPayload,plantPayload,operationalPayload]=await Promise.all([optional<EconomicPayload>(fetch('/api/supplier-economic-intelligence',{cache:'no-store'})),optional<SupportPayload>(fetch('/api/supplier-support-intelligence',{cache:'no-store'})),optional<PlantPayload>(fetch('/api/plant-readiness',{cache:'no-store'})),optional<OperationalPayload>(fetch('/api/operational-intelligence-overview',{cache:'no-store'}))]);setScores(scorePayload);setEconomics(economicPayload);setSupport(supportPayload);setPlants(plantPayload);setOperational(operationalPayload);setError('')}catch(cause){setError(cause instanceof Error?cause.message:'Centro de decisión no disponible')}},[])
 useEffect(()=>{void load();const refresh=()=>void load(),timer=window.setInterval(()=>{if(document.visibilityState==='visible')refresh()},30000);window.addEventListener('pescamar:data-updated',refresh);window.addEventListener('focus',refresh);return()=>{window.clearInterval(timer);window.removeEventListener('pescamar:data-updated',refresh);window.removeEventListener('focus',refresh)}},[load])
 const economicMap=useMemo(()=>new Map((economics?.suppliers??[]).map(item=>[normalizeSupplier(item.supplier),item])),[economics?.suppliers])
 const supportMap=useMemo(()=>new Map((support?.suppliers??[]).map(item=>[normalizeSupplier(item.supplier),item])),[support?.suppliers])
 const candidates=useMemo<Candidate[]>(()=>(scores?.suppliers??[]).map(supplier=>{const supplierEconomics=economicMap.get(normalizeSupplier(supplier.supplier)),supplierSupport=supportMap.get(normalizeSupplier(supplier.supplier)),purchaseScore=purchaseScoreFor(supplier,supplierEconomics),decision=purchaseDecisionFor({supplier,economics:supplierEconomics,support:supplierSupport,supportStatus:support?.status});return {supplier,economics:supplierEconomics,support:supplierSupport,purchaseScore,decision}}).sort((a,b)=>(b.purchaseScore??-1)-(a.purchaseScore??-1)),[scores?.suppliers,economicMap,supportMap,support?.status])
 const comparableCandidates=candidates.filter(item=>item.supplier.coverage>=40&&item.purchaseScore!=null)
 const preferred=candidates.find(item=>item.decision.label==='Priorizar compra')??candidates.find(item=>item.decision.label==='Preferir')??comparableCandidates[0]??[...candidates].sort((a,b)=>b.supplier.coverage-a.supplier.coverage||(b.purchaseScore??-1)-(a.purchaseScore??-1))[0]??null
 const supplierAttention=candidates.find(item=>(item.support?.exceptions??0)>0)??[...candidates].reverse().find(item=>item.purchaseScore!=null)??null
 const weakestPlant=useMemo(()=>[...(plants?.plants??[])].sort((a,b)=>a.score-b.score)[0]??null,[plants?.plants])
 const topOperational=operational?.topSignals?.[0]??null,operationalCounts=operational?.counts??{p1:0,p2:0,p3:0},operationalTotal=operationalCounts.p1+operationalCounts.p2+operationalCounts.p3
 if(error&&!scores)return null
 if(!scores)return <section className="panel executive-decision-brief loading"><ShieldCheck size={18}/><div><b>Revisando</b><small>Buscando lo que requiere atención.</small></div></section>
 const supplierPath=operator&&canAccessPath(operator.role,'/proveedores-clientes')?'/proveedores-clientes':'/recepciones'
 const evidencePath=operator&&canAccessPath(operator.role,'/importaciones')?'/importaciones':operator&&canAccessPath(operator.role,'/aprobaciones')?'/aprobaciones':'/recepciones'
 const rolloutPath=operator&&canAccessPath(operator.role,'/rollout')?'/rollout':'/plantas'
 const supportReady=support?.status==='ready',supportTone=supportReady?(support.summary?.exceptions??0)>0?'warning':'positive':support?.status==='not_imported'?'warning':'neutral'
 const preferredScore=preferred?.purchaseScore==null?'sin evaluación':`${nf.format(preferred.purchaseScore)} · ${nf.format(preferred.supplier.coverage)}% de información · confianza ${preferred.supplier.confidence}`
 const operationalOwner=topOperational?ownerForPath(topOperational.path):null
 return <section className="executive-decision-brief" aria-label="Qué requiere atención"><div className="section-heading decision-brief-heading"><div><span className="overline teal">Atención</span><h2>Qué requiere atención</h2></div></div>
 {topOperational?<Link className={`decision-operational-priority p${topOperational.signal.priority}`} to={topOperational.path}><span className="decision-priority-mark"><ShieldAlert size={19}/><b>{topOperational.signal.priority}</b></span><div><small>Prioridad {topOperational.signal.priority}</small><h3>{topOperational.signal.title}</h3><p>{topOperational.signal.detail}</p><span>{topOperational.receptionNumber?`Recepción ${topOperational.receptionNumber}`:'Lote'}{topOperational.supplier?` · ${topOperational.supplier}`:''}</span><strong>Hacer: {topOperational.signal.action}</strong><span><b>Responsable:</b> {operationalOwner}</span>{topOperational.signal.blockers.length?<em>Bloquea: {topOperational.signal.blockers.join(' · ')}</em>:null}</div><div className="decision-priority-counts"><span><b>{operationalCounts.p1}</b>alta</span><span><b>{operationalCounts.p2}</b>media</span><span><b>{operationalCounts.p3}</b>baja</span><ArrowRight size={16}/></div></Link>:<div className="decision-operational-clear"><ShieldCheck size={17}/><div><b>{operational?`Sin pendientes en ${operational.lots??0} lotes`:'Estado no disponible'}</b><small>{operational?'No hay acciones pendientes ahora.':'No se asume un estado sin datos.'}</small></div>{operational&&operationalTotal===0?<span>Sin pendientes</span>:null}</div>}
 <div className="decision-brief-grid">
  <Link className={`decision-brief-card ${preferred?.decision.level??'neutral'}`} to={supplierPath}><ShoppingCart size={17}/><div><small>Compra</small><b>{preferred?.supplier.supplier??'Sin información suficiente'}</b><span>{preferred?`${preferred.decision.label} · ${preferredScore}`:'Aún no hay suficiente información para comparar.'}</span></div><ArrowRight size={15}/></Link>
  <Link className={`decision-brief-card ${supportTone}`} to={evidencePath}><Layers3 size={17}/><div><small>Trazabilidad</small><b>{supportReady?`${support.summary?.autoLinkedBlocks??0}/${support.summary?.blocks??0} vinculados`:'Pendiente'}</b><span>{supportReady?`${support.summary?.exceptions??0} por revisar`:'Falta vincular registros de apoyo.'}</span></div><ArrowRight size={15}/></Link>
  <Link className={`decision-brief-card ${supplierAttention?.decision.level??'neutral'}`} to={supplierPath}><AlertTriangle size={17}/><div><small>Proveedor</small><b>{supplierAttention?.supplier.supplier??'Sin alerta'}</b><span>{supplierAttention?supplierAttention.decision.label:'Sin revisión pendiente.'}</span></div><ArrowRight size={15}/></Link>
  <Link className={`decision-brief-card ${weakestPlant&&weakestPlant.score<75?'warning':weakestPlant?'positive':'neutral'}`} to={weakestPlant?`/plantas/${weakestPlant.plantId}`:rolloutPath}><Factory size={17}/><div><small>Planta</small><b>{weakestPlant?`${weakestPlant.plantId} · ${weakestPlant.score}%`:'Sin evaluación'}</b><span>{weakestPlant?`${weakestPlant.completed}/${weakestPlant.total} comprobaciones`:'Sin información suficiente.'}</span></div><ArrowRight size={15}/></Link>
 </div>{supportReady&&(support.summary?.exceptions??0)>0?<div className="decision-brief-exception"><AlertTriangle size={15}/><span><b>Calidad:</b> {support.suppliers?.flatMap(item=>item.unresolved).slice(0,2).map(item=>`${item.sheetName} · bloque ${item.sourceBlock} · guía ${item.guide??'—'} · lote ${item.lotReference??'—'}`).join(' | ')}</span></div>:null}</section>
}

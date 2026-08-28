import {AlertTriangle,CheckCircle2,Layers3,MapPin,Scale,ShieldCheck,TrendingUp} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'
import type {Species} from '../types'
import './supplier-reception-decision.css'

type ScoreComponent={key:string;label:string;weight:number;score:number|null}
type ScoreZone={zone:string;lots:number;receivedKg:number;gradeAYieldPct:number|null;totalYieldPct:number|null}
type SupplierScore={supplier:string;score:number|null;label:string;confidence:'alta'|'media'|'baja';coverage:number;lots:number;receivedKg:number;zones:ScoreZone[];explanation:string;components?:ScoreComponent[]}
type ScorePayload={suppliers?:SupplierScore[];error?:string}
type PricePayload={matched?:boolean;supplier?:string;suggestions?:string[];price?:{observations:number;receivedKg:number;avgPriceClp:number|null;latestPriceClp:number|null;minPriceClp:number|null;maxPriceClp:number|null};zone?:{name:string;observations:number;receivedKg:number;supplierAvgPriceClp:number|null;peerAvgPriceClp:number|null;relativeToZonePct:number|null}|null;error?:string}
type EconomicSupplier={supplierId:string|null;supplier:string;score:number|null;source:'historical'|'live'|'mixed'|'pending';historical:{samples:number;receivedKg:number;purchaseCostClp:number;gradeAOutputKg:number;avgRawPriceClp:number|null;costPerGradeAKg:number|null;score:number|null};live:{receptions:number;soldReceptions:number;receivedKg:number;soldKg:number;revenueClp:number;purchaseCostClp:number;transformationCostClp:number;contributionClp:number;contributionPerReceivedKg:number|null;score:number|null}}
type EconomicPayload={suppliers?:EconomicSupplier[];error?:string}
type SupportSupplier={supplier:string;physicalBlocks:number;observations:number;autoLinkedBlocks:number;exceptions:number;traceabilityScore:number|null;unresolved:Array<{sheetName:string;sourceBlock:number;guide:string|null;lotReference:string|null;status:string}>}
type SupportPayload={status?:'ready'|'not_imported'|'migration_required';suppliers?:SupportSupplier[];error?:string}
type Decision={label:string;tone:'good'|'watch'|'risk'|'neutral';detail:string}

const normalize=(value:string)=>value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/[^a-z0-9]/g,'')
const clp=(value:number|null|undefined)=>value==null?'—':new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(value)
const scoreLabel=(value:number|null)=>value==null?'—':value.toFixed(0)

function purchaseScoreFor(score:SupplierScore,economics:EconomicSupplier|undefined){
 const components=(score.components??[]).filter(item=>item.key!=='profitability'&&item.score!=null)
 const legacyEconomic=score.components?.find(item=>item.key==='profitability')?.score??null
 const economicScore=economics?.score??legacyEconomic
 if(!components.length){
  if(score.score==null)return economicScore
  return economicScore==null?score.score:Number(((score.score*90+economicScore*10)/100).toFixed(1))
 }
 const weighted=components.reduce((sum,item)=>sum+(item.score??0)*item.weight,0)+(economicScore==null?0:economicScore*10)
 const coverage=components.reduce((sum,item)=>sum+item.weight,0)+(economicScore==null?0:10)
 return coverage?Number((weighted/coverage).toFixed(1)):score.score
}

function decisionFor(score:SupplierScore,economics:EconomicSupplier|undefined,support:SupportSupplier|undefined,supportStatus:SupportPayload['status'],relative:number|null|undefined):Decision{
 const purchaseScore=purchaseScoreFor(score,economics)
 if(purchaseScore==null||score.coverage<40)return {label:'Evidencia insuficiente',tone:'neutral',detail:'Registrar la recepción; el sistema seguirá aprendiendo sin asignar una recomendación fuerte.'}
 if(supportStatus==='ready'&&support&&support.exceptions>0)return {label:'Revisar trazabilidad',tone:'watch',detail:`Hay ${support.exceptions} ${support.exceptions===1?'cadena física sin conciliación':'cadenas físicas sin conciliación'}. Resolver evidencia antes de aumentar exposición con este proveedor.`}
 if(score.confidence==='baja'||score.coverage<50)return {label:'Revisar próxima recepción',tone:'watch',detail:'El desempeño existe, pero la confianza todavía no justifica priorizar compra sin control adicional.'}
 if(economics?.score!=null&&economics.score<35)return {label:'Negociar antes de comprar',tone:'watch',detail:'La economía de compra está débil frente a proveedores comparables, aunque la calidad pueda ser utilizable.'}
 if(economics?.score==null&&relative!=null&&relative>15)return {label:'Negociar antes de comprar',tone:'watch',detail:'Aún no hay economía Grade A suficiente y el precio histórico está alto frente a pares de la misma zona.'}
 if(purchaseScore>=85&&economics?.score!=null&&economics.score>=50)return {label:'Priorizar compra',tone:'good',detail:'Desempeño fuerte, economía competitiva y evidencia suficiente. Mantener control normal de recepción.'}
 if(purchaseScore>=75)return {label:'Preferir',tone:'good',detail:electronicsFallback(economics,'Buen desempeño relativo. Es una alternativa prioritaria cuando especie, zona y condiciones comerciales sean comparables.')}
 if(purchaseScore>=60)return {label:'Mantener con control',tone:'watch',detail:'Proveedor utilizable; reforzar calidad, rendimiento y condición económica en esta recepción.'}
 return {label:'Calidad antes de comprar',tone:'risk',detail:'El desempeño observado no justifica aumentar compra sin revisión de Calidad y evidencia del lote.'}
}
function electronicsFallback(economics:EconomicSupplier|undefined,text:string){return economics?.score==null?`${text} Economía Grade A todavía pendiente.`:text}

export function SupplierReceptionDecision({supplier,zone,species,onUseSupplier}:{supplier:string;zone:string;species:Species;onUseSupplier?:(supplier:string)=>void}){
 const [scoreData,setScoreData]=useState<ScorePayload|null>(null),[priceData,setPriceData]=useState<PricePayload|null>(null),[economicsData,setEconomicsData]=useState<EconomicPayload|null>(null),[supportData,setSupportData]=useState<SupportPayload|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('')
 useEffect(()=>{
  if(species!=='Erizo'||supplier.trim().length<2){setScoreData(null);setPriceData(null);setEconomicsData(null);setSupportData(null);setError('');return}
  let active=true
  const timer=window.setTimeout(()=>{
   setLoading(true);setError('')
   const scoreRequest=fetch('/api/supplier-intelligence',{cache:'no-store'}).then(async response=>{const payload=await response.json() as ScorePayload;if(!response.ok)throw new Error(payload.error??'No fue posible calcular el score');return payload})
   const optional=<T,>(request:Promise<Response>)=>request.then(async response=>response.ok?await response.json() as T:null).catch(()=>null)
   void Promise.all([
    scoreRequest,
    optional<PricePayload>(fetch(`/api/supplier-price-context?supplier=${encodeURIComponent(supplier.trim())}&zone=${encodeURIComponent(zone.trim())}`,{cache:'no-store'})),
    optional<EconomicPayload>(fetch('/api/supplier-economic-intelligence',{cache:'no-store'})),
    optional<SupportPayload>(fetch('/api/supplier-support-intelligence',{cache:'no-store'})),
   ]).then(([scores,prices,economics,support])=>{if(active){setScoreData(scores);setPriceData(prices);setEconomicsData(economics);setSupportData(support)}}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'No fue posible cargar Supplier Intelligence')}).finally(()=>{if(active)setLoading(false)})
  },320)
  return()=>{active=false;window.clearTimeout(timer)}
 },[supplier,zone,species])
 const score=useMemo(()=>scoreData?.suppliers?.find(item=>normalize(item.supplier)===normalize(supplier))??null,[scoreData,supplier])
 const economics=useMemo(()=>economicsData?.suppliers?.find(item=>normalize(item.supplier)===normalize(supplier)),[economicsData,supplier])
 const support=useMemo(()=>supportData?.suppliers?.find(item=>normalize(item.supplier)===normalize(supplier)),[supportData,supplier])
 const zoneScore=useMemo(()=>score?.zones.find(item=>normalize(item.zone)===normalize(zone))??null,[score,zone])
 if(species!=='Erizo'||supplier.trim().length<2)return null
 if(loading&&!scoreData)return <section className="supplier-reception-decision loading"><ShieldCheck size={17}/><div><b>Consultando Supplier Intelligence</b><small>Desempeño, economía Grade A, trazabilidad física, zona y precio.</small></div></section>
 if(error)return <section className="supplier-reception-decision error"><AlertTriangle size={17}/><div><b>Supplier Intelligence no disponible</b><small>{error}. La recepción puede continuar.</small></div></section>
 if(!score&&priceData?.matched===false){const suggestions=priceData.suggestions??[];return <section className="supplier-reception-decision neutral"><ShieldCheck size={17}/><div className="supplier-decision-empty"><b>Proveedor sin coincidencia exacta</b><small>La recepción puede continuar, pero no asignaremos un score a una identidad dudosa.</small>{suggestions.length?<div className="supplier-suggestions"><span>¿Corresponde a:</span>{suggestions.slice(0,3).map(item=><button type="button" key={item} onClick={()=>onUseSupplier?.(item)}>{item}</button>)}</div>:null}</div></section>}
 if(!score)return <section className="supplier-reception-decision neutral"><ShieldCheck size={17}/><div><b>Proveedor nuevo o sin historia comparable</b><small>Se registrará la recepción y el score comenzará a construirse con evidencia real.</small></div></section>
 const relative=priceData?.zone?.relativeToZonePct,purchaseScore=purchaseScoreFor(score,economics),decision=decisionFor(score,economics,support,supportData?.status,relative),Icon=decision.tone==='good'?CheckCircle2:decision.tone==='risk'?AlertTriangle:ShieldCheck
 const traceability=supportData?.status==='ready'&&support?`${support.autoLinkedBlocks}/${support.physicalBlocks}`:supportData?.status==='not_imported'?'Pendiente v2':'—'
 return <section className={`supplier-reception-decision ${decision.tone}`} aria-label="Recomendación de proveedor"><div className="supplier-decision-head"><div className="supplier-decision-verdict"><Icon size={18}/><div><span className="overline">Supplier Intelligence · decisión de compra</span><h3>{decision.label}</h3><small>{decision.detail}</small></div></div><div className="supplier-decision-score"><b>{scoreLabel(purchaseScore)}</b><span>/100</span><small>Score compra · desempeño {scoreLabel(score.score)} · economía {scoreLabel(economics?.score??null)}</small></div></div><div className="supplier-decision-grid"><article><ShieldCheck size={15}/><div><small>Desempeño / cobertura</small><b>{scoreLabel(score.score)} · {score.coverage}%</b><span>{score.lots} lotes · confianza {score.confidence}</span></div></article><article><Scale size={15}/><div><small>Costo / kg Grade A útil</small><b>{clp(economics?.historical.costPerGradeAKg)} / kg</b><span>{economics?.historical.samples?`${economics.historical.samples} muestras directas con precio y Grade A`:'Sin evidencia histórica comparable'}</span></div></article><article><TrendingUp size={15}/><div><small>Contribución live / kg recibido</small><b>{clp(economics?.live.contributionPerReceivedKg)} / kg</b><span>{economics?.live.soldReceptions?`${economics.live.soldReceptions} recepciones con venta vinculada`:'Sin margen live vinculado todavía'}</span></div></article><article><Layers3 size={15}/><div><small>Trazabilidad física</small><b>{traceability}</b><span>{supportData?.status==='ready'&&support?`${support.exceptions} excepciones · score trazabilidad ${support.traceabilityScore==null?'—':`${support.traceabilityScore.toFixed(1)}%`}`:'Las cadenas v2 no penalizan el desempeño cuando faltan.'}</span></div></article><article><MapPin size={15}/><div><small>{zone.trim()?`Zona ${zone.trim()}`:'Zona'}</small><b>{zoneScore?.gradeAYieldPct==null?'Sin muestra':`${zoneScore.gradeAYieldPct.toFixed(1)}% Grade A`}</b><span>{zoneScore?`${zoneScore.lots} lotes · ${zoneScore.receivedKg.toLocaleString('es-CL',{maximumFractionDigits:0})} kg`:'Aún no existe evidencia comparable en esta zona.'}</span></div></article><article><Scale size={15}/><div><small>Precio materia prima vs zona</small><b>{relative==null?clp(priceData?.price?.avgPriceClp):`${relative>0?'+':''}${relative.toFixed(1)}%`}</b><span>{priceData?.zone?.peerAvgPriceClp==null?'Sin pares suficientes para comparar precio.':`Proveedor ${clp(priceData.zone.supplierAvgPriceClp)} vs zona ${clp(priceData.zone.peerAvgPriceClp)} / kg`}</span></div></article></div>{support?.unresolved?.length?<div className="notice warning"><AlertTriangle size={15}/><span><b>Calidad debe revisar:</b> {support.unresolved.map(item=>`${item.sheetName} · bloque ${item.sourceBlock} · guía ${item.guide??'—'} · lote ${item.lotReference??'—'}`).join(' | ')}</span></div>:null}<p className="supplier-decision-footnote">Economía histórica = costo materia prima / kg Grade A útil; margen live sólo con ventas y costos ligados. Trazabilidad física modifica confianza, no castiga desempeño. La recomendación no reemplaza el control de calidad del lote.</p></section>
}
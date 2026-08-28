import {Activity,AlertTriangle,Award,Layers3,MapPin,Scale,ShieldCheck,TrendingDown,TrendingUp} from 'lucide-react'
import {useCallback,useEffect,useMemo,useState} from 'react'
import './supplier-intelligence.css'

type ScoreComponent={key:string;label:string;weight:number;score:number|null;detail:string;source:'historical'|'live'|'mixed'|'pending'}
type Zone={zone:string;lots:number;receivedKg:number;rowMassBalanceRows:number;rollforwardRows:number;gradeAYieldPct:number|null;totalYieldPct:number|null;massReviewRows:number}
type LiveEvidence={runs:number;qualitySamples:number;yieldSamples:number;controlledRuns:number}
type Evidence={canonicalLots:number;rowMassBalanceRows:number;rollforwardRows:number;flaggedRows:number;massReviewRows:number;massValidatedPct:number|null;semanticEligiblePct:number|null;sourceFlaggedPct:number|null;guideCoveragePct:number|null;priceCoveragePct:number|null;qualityEligibleRows:number;yieldEligibleRows:number}
type SupplierScore={supplierId:string|null;supplier:string;score:number|null;label:string;confidence:'alta'|'media'|'baja';coverage:number;lots:number;historicalLots:number;liveLots:number;receivedKg:number;trendGradeAPoints:number|null;components:ScoreComponent[];zones:Zone[];explanation:string;lastHistoricalDate:string|null;identity:string;liveEvidence?:LiveEvidence;evidence:Evidence}
type Payload={ok?:boolean;summary?:{suppliers:number;scored:number;preferred:number;highConfidence:number;canonicalLots:number;rowMassBalanceRows:number;rollforwardRows:number;massReviewRows:number};suppliers?:SupplierScore[];method?:{version:string;rule:string};error?:string}
type SupportSupplier={supplier:string;physicalBlocks:number;observations:number;autoLinkedBlocks:number;matchCoveragePct:number|null;exactBoth:number;guideOnly:number;lotOnly:number;conflicts:number;ambiguous:number;unmatched:number;exceptions:number;traceabilityScore:number|null;noGradeObservationBlocks:number;unresolved:Array<{sheetName:string;sourceBlock:number;guide:string|null;lotReference:string|null;status:string}>}
type SupportPayload={ok?:boolean;status?:'ready'|'not_imported'|'migration_required';summary?:{blocks:number;observations:number;autoLinkedBlocks:number;exceptions:number;suppliersWithSupport:number};suppliers?:SupportSupplier[];method?:{version:string;rule?:string};error?:string}
type EconomicSupplier={supplierId:string|null;supplier:string;score:number|null;source:'historical'|'live'|'mixed'|'pending';historical:{samples:number;receivedKg:number;purchaseCostClp:number;gradeAOutputKg:number;avgRawPriceClp:number|null;costPerGradeAKg:number|null;score:number|null};live:{receptions:number;soldReceptions:number;receivedKg:number;soldKg:number;revenueClp:number;purchaseCostClp:number;transformationCostClp:number;contributionClp:number;contributionPerReceivedKg:number|null;score:number|null}}
type EconomicPayload={ok?:boolean;method?:{version:string;rule:string};summary?:{suppliers:number;scored:number;historicalScored:number;liveScored:number;mixed:number};suppliers?:EconomicSupplier[];error?:string}
type DecisionTone='success'|'info'|'warning'|'danger'
type Decision={label:string;detail:string;tone:DecisionTone}
const nf=new Intl.NumberFormat('es-CL',{maximumFractionDigits:1})
const money=new Intl.NumberFormat('es-CL',{maximumFractionDigits:0})
const scoreClass=(label:string)=>label==='Preferente'?'success':label==='Fuerte'?'info':label==='Revisar'?'danger':label==='Provisional'?'warning':''
const purchaseScoreClass=(score:number|null)=>score==null?'warning':score>=85?'success':score>=75?'info':score<60?'danger':'warning'
const sourceLabel=(source:ScoreComponent['source'])=>source==='live'?'Live':source==='historical'?'Canónico':source==='mixed'?'Canónico + live':'Pendiente'
const economicSourceLabel=(source:EconomicSupplier['source'])=>source==='live'?'Margen live':source==='historical'?'Producción canónica':source==='mixed'?'Canónico + margen live':'Pendiente'
const evidencePct=(value:number|null)=>value==null?'—':`${nf.format(value)}%`
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/[^a-z0-9]/g,'')

function purchaseScoreFor(supplier:SupplierScore,economics:EconomicSupplier|undefined){
 const performance=supplier.components.filter(item=>item.key!=='profitability'&&item.score!=null)
 const legacyEconomic=supplier.components.find(item=>item.key==='profitability')?.score??null
 const economicScore=economics?.score??legacyEconomic
 const weighted=performance.reduce((sum,item)=>sum+(item.score??0)*item.weight,0)+(economicScore==null?0:economicScore*10)
 const coverage=performance.reduce((sum,item)=>sum+item.weight,0)+(economicScore==null?0:10)
 return coverage?Number((weighted/coverage).toFixed(1)):supplier.score
}

function decisionFor(supplier:SupplierScore,economics:EconomicSupplier|undefined,support:SupportSupplier|undefined,supportStatus:SupportPayload['status']):Decision{
 const purchaseScore=purchaseScoreFor(supplier,economics)
 if(purchaseScore==null)return {label:'Esperar evidencia',detail:'Todavía no hay base suficiente para una decisión de compra objetiva.',tone:'warning'}
 if(supportStatus==='ready'&&support&&support.exceptions>0)return {label:'Revisar próxima recepción',detail:`El desempeño es utilizable, pero ${support.exceptions} ${support.exceptions===1?'cadena física requiere':'cadenas físicas requieren'} conciliación antes de aumentar exposición.`,tone:'warning'}
 if(supplier.confidence==='baja'||supplier.coverage<50)return {label:'Revisar próxima recepción',detail:'El score existe, pero la cobertura o la confianza todavía no justifican priorizar compra sin control adicional.',tone:'warning'}
 if(economics?.score!=null&&economics.score<35)return {label:'Negociar antes de comprar',detail:'La calidad puede ser utilizable, pero el costo por producto útil o el margen live está débil frente a otros proveedores comparables.',tone:'warning'}
 if(purchaseScore>=85&&economics?.score!=null&&economics.score>=50)return {label:'Priorizar compra',detail:'Combina desempeño fuerte con economía de compra competitiva. Mantener control de recepción y confirmar que la tendencia no se deteriore.',tone:'success'}
 if(purchaseScore>=75)return {label:'Preferir',detail:electronicsFallback(economics,'Buen desempeño relativo. Es una alternativa prioritaria cuando especie, zona y condiciones comerciales sean comparables.') ,tone:'info'}
 if(purchaseScore>=60)return {label:'Mantener con control',detail:'Proveedor utilizable, pero conviene exigir control de calidad, rendimiento y condición económica en la siguiente recepción.',tone:'warning'}
 return {label:'Calidad antes de comprar',detail:'El desempeño observado no justifica aumentar compra sin revisión de Calidad y evidencia del próximo lote.',tone:'danger'}
}
function electronicsFallback(economics:EconomicSupplier|undefined,defaultText:string){return economics?.score==null?`${defaultText} Economía de compra todavía pendiente.`:defaultText}

export function SupplierIntelligence(){
 const [data,setData]=useState<Payload|null>(null),[support,setSupport]=useState<SupportPayload|null>(null),[economics,setEconomics]=useState<EconomicPayload|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true)
 const load=useCallback(async(silent=false)=>{if(!silent)setLoading(true);try{const scoreResponse=await fetch('/api/supplier-intelligence',{cache:'no-store'}),payload=await scoreResponse.json() as Payload;if(!scoreResponse.ok)throw new Error(payload.error??'No fue posible calcular Supplier Intelligence');let supportPayload:SupportPayload|null=null,economicPayload:EconomicPayload|null=null;try{const supportResponse=await fetch('/api/supplier-support-intelligence',{cache:'no-store'}),candidate=await supportResponse.json() as SupportPayload;if(supportResponse.ok&&candidate.ok)supportPayload=candidate}catch{supportPayload=null}try{const economicResponse=await fetch('/api/supplier-economic-intelligence',{cache:'no-store'}),candidate=await economicResponse.json() as EconomicPayload;if(economicResponse.ok&&candidate.ok)economicPayload=candidate}catch{economicPayload=null}setData(payload);setSupport(supportPayload);setEconomics(economicPayload);setError('')}catch(cause){setError(cause instanceof Error?cause.message:'No fue posible calcular Supplier Intelligence')}finally{if(!silent)setLoading(false)}},[])
 useEffect(()=>{void load();const refresh=()=>void load(true),onVisibility=()=>{if(document.visibilityState==='visible')refresh()},timer=window.setInterval(()=>{if(document.visibilityState==='visible')refresh()},15000);window.addEventListener('pescamar:data-updated',refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',onVisibility);return()=>{window.clearInterval(timer);window.removeEventListener('pescamar:data-updated',refresh);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',onVisibility)}},[load])
 const suppliers=useMemo(()=>data?.suppliers??[],[data?.suppliers]),summary=data?.summary
 const supportMap=useMemo(()=>new Map((support?.suppliers??[]).map(item=>[normalize(item.supplier),item])),[support?.suppliers])
 const economicMap=useMemo(()=>new Map((economics?.suppliers??[]).map(item=>[normalize(item.supplier),item])),[economics?.suppliers])
 const purchaseLeader=useMemo(()=>suppliers.map(item=>({item,economics:economicMap.get(normalize(item.supplier)),support:supportMap.get(normalize(item.supplier))})).sort((a,b)=>(purchaseScoreFor(b.item,b.economics)??-1)-(purchaseScoreFor(a.item,a.economics)??-1)).find(candidate=>purchaseScoreFor(candidate.item,candidate.economics)!=null)?.item??null,[suppliers,economicMap,supportMap])
 if(loading&&!data)return <section className="panel supplier-intelligence"><div className="empty-inline"><Activity size={20}/><div><b>Calculando Supplier Score</b><small>Cruzando evidencia comparable con calidad, rendimiento, economía y controles live.</small></div></div></section>
 if(error&&!data)return <section className="panel supplier-intelligence"><div className="notice error">{error}</div></section>
 const leaderEconomics=purchaseLeader?economicMap.get(normalize(purchaseLeader.supplier)):undefined,leaderSupport=purchaseLeader?supportMap.get(normalize(purchaseLeader.supplier)):undefined,leaderDecision=purchaseLeader?decisionFor(purchaseLeader,leaderEconomics,leaderSupport,support?.status):null,leaderPurchaseScore=purchaseLeader?purchaseScoreFor(purchaseLeader,leaderEconomics):null
 return <section className="supplier-intelligence" aria-label="Supplier Intelligence" aria-live="polite">
  <div className="supplier-score-hero">
   <div><span className="overline">Supplier Intelligence · Erizos</span><h2>Score de compra de proveedor</h2><p>Combina desempeño, trazabilidad y economía sin mezclar fuentes incompatibles. La producción define calidad y rendimiento; el margen sólo usa operaciones vinculadas; CUENTA2 y packing de pulpo permanecen como evidencia separada.</p></div>
   <div className="supplier-score-method"><ShieldCheck size={18}/><div><b>{data?.method?.version??'supplier-score-v1'} + {economics?.method?.version??'economía pendiente'}</b><small>El 10% económico usa costo por kg Grade A útil y, cuando existe, margen live real de erizo.</small></div></div>
  </div>
  {purchaseLeader&&leaderDecision?<div className="supplier-score-method"><Award size={18}/><div><b>Decisión actual · {leaderDecision.label}: {purchaseLeader.supplier}</b><small>Score compra {leaderPurchaseScore==null?'—':nf.format(leaderPurchaseScore)} · desempeño {purchaseLeader.score==null?'—':nf.format(purchaseLeader.score)} · economía {leaderEconomics?.score==null?'—':nf.format(leaderEconomics.score)}. {leaderDecision.detail}</small></div></div>:null}
  <div className="supplier-score-summary">
   <article><Award size={17}/><div><small>Proveedores puntuados</small><b>{summary?.scored??0}</b></div></article>
   <article><Scale size={17}/><div><small>Economía calculada</small><b>{economics?.summary?.scored??0}</b></div></article>
   <article><ShieldCheck size={17}/><div><small>Filas directas</small><b>{summary?.rowMassBalanceRows??0}</b></div></article>
   <article><Layers3 size={17}/><div><small>Roll-forward planta</small><b>{summary?.rollforwardRows??0}</b></div></article>
  </div>
  {economics?<div className="supplier-score-method"><Scale size={18}/><div><b>Economía de compra · {economics.summary?.historicalScored??0} históricos · {economics.summary?.liveScored??0} con margen live</b><small>Costo histórico por kg Grade A útil; el margen live sólo aparece cuando ventas, liquidación y transformación están vinculadas a una recepción de erizo.</small></div></div>:<div className="notice"><b>Economía de compra pendiente.</b> El score de desempeño sigue disponible, pero no se prioriza compra sin evidencia económica cuando ésta falta.</div>}
  {support?.status==='ready'?<div className="supplier-score-method"><Layers3 size={18}/><div><b>Evidencia física v2 · {support.summary?.autoLinkedBlocks??0}/{support.summary?.blocks??0} cadenas conciliadas</b><small>{support.summary?.observations??0} observaciones · {support.summary?.exceptions??0} excepciones. Esta capa modifica confianza y decisión; no castiga directamente la nota del proveedor.</small></div></div>:support?.status==='not_imported'?<div className="notice"><b>Evidencia física v2 pendiente de carga.</b> El score sigue operativo con evidencia canónica histórica y live; la recomendación queda provisional hasta incorporar las cadenas físicas.</div>:support?.status==='migration_required'?<div className="notice warning">La tabla de cadenas físicas v2 todavía no está disponible en este entorno.</div>:null}
  <div className="supplier-score-list">{suppliers.map(supplier=><SupplierScoreRow supplier={supplier} economics={economicMap.get(normalize(supplier.supplier))} support={supportMap.get(normalize(supplier.supplier))} supportStatus={support?.status} key={`${supplier.supplierId??'history'}-${supplier.supplier}`}/>)}</div>
  <p className="source-note supplier-score-rule">{data?.method?.rule}</p>
  {economics?.method?.rule?<p className="source-note supplier-score-rule">{economics.method.rule}</p>:null}
  {support?.method?.rule?<p className="source-note supplier-score-rule">{support.method.rule}</p>:null}
 </section>
}

function SupplierScoreRow({supplier,economics,support,supportStatus}:{supplier:SupplierScore;economics:EconomicSupplier|undefined;support:SupportSupplier|undefined;supportStatus:SupportPayload['status']}){
 const trend=supplier.trendGradeAPoints,live=supplier.liveEvidence,evidence=supplier.evidence,purchaseScore=purchaseScoreFor(supplier,economics),decision=decisionFor(supplier,economics,support,supportStatus)
 return <details className="supplier-score-row">
  <summary>
   <span className={`supplier-score-number ${purchaseScoreClass(purchaseScore)}`}>{purchaseScore==null?'—':purchaseScore.toFixed(0)}</span>
   <div className="supplier-score-main"><b>{supplier.supplier}</b><small>Compra {purchaseScore==null?'—':nf.format(purchaseScore)} · desempeño {supplier.score==null?'—':nf.format(supplier.score)} · confianza {supplier.confidence}</small></div>
   <div className="supplier-score-volume"><b>{nf.format(supplier.receivedKg)} kg</b><small>{evidence.rowMassBalanceRows} directas · {evidence.rollforwardRows} roll-forward · {supplier.liveLots} live</small></div>
   <div className={`supplier-score-trend ${trend==null?'neutral':trend>=0?'up':'down'}`}>{trend==null?<span>Sin tendencia</span>:trend>=0?<><TrendingUp size={15}/><span>+{trend.toFixed(1)} pp Grade A</span></>:<><TrendingDown size={15}/><span>{trend.toFixed(1)} pp Grade A</span></>}</div>
  </summary>
  <div className="supplier-score-detail">
   <div className="supplier-score-method"><ShieldCheck size={18}/><div><b>{decision.label}</b><small>{decision.detail}</small></div></div>
   <p>{supplier.explanation}</p>
   <div className="supplier-score-components">{supplier.components.filter(item=>item.key!=='profitability').map(item=><article key={item.key} className={item.score==null?'pending':''}><div><span>{item.label}</span><em>{item.weight}% · {sourceLabel(item.source)}</em></div><b>{item.score==null?'—':item.score.toFixed(0)}</b><div className="supplier-component-track"><i style={{width:`${item.score??0}%`}}/></div><small>{item.detail}</small></article>)}<article className={economics?.score==null?'pending':''}><div><span>Economía de compra</span><em>10% · {economics?economicSourceLabel(economics.source):'Pendiente'}</em></div><b>{economics?.score==null?'—':economics.score.toFixed(0)}</b><div className="supplier-component-track"><i style={{width:`${economics?.score??0}%`}}/></div><small>{economics?.historical.costPerGradeAKg!=null?`${money.format(economics.historical.costPerGradeAKg)} CLP por kg Grade A útil · ${economics.historical.samples} registros directos con precio.`:economics?.live.contributionPerReceivedKg!=null?`${money.format(economics.live.contributionPerReceivedKg)} CLP de contribución live por kg recibido.`:'Sin precio + Grade A directo suficiente ni margen live completo.'}</small></article></div>
   {economics?<div className="supplier-score-method"><Scale size={18}/><div><b>Economía · score {economics.score==null?'—':nf.format(economics.score)}</b><small>{economics.historical.costPerGradeAKg==null?'Histórico útil pendiente.':`${money.format(economics.historical.costPerGradeAKg)} CLP/kg Grade A útil · precio materia prima ${economics.historical.avgRawPriceClp==null?'—':money.format(economics.historical.avgRawPriceClp)} CLP/kg · ${nf.format(economics.historical.gradeAOutputKg)} kg Grade A estimados.`}{economics.live.contributionPerReceivedKg==null?'':` Live: ${money.format(economics.live.contributionPerReceivedKg)} CLP contribución/kg recibido sobre ${economics.live.soldReceptions} recepciones vendidas.`}</small></div></div>:null}
   <div className="supplier-score-evidence">
    <div><Scale size={15}/><span><b>{evidence.rowMassBalanceRows}</b> filas directas</span></div>
    <div><Layers3 size={15}/><span><b>{evidence.rollforwardRows}</b> filas roll-forward</span></div>
    <div><Activity size={15}/><span><b>{supplier.liveLots}</b> lotes live</span></div>
    <div><ShieldCheck size={15}/><span><b>{supplier.coverage}%</b> cobertura desempeño</span></div>
    {economics?.historical.samples?<div><Scale size={15}/><span><b>{economics.historical.samples}</b> registros económicos directos</span></div>:null}
    {economics?.live.soldReceptions?<div><Award size={15}/><span><b>{economics.live.soldReceptions}</b> recepciones con venta live</span></div>:null}
    {live?<div><TrendingUp size={15}/><span><b>{live.qualitySamples}</b> señales calidad · <b>{live.yieldSamples}</b> rendimiento</span></div>:null}
    {evidence.massReviewRows?<div><AlertTriangle size={15}/><span><b>{evidence.massReviewRows}</b> revisiones de masa directas</span></div>:null}
    {support?<><div><Layers3 size={15}/><span><b>{support.physicalBlocks}</b> cadenas físicas v2</span></div><div><ShieldCheck size={15}/><span><b>{support.autoLinkedBlocks}/{support.physicalBlocks}</b> cadenas conciliadas</span></div>{support.exceptions?<div><AlertTriangle size={15}/><span><b>{support.exceptions}</b> {support.exceptions===1?'excepción física':'excepciones físicas'}</span></div>:null}</>:null}
   </div>
   <p className="source-note">Base directa {evidencePct(evidence.semanticEligiblePct)} · masa válida dentro de la base directa {evidencePct(evidence.massValidatedPct)} · guía disponible {evidencePct(evidence.guideCoveragePct)} · precio disponible {evidencePct(evidence.priceCoveragePct)} · filas con observación de fuente {evidencePct(evidence.sourceFlaggedPct)}. Calidad elegible: {evidence.qualityEligibleRows}; rendimiento elegible: {evidence.yieldEligibleRows}.{support?` Trazabilidad física ${support.traceabilityScore==null?'—':`${nf.format(support.traceabilityScore)}%`}; ${support.observations} observaciones en ${support.physicalBlocks} cadenas.`:''}</p>
   {support?.unresolved.length?<div className="notice warning"><b>Calidad debe revisar:</b> {support.unresolved.map(item=>`${item.sheetName} · bloque ${item.sourceBlock} · guía ${item.guide??'—'} · lote ${item.lotReference??'—'}`).join(' | ')}</div>:null}
   {supplier.zones.length?<div className="supplier-zone-list"><div className="section-heading"><div><span className="overline">Origen</span><h3>Desempeño por zona</h3></div></div>{supplier.zones.map(zone=><div className="supplier-zone-row" key={zone.zone}><MapPin size={14}/><b>{zone.zone}</b><span>{zone.lots} lotes · {nf.format(zone.receivedKg)} kg</span><strong>{zone.gradeAYieldPct==null?'Grade A —':`Grade A ${zone.gradeAYieldPct.toFixed(1)}%`}</strong><small>{zone.totalYieldPct==null?'Rendimiento validado —':`Rendimiento ${zone.totalYieldPct.toFixed(1)}%`} · {zone.rowMassBalanceRows} directas · {zone.rollforwardRows} roll-forward{zone.massReviewRows?` · ${zone.massReviewRows} revisión masa`:''}</small></div>)}</div>:null}
  </div>
 </details>
}

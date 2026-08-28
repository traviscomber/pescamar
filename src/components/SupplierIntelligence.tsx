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
type DecisionTone='success'|'info'|'warning'|'danger'
type Decision={label:string;detail:string;tone:DecisionTone}
const nf=new Intl.NumberFormat('es-CL',{maximumFractionDigits:1})
const scoreClass=(label:string)=>label==='Preferente'?'success':label==='Fuerte'?'info':label==='Revisar'?'danger':label==='Provisional'?'warning':''
const sourceLabel=(source:ScoreComponent['source'])=>source==='live'?'Live':source==='historical'?'Canónico':source==='mixed'?'Canónico + live':'Pendiente'
const evidencePct=(value:number|null)=>value==null?'—':`${nf.format(value)}%`
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/[^a-z0-9]/g,'')

function decisionFor(supplier:SupplierScore,support:SupportSupplier|undefined,supportStatus:SupportPayload['status']):Decision{
 if(supplier.score==null)return {label:'Esperar evidencia',detail:'Todavía no hay base suficiente para una decisión de compra objetiva.',tone:'warning'}
 if(supportStatus==='ready'&&support&&support.exceptions>0)return {label:'Revisar próxima recepción',detail:`El desempeño es utilizable, pero ${support.exceptions} ${support.exceptions===1?'cadena física requiere':'cadenas físicas requieren'} conciliación antes de aumentar exposición.`,tone:'warning'}
 if(supplier.confidence==='baja'||supplier.coverage<50)return {label:'Revisar próxima recepción',detail:'El score existe, pero la cobertura o la confianza todavía no justifican priorizar compra sin control adicional.',tone:'warning'}
 if(supplier.score>=85)return {label:'Priorizar compra',detail:'Proveedor fuerte con evidencia suficiente. Mantener control de recepción y confirmar que la tendencia no se deteriore.',tone:'success'}
 if(supplier.score>=75)return {label:'Preferir',detail:'Buen desempeño relativo. Es una alternativa prioritaria cuando especie, zona y condiciones comerciales sean comparables.',tone:'info'}
 if(supplier.score>=60)return {label:'Mantener con control',detail:'Proveedor utilizable, pero conviene exigir control de calidad y rendimiento en la siguiente recepción.',tone:'warning'}
 return {label:'Calidad antes de comprar',detail:'El desempeño observado no justifica aumentar compra sin revisión de Calidad y evidencia del próximo lote.',tone:'danger'}
}

export function SupplierIntelligence(){
 const [data,setData]=useState<Payload|null>(null),[support,setSupport]=useState<SupportPayload|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true)
 const load=useCallback(async(silent=false)=>{if(!silent)setLoading(true);try{const scoreResponse=await fetch('/api/supplier-intelligence',{cache:'no-store'}),payload=await scoreResponse.json() as Payload;if(!scoreResponse.ok)throw new Error(payload.error??'No fue posible calcular Supplier Intelligence');let supportPayload:SupportPayload|null=null;try{const supportResponse=await fetch('/api/supplier-support-intelligence',{cache:'no-store'}),candidate=await supportResponse.json() as SupportPayload;if(supportResponse.ok&&candidate.ok)supportPayload=candidate}catch{supportPayload=null}setData(payload);setSupport(supportPayload);setError('')}catch(cause){setError(cause instanceof Error?cause.message:'No fue posible calcular Supplier Intelligence')}finally{if(!silent)setLoading(false)}},[])
 useEffect(()=>{void load();const refresh=()=>void load(true),onVisibility=()=>{if(document.visibilityState==='visible')refresh()},timer=window.setInterval(()=>{if(document.visibilityState==='visible')refresh()},15000);window.addEventListener('pescamar:data-updated',refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',onVisibility);return()=>{window.clearInterval(timer);window.removeEventListener('pescamar:data-updated',refresh);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',onVisibility)}},[load])
 const suppliers=useMemo(()=>data?.suppliers??[],[data?.suppliers]),summary=data?.summary
 const supportMap=useMemo(()=>new Map((support?.suppliers??[]).map(item=>[normalize(item.supplier),item])),[support?.suppliers])
 const purchaseLeader=useMemo(()=>suppliers.find(item=>{const decision=decisionFor(item,supportMap.get(normalize(item.supplier)),support?.status);return decision.label==='Priorizar compra'})??suppliers.find(item=>item.score!=null)??null,[suppliers,supportMap,support?.status])
 if(loading&&!data)return <section className="panel supplier-intelligence"><div className="empty-inline"><Activity size={20}/><div><b>Calculando Supplier Score</b><small>Cruzando evidencia comparable con calidad, rendimiento y controles live.</small></div></div></section>
 if(error&&!data)return <section className="panel supplier-intelligence"><div className="notice error">{error}</div></section>
 const leaderDecision=purchaseLeader?decisionFor(purchaseLeader,supportMap.get(normalize(purchaseLeader.supplier)),support?.status):null
 return <section className="supplier-intelligence" aria-label="Supplier Intelligence" aria-live="polite">
  <div className="supplier-score-hero">
   <div><span className="overline">Supplier Intelligence · Erizos</span><h2>Score objetivo de proveedor</h2><p>Separa desempeño del proveedor de la forma en que cada planta registra producción. Las hojas con arrastre entre lotes quedan como evidencia, pero no se convierten en un castigo artificial al proveedor.</p></div>
   <div className="supplier-score-method"><ShieldCheck size={18}/><div><b>{data?.method?.version??'supplier-score-v1'}</b><small>Score y confianza son independientes. Sólo captura directa comparable entra a calidad/rendimiento histórico.</small></div></div>
  </div>
  {purchaseLeader&&leaderDecision?<div className="supplier-score-method"><Award size={18}/><div><b>Decisión actual · {leaderDecision.label}: {purchaseLeader.supplier}</b><small>Score {purchaseLeader.score?.toFixed(0)??'—'} · confianza {purchaseLeader.confidence}. {leaderDecision.detail}</small></div></div>:null}
  <div className="supplier-score-summary">
   <article><Award size={17}/><div><small>Proveedores puntuados</small><b>{summary?.scored??0}</b></div></article>
   <article><TrendingUp size={17}/><div><small>Preferentes</small><b>{summary?.preferred??0}</b></div></article>
   <article><ShieldCheck size={17}/><div><small>Filas directas</small><b>{summary?.rowMassBalanceRows??0}</b></div></article>
   <article><Layers3 size={17}/><div><small>Roll-forward planta</small><b>{summary?.rollforwardRows??0}</b></div></article>
  </div>
  {support?.status==='ready'?<div className="supplier-score-method"><Layers3 size={18}/><div><b>Evidencia física v2 · {support.summary?.autoLinkedBlocks??0}/{support.summary?.blocks??0} cadenas conciliadas</b><small>{support.summary?.observations??0} observaciones · {support.summary?.exceptions??0} excepciones. Esta capa modifica confianza y decisión; no castiga directamente la nota del proveedor.</small></div></div>:support?.status==='not_imported'?<div className="notice"><b>Evidencia física v2 pendiente de carga.</b> El score sigue operativo con evidencia canónica histórica y live; la recomendación queda provisional hasta incorporar las cadenas físicas.</div>:support?.status==='migration_required'?<div className="notice warning">La tabla de cadenas físicas v2 todavía no está disponible en este entorno.</div>:null}
  <div className="supplier-score-list">{suppliers.map(supplier=><SupplierScoreRow supplier={supplier} support={supportMap.get(normalize(supplier.supplier))} supportStatus={support?.status} key={`${supplier.supplierId??'history'}-${supplier.supplier}`}/>)}</div>
  <p className="source-note supplier-score-rule">{data?.method?.rule}</p>
  {support?.method?.rule?<p className="source-note supplier-score-rule">{support.method.rule}</p>:null}
 </section>
}

function SupplierScoreRow({supplier,support,supportStatus}:{supplier:SupplierScore;support:SupportSupplier|undefined;supportStatus:SupportPayload['status']}){
 const trend=supplier.trendGradeAPoints,live=supplier.liveEvidence,evidence=supplier.evidence,decision=decisionFor(supplier,support,supportStatus)
 return <details className="supplier-score-row">
  <summary>
   <span className={`supplier-score-number ${scoreClass(supplier.label)}`}>{supplier.score==null?'—':supplier.score.toFixed(0)}</span>
   <div className="supplier-score-main"><b>{supplier.supplier}</b><small>{supplier.label} · confianza {supplier.confidence} · cobertura {supplier.coverage}%</small></div>
   <div className="supplier-score-volume"><b>{nf.format(supplier.receivedKg)} kg</b><small>{evidence.rowMassBalanceRows} directas · {evidence.rollforwardRows} roll-forward · {supplier.liveLots} live</small></div>
   <div className={`supplier-score-trend ${trend==null?'neutral':trend>=0?'up':'down'}`}>{trend==null?<span>Sin tendencia</span>:trend>=0?<><TrendingUp size={15}/><span>+{trend.toFixed(1)} pp Grade A</span></>:<><TrendingDown size={15}/><span>{trend.toFixed(1)} pp Grade A</span></>}</div>
  </summary>
  <div className="supplier-score-detail">
   <div className="supplier-score-method"><ShieldCheck size={18}/><div><b>{decision.label}</b><small>{decision.detail}</small></div></div>
   <p>{supplier.explanation}</p>
   <div className="supplier-score-components">{supplier.components.map(item=><article key={item.key} className={item.score==null?'pending':''}><div><span>{item.label}</span><em>{item.weight}% · {sourceLabel(item.source)}</em></div><b>{item.score==null?'—':item.score.toFixed(0)}</b><div className="supplier-component-track"><i style={{width:`${item.score??0}%`}}/></div><small>{item.detail}</small></article>)}</div>
   <div className="supplier-score-evidence">
    <div><Scale size={15}/><span><b>{evidence.rowMassBalanceRows}</b> filas directas</span></div>
    <div><Layers3 size={15}/><span><b>{evidence.rollforwardRows}</b> filas roll-forward</span></div>
    <div><Activity size={15}/><span><b>{supplier.liveLots}</b> lotes live</span></div>
    <div><ShieldCheck size={15}/><span><b>{supplier.coverage}%</b> cobertura del score</span></div>
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

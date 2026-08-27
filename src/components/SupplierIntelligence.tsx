import {Activity,AlertTriangle,Award,MapPin,Scale,ShieldCheck,TrendingDown,TrendingUp} from 'lucide-react'
import {useCallback,useEffect,useMemo,useState} from 'react'
import './supplier-intelligence.css'

type ScoreComponent={key:string;label:string;weight:number;score:number|null;detail:string;source:'historical'|'live'|'mixed'|'pending'}
type Zone={zone:string;lots:number;receivedKg:number;gradeAYieldPct:number|null;totalYieldPct:number|null;massReviewRows:number}
type LiveEvidence={runs:number;qualitySamples:number;yieldSamples:number;controlledRuns:number}
type Evidence={canonicalLots:number;flaggedRows:number;massReviewRows:number;massValidatedPct:number|null;sourceFlaggedPct:number|null;guideCoveragePct:number|null;priceCoveragePct:number|null;qualityEligibleRows:number;yieldEligibleRows:number}
type SupplierScore={supplierId:string|null;supplier:string;score:number|null;label:string;confidence:'alta'|'media'|'baja';coverage:number;lots:number;historicalLots:number;liveLots:number;receivedKg:number;trendGradeAPoints:number|null;components:ScoreComponent[];zones:Zone[];explanation:string;lastHistoricalDate:string|null;identity:string;liveEvidence?:LiveEvidence;evidence:Evidence}
type Payload={ok?:boolean;summary?:{suppliers:number;scored:number;preferred:number;highConfidence:number;canonicalLots:number;massReviewRows:number};suppliers?:SupplierScore[];method?:{version:string;rule:string};error?:string}
const nf=new Intl.NumberFormat('es-CL',{maximumFractionDigits:1})
const scoreClass=(label:string)=>label==='Preferente'?'success':label==='Fuerte'?'info':label==='Revisar'?'danger':label==='Provisional'?'warning':''
const sourceLabel=(source:ScoreComponent['source'])=>source==='live'?'Live':source==='historical'?'Canónico':source==='mixed'?'Canónico + live':'Pendiente'
const evidencePct=(value:number|null)=>value==null?'—':`${nf.format(value)}%`

export function SupplierIntelligence(){
 const [data,setData]=useState<Payload|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true)
 const load=useCallback(async(silent=false)=>{if(!silent)setLoading(true);try{const response=await fetch('/api/supplier-intelligence',{cache:'no-store'}),payload=await response.json() as Payload;if(!response.ok)throw new Error(payload.error??'No fue posible calcular Supplier Intelligence');setData(payload);setError('')}catch(cause){setError(cause instanceof Error?cause.message:'No fue posible calcular Supplier Intelligence')}finally{if(!silent)setLoading(false)}},[])
 useEffect(()=>{void load();const refresh=()=>void load(true),onVisibility=()=>{if(document.visibilityState==='visible')refresh()},timer=window.setInterval(()=>{if(document.visibilityState==='visible')refresh()},15000);window.addEventListener('pescamar:data-updated',refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',onVisibility);return()=>{window.clearInterval(timer);window.removeEventListener('pescamar:data-updated',refresh);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',onVisibility)}},[load])
 const suppliers=useMemo(()=>data?.suppliers??[],[data?.suppliers]),summary=data?.summary
 if(loading&&!data)return <section className="panel supplier-intelligence"><div className="empty-inline"><Activity size={20}/><div><b>Calculando Supplier Score</b><small>Cruzando evidencia canónica con calidad, rendimiento y controles live.</small></div></div></section>
 if(error&&!data)return <section className="panel supplier-intelligence"><div className="notice error">{error}</div></section>
 return <section className="supplier-intelligence" aria-label="Supplier Intelligence" aria-live="polite">
  <div className="supplier-score-hero">
   <div><span className="overline">Supplier Intelligence · Erizos</span><h2>Score objetivo de proveedor</h2><p>Convierte cada recepción y proceso en evidencia para decidir a quién comprar, dónde y con qué confianza, sin castigar al proveedor por inconsistencias de la fuente.</p></div>
   <div className="supplier-score-method"><ShieldCheck size={18}/><div><b>{data?.method?.version??'supplier-score-v1'}</b><small>La nota y la confianza se calculan por separado; una fila no reconciliada reduce confianza, no score.</small></div></div>
  </div>
  <div className="supplier-score-summary">
   <article><Award size={17}/><div><small>Proveedores puntuados</small><b>{summary?.scored??0}</b></div></article>
   <article><TrendingUp size={17}/><div><small>Preferentes</small><b>{summary?.preferred??0}</b></div></article>
   <article><ShieldCheck size={17}/><div><small>Lotes canónicos</small><b>{summary?.canonicalLots??0}</b></div></article>
   <article><AlertTriangle size={17}/><div><small>Filas revisión masa</small><b>{summary?.massReviewRows??0}</b></div></article>
  </div>
  <div className="supplier-score-list">
   {suppliers.map(supplier=><SupplierScoreRow supplier={supplier} key={`${supplier.supplierId??'history'}-${supplier.supplier}`}/>) }
  </div>
  <p className="source-note supplier-score-rule">{data?.method?.rule}</p>
 </section>
}

function SupplierScoreRow({supplier}:{supplier:SupplierScore}){
 const trend=supplier.trendGradeAPoints,live=supplier.liveEvidence,evidence=supplier.evidence
 return <details className="supplier-score-row">
  <summary>
   <span className={`supplier-score-number ${scoreClass(supplier.label)}`}>{supplier.score==null?'—':supplier.score.toFixed(0)}</span>
   <div className="supplier-score-main"><b>{supplier.supplier}</b><small>{supplier.label} · confianza {supplier.confidence} · cobertura {supplier.coverage}%</small></div>
   <div className="supplier-score-volume"><b>{nf.format(supplier.receivedKg)} kg</b><small>{evidence.canonicalLots} lotes canónicos · {supplier.liveLots} live</small></div>
   <div className={`supplier-score-trend ${trend==null?'neutral':trend>=0?'up':'down'}`}>{trend==null?<span>Sin tendencia</span>:trend>=0?<><TrendingUp size={15}/><span>+{trend.toFixed(1)} pp Grade A</span></>:<><TrendingDown size={15}/><span>{trend.toFixed(1)} pp Grade A</span></>}</div>
  </summary>
  <div className="supplier-score-detail">
   <p>{supplier.explanation}</p>
   <div className="supplier-score-components">{supplier.components.map(item=><article key={item.key} className={item.score==null?'pending':''}><div><span>{item.label}</span><em>{item.weight}% · {sourceLabel(item.source)}</em></div><b>{item.score==null?'—':item.score.toFixed(0)}</b><div className="supplier-component-track"><i style={{width:`${item.score??0}%`}}/></div><small>{item.detail}</small></article>)}</div>
   <div className="supplier-score-evidence">
    <div><Scale size={15}/><span><b>{evidence.canonicalLots}</b> lotes canónicos</span></div><div><Activity size={15}/><span><b>{supplier.liveLots}</b> lotes live</span></div><div><ShieldCheck size={15}/><span><b>{supplier.coverage}%</b> cobertura del score</span></div>{live?<div><TrendingUp size={15}/><span><b>{live.qualitySamples}</b> señales calidad · <b>{live.yieldSamples}</b> rendimiento</span></div>:null}{evidence.massReviewRows?<div><AlertTriangle size={15}/><span><b>{evidence.massReviewRows}</b> filas revisión masa</span></div>:null}
   </div>
   <p className="source-note">Masa reconciliada {evidencePct(evidence.massValidatedPct)} · guía disponible {evidencePct(evidence.guideCoveragePct)} · precio disponible {evidencePct(evidence.priceCoveragePct)} · filas con observación de fuente {evidencePct(evidence.sourceFlaggedPct)}. Calidad elegible: {evidence.qualityEligibleRows}; rendimiento elegible: {evidence.yieldEligibleRows}.</p>
   {supplier.zones.length?<div className="supplier-zone-list"><div className="section-heading"><div><span className="overline">Origen</span><h3>Desempeño por zona</h3></div></div>{supplier.zones.map(zone=><div className="supplier-zone-row" key={zone.zone}><MapPin size={14}/><b>{zone.zone}</b><span>{zone.lots} lotes · {nf.format(zone.receivedKg)} kg</span><strong>{zone.gradeAYieldPct==null?'Grade A —':`Grade A ${zone.gradeAYieldPct.toFixed(1)}%`}</strong><small>{zone.totalYieldPct==null?'Rendimiento validado —':`Rendimiento ${zone.totalYieldPct.toFixed(1)}%`}{zone.massReviewRows?` · ${zone.massReviewRows} filas fuera por masa`:''}</small></div>)}</div>:null}
  </div>
 </details>
}

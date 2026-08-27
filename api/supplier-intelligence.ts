import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type HistoricalRow={supplier:string;lots:string|number;received_kg:string|number;row_mass_balance_rows:string|number;rollforward_rows:string|number;quality_samples:string|number;grade_a_yield:string|number|null;rejection_samples:string|number;rejection_yield:string|number|null;yield_samples:string|number;total_yield:string|number|null;grade_a_stddev:string|number|null;grade_a_avg:string|number|null;weight_deviation_ratio:string|number|null;recent_grade_a:string|number|null;prior_grade_a:string|number|null;first_date:string|null;last_date:string|null;flagged_rows:string|number;mass_review_rows:string|number;guide_rows:string|number;priced_rows:string|number}
type LiveRow={supplier_id:string;supplier:string;live_lots:string|number;live_runs:string|number;live_quality_samples:string|number;live_yield_samples:string|number;live_controlled_runs:string|number;live_grade_score:string|number|null;live_color_score:string|number|null;live_xray_score:string|number|null;live_yield_ratio:string|number|null;issue_runs:string|number}
type ProfitRow={supplier_id:string;supplier:string;received_kg:string|number;contribution_clp:string|number;revenue_clp:string|number}
type ZoneRow={supplier:string;zone:string;lots:string|number;received_kg:string|number;row_mass_balance_rows:string|number;rollforward_rows:string|number;quality_samples:string|number;grade_a_yield:string|number|null;yield_samples:string|number;total_yield:string|number|null;mass_review_rows:string|number}
type ComponentKey='quality'|'yield'|'consistency'|'compliance'|'profitability'|'incidents'
type Component={key:ComponentKey;label:string;weight:number;score:number|null;detail:string;source:'historical'|'live'|'mixed'|'pending'}
type Confidence='alta'|'media'|'baja'

const WEIGHTS:Record<ComponentKey,number>={quality:30,yield:25,consistency:15,compliance:10,profitability:10,incidents:10}
const clamp=(value:number,min=0,max=100)=>Math.min(max,Math.max(min,value))
const n=(value:unknown)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:0}
const nullable=(value:unknown)=>value==null||value===''?null:n(value)
const key=(value:string)=>value.trim().toLocaleLowerCase('es')
const pct=(value:number|null,digits=1)=>value==null?'Sin evidencia':`${(value*100).toFixed(digits)}%`
const component=(keyName:ComponentKey,label:string,score:number|null,detail:string,source:Component['source']):Component=>({key:keyName,label,weight:WEIGHTS[keyName],score:score==null?null:Number(clamp(score).toFixed(1)),detail,source})
function percentile(value:number|null,peers:number[]){if(value==null||!peers.length)return null;if(peers.length===1)return 50;const sorted=[...peers].sort((a,b)=>a-b),less=sorted.filter(item=>item<value).length,equal=sorted.filter(item=>item===value).length;return 100*(less+Math.max(0,equal-1)/2)/(sorted.length-1)}
function qualityLive(row:LiveRow|undefined){if(!row)return null;const parts:[number|null,number][]=[[nullable(row.live_grade_score),.6],[nullable(row.live_color_score),.25],[nullable(row.live_xray_score),.15]],available=parts.filter((item):item is [number,number]=>item[0]!=null);if(!available.length)return null;const totalWeight=available.reduce((sum,item)=>sum+item[1],0);return available.reduce((sum,item)=>sum+item[0]*item[1],0)/totalWeight}
function blendByEvidence(historicalScore:number|null,historicalSamples:number,liveScore:number|null,liveSamples:number){if(historicalScore==null)return liveScore;if(liveScore==null)return historicalScore;const historicalWeight=Math.max(0,historicalSamples),liveWeight=Math.max(0,liveSamples),total=historicalWeight+liveWeight;return total>0?(historicalScore*historicalWeight+liveScore*liveWeight)/total:liveScore}
function sourceFor(historicalScore:number|null,liveScore:number|null):Component['source']{return historicalScore!=null&&liveScore!=null?'mixed':liveScore!=null?'live':historicalScore!=null?'historical':'pending'}
function confidenceFor(coverage:number,evidenceLots:number,massReviewRatio:number):Confidence{if(massReviewRatio>.25)return'baja';if(coverage>=70&&evidenceLots>=30&&massReviewRatio<=.05)return'alta';if(coverage>=50&&evidenceLots>=10&&massReviewRatio<=.15)return'media';return'baja'}
function labelFor(score:number|null,coverage:number,evidenceLots:number,confidence:Confidence){if(score==null||coverage<40||evidenceLots<3||confidence==='baja')return'Provisional';if(score>=85)return'Preferente';if(score>=75)return'Fuerte';if(score>=60)return'Estándar';return'Revisar'}

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 try{
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
  const sql=getSql()
  const [historicalRaw,liveRaw,profitRaw,zonesRaw]=await Promise.all([
   sql`with raw as (
    select coalesce(nullif(btrim(supplier_name),''),nullif(btrim(supplier_original),''),'Proveedor no identificado') supplier,
     coalesce(received_kg,0) received_kg,coalesce(guide_kg,0) guide_kg,coalesce(difference_kg,0) difference_kg,
     case when yields ? 'grade_a' then (yields->>'grade_a')::numeric end grade_a,
     case when yields ? 'rechazo' then (yields->>'rechazo')::numeric end rejection,
     case when yields ? 'total' then (yields->>'total')::numeric end total_yield,
     coalesce((grade_breakdown->'A1'->>'kg')::numeric,0)+coalesce((grade_breakdown->'A2'->>'kg')::numeric,0)+
     coalesce((grade_breakdown->'Vj100'->>'kg')::numeric,0)+coalesce((grade_breakdown->'Vj50'->>'kg')::numeric,0)+
     coalesce((grade_breakdown->'C1'->>'kg')::numeric,0)+coalesce((grade_breakdown->'C2'->>'kg')::numeric,0)+
     coalesce((grade_breakdown->'D'->>'kg')::numeric,0)+coalesce((grade_breakdown->'PT'->>'kg')::numeric,0)+
     coalesce((grade_breakdown->'R'->>'kg')::numeric,0) reported_output_kg,
     case
      when lower(coalesce(nullif(btrim(process_site_original),''),'')) in ('curanue','santa rosa','candelaria')
       or lower(coalesce(lot_code,'')) like 'ig%'
       or lower(coalesce(lot_code,'')) like 'mdq%'
       or lower(coalesce(lot_code,'')) like 'mi%'
      then 'cross_lot_rollforward'
      else 'row_mass_balance'
     end capture_mode,
     cardinality(data_quality_flags)>0 flagged,guide_price_clp is not null priced,guide_kg is not null and guide_kg>0 guide_known,event_date,source_row
    from historical_production_records
    where record_status='operational' and source_file_hash in (select file_hash from canonical_source_files where canonical and (source_kind='production' or file_name ilike '%produccion%'))
   ),base as (
    select *,capture_mode='row_mass_balance' and received_kg>0 and reported_output_kg>received_kg mass_review from raw
   ),quality_ranked as (
    select *,row_number() over(partition by supplier order by event_date desc nulls last,source_row desc) rn
    from base where capture_mode='row_mass_balance' and grade_a is not null and not mass_review
   ),trend as (
    select supplier,
     sum(received_kg*grade_a) filter(where rn<=10)/nullif(sum(received_kg) filter(where rn<=10),0) recent_grade_a,
     sum(received_kg*grade_a) filter(where rn between 11 and 20)/nullif(sum(received_kg) filter(where rn between 11 and 20),0) prior_grade_a
    from quality_ranked group by supplier
   )
   select b.supplier,count(*) lots,sum(b.received_kg) received_kg,
    count(*) filter(where b.capture_mode='row_mass_balance')::int row_mass_balance_rows,
    count(*) filter(where b.capture_mode='cross_lot_rollforward')::int rollforward_rows,
    count(b.grade_a) filter(where b.capture_mode='row_mass_balance' and not b.mass_review) quality_samples,
    sum(b.received_kg*b.grade_a) filter(where b.capture_mode='row_mass_balance' and b.grade_a is not null and not b.mass_review)/nullif(sum(b.received_kg) filter(where b.capture_mode='row_mass_balance' and b.grade_a is not null and not b.mass_review),0) grade_a_yield,
    count(b.rejection) filter(where b.capture_mode='row_mass_balance' and not b.mass_review) rejection_samples,
    sum(b.received_kg*b.rejection) filter(where b.capture_mode='row_mass_balance' and b.rejection is not null and not b.mass_review)/nullif(sum(b.received_kg) filter(where b.capture_mode='row_mass_balance' and b.rejection is not null and not b.mass_review),0) rejection_yield,
    count(b.total_yield) filter(where b.capture_mode='row_mass_balance' and not b.mass_review) yield_samples,
    sum(b.received_kg*b.total_yield) filter(where b.capture_mode='row_mass_balance' and b.total_yield is not null and not b.mass_review)/nullif(sum(b.received_kg) filter(where b.capture_mode='row_mass_balance' and b.total_yield is not null and not b.mass_review),0) total_yield,
    stddev_samp(b.grade_a) filter(where b.capture_mode='row_mass_balance' and b.grade_a is not null and not b.mass_review) grade_a_stddev,
    avg(b.grade_a) filter(where b.capture_mode='row_mass_balance' and b.grade_a is not null and not b.mass_review) grade_a_avg,
    sum(abs(b.difference_kg)) filter(where b.guide_kg>0)/nullif(sum(b.guide_kg) filter(where b.guide_kg>0),0) weight_deviation_ratio,
    count(*) filter(where b.flagged)::int flagged_rows,count(*) filter(where b.mass_review)::int mass_review_rows,
    count(*) filter(where b.guide_known)::int guide_rows,count(*) filter(where b.priced)::int priced_rows,
    t.recent_grade_a,t.prior_grade_a,min(b.event_date) first_date,max(b.event_date) last_date
   from base b left join trend t on t.supplier=b.supplier group by b.supplier,t.recent_grade_a,t.prior_grade_a order by received_kg desc`,
   sql`select p.id supplier_id,p.legal_name supplier,
    count(distinct r.id) filter(where lower(r.species) like '%eriz%') live_lots,count(u.id) live_runs,
    count(u.id) filter(where u.grade is not null or u.color_status in ('accepted','review','ng') or u.xray_status in ('passed','review','failed')) live_quality_samples,
    count(u.id) filter(where u.output_kg is not null) live_yield_samples,
    count(u.id) filter(where exists(select 1 from sea_urchin_stage_checks sc where sc.run_id=u.id and sc.status<>'pending')) live_controlled_runs,
    avg(case u.grade when 'A' then 100 when 'B' then 85 when 'C' then 65 when 'D' then 40 when 'E' then 20 end) filter(where u.grade is not null) live_grade_score,
    avg(case u.color_status when 'accepted' then 100 when 'review' then 50 when 'ng' then 0 end) filter(where u.color_status in ('accepted','review','ng')) live_color_score,
    avg(case u.xray_status when 'passed' then 100 when 'review' then 50 when 'failed' then 0 end) filter(where u.xray_status in ('passed','review','failed')) live_xray_score,
    sum(u.output_kg) filter(where u.output_kg is not null)/nullif(sum(coalesce(r.accepted_kg,greatest(0,r.gross_kg-r.tare_kg),r.gross_kg)) filter(where u.output_kg is not null),0) live_yield_ratio,
    count(u.id) filter(where exists(select 1 from sea_urchin_stage_checks sc where sc.run_id=u.id and sc.status in ('deviation','hold'))) issue_runs
   from parties p left join receptions r on r.supplier_id=p.id left join sea_urchin_process_runs u on u.reception_id=r.id
   where p.kind='supplier'::party_kind group by p.id,p.legal_name`,
   sql`select supplier_id,supplier,received_kg,contribution_clp,revenue_clp from supplier_profitability`,
   sql`with raw as (
    select coalesce(nullif(btrim(supplier_name),''),nullif(btrim(supplier_original),''),'Proveedor no identificado') supplier,
     lower(nullif(btrim(extraction_zone),'')) zone,coalesce(received_kg,0) received_kg,
     case when yields ? 'grade_a' then (yields->>'grade_a')::numeric end grade_a,
     case when yields ? 'total' then (yields->>'total')::numeric end total_yield,
     coalesce((grade_breakdown->'A1'->>'kg')::numeric,0)+coalesce((grade_breakdown->'A2'->>'kg')::numeric,0)+
     coalesce((grade_breakdown->'Vj100'->>'kg')::numeric,0)+coalesce((grade_breakdown->'Vj50'->>'kg')::numeric,0)+
     coalesce((grade_breakdown->'C1'->>'kg')::numeric,0)+coalesce((grade_breakdown->'C2'->>'kg')::numeric,0)+
     coalesce((grade_breakdown->'D'->>'kg')::numeric,0)+coalesce((grade_breakdown->'PT'->>'kg')::numeric,0)+coalesce((grade_breakdown->'R'->>'kg')::numeric,0) reported_output_kg,
     case
      when lower(coalesce(nullif(btrim(process_site_original),''),'')) in ('curanue','santa rosa','candelaria')
       or lower(coalesce(lot_code,'')) like 'ig%' or lower(coalesce(lot_code,'')) like 'mdq%' or lower(coalesce(lot_code,'')) like 'mi%'
      then 'cross_lot_rollforward' else 'row_mass_balance' end capture_mode
    from historical_production_records
    where record_status='operational' and source_file_hash in (select file_hash from canonical_source_files where canonical and (source_kind='production' or file_name ilike '%produccion%'))
   ),base as (select *,capture_mode='row_mass_balance' and received_kg>0 and reported_output_kg>received_kg mass_review from raw)
   select supplier,zone,count(*) lots,sum(received_kg) received_kg,
    count(*) filter(where capture_mode='row_mass_balance')::int row_mass_balance_rows,
    count(*) filter(where capture_mode='cross_lot_rollforward')::int rollforward_rows,
    count(grade_a) filter(where capture_mode='row_mass_balance' and not mass_review) quality_samples,
    sum(received_kg*grade_a) filter(where capture_mode='row_mass_balance' and grade_a is not null and not mass_review)/nullif(sum(received_kg) filter(where capture_mode='row_mass_balance' and grade_a is not null and not mass_review),0) grade_a_yield,
    count(total_yield) filter(where capture_mode='row_mass_balance' and not mass_review) yield_samples,
    sum(received_kg*total_yield) filter(where capture_mode='row_mass_balance' and total_yield is not null and not mass_review)/nullif(sum(received_kg) filter(where capture_mode='row_mass_balance' and total_yield is not null and not mass_review),0) total_yield,
    count(*) filter(where mass_review)::int mass_review_rows
   from base where zone is not null group by supplier,zone order by supplier,received_kg desc`
  ])
  const historical=(Array.isArray(historicalRaw)?historicalRaw:[]) as HistoricalRow[]
  const live=(Array.isArray(liveRaw)?liveRaw:[]) as LiveRow[]
  const profits=(Array.isArray(profitRaw)?profitRaw:[]) as ProfitRow[]
  const zones=(Array.isArray(zonesRaw)?zonesRaw:[]) as ZoneRow[]
  const histMap=new Map(historical.map(row=>[key(row.supplier),row])),liveMap=new Map(live.map(row=>[key(row.supplier),row])),profitMap=new Map(profits.map(row=>[key(row.supplier),row]))
  const names=new Map<string,string>();for(const row of historical)names.set(key(row.supplier),row.supplier);for(const row of live)names.set(key(row.supplier),row.supplier);for(const row of profits)names.set(key(row.supplier),row.supplier)
  const profitabilityPeers=profits.map(row=>{const received=n(row.received_kg),contribution=n(row.contribution_clp);return received>0?contribution/received:null}).filter((value):value is number=>value!=null&&Number.isFinite(value))
  const suppliers=[...names.entries()].map(([normalizedName,name])=>{
   const h=histMap.get(normalizedName),l=liveMap.get(normalizedName),p=profitMap.get(normalizedName)
   const historicalLots=n(h?.lots),rowMassBalanceRows=n(h?.row_mass_balance_rows),rollforwardRows=n(h?.rollforward_rows),liveLots=n(l?.live_lots),lots=historicalLots+liveLots,evidenceLots=rowMassBalanceRows+liveLots
   const histQualitySamples=n(h?.quality_samples),gradeAYield=nullable(h?.grade_a_yield),rejectionYield=nullable(h?.rejection_yield)
   const historicalQuality=histQualitySamples>0&&gradeAYield!=null?100*gradeAYield*(rejectionYield==null?1:Math.max(0,1-rejectionYield)):null
   const liveQualitySamples=n(l?.live_quality_samples),liveQuality=qualityLive(l),qualityScore=blendByEvidence(historicalQuality,histQualitySamples,liveQuality,liveQualitySamples)
   const histYieldSamples=n(h?.yield_samples),historicalYield=histYieldSamples>0&&nullable(h?.total_yield)!=null?100*n(h?.total_yield):null
   const liveYieldSamples=n(l?.live_yield_samples),liveYield=liveYieldSamples>0&&nullable(l?.live_yield_ratio)!=null?100*n(l?.live_yield_ratio):null,yieldScore=blendByEvidence(historicalYield,histYieldSamples,liveYield,liveYieldSamples)
   const gradeAvg=nullable(h?.grade_a_avg),gradeStd=nullable(h?.grade_a_stddev),consistencyScore=histQualitySamples>=5&&gradeAvg!=null&&gradeAvg>0&&gradeStd!=null?100*(1-Math.min(1,gradeStd/gradeAvg)):null
   const deviation=nullable(h?.weight_deviation_ratio),complianceScore=deviation==null?null:100-(deviation*100*5)
   const receivedLive=n(p?.received_kg),contribution=n(p?.contribution_clp),contributionPerKg=receivedLive>0?contribution/receivedLive:null,profitabilityScore=contributionPerKg==null?null:percentile(contributionPerKg,profitabilityPeers)
   const liveRuns=n(l?.live_runs),controlledRuns=n(l?.live_controlled_runs),issueRuns=n(l?.issue_runs),incidentScore=controlledRuns>0?100*(1-Math.min(1,issueRuns/controlledRuns)):null
   const qualitySource=sourceFor(historicalQuality,liveQuality),yieldSource=sourceFor(historicalYield,liveYield)
   const massReviewRows=n(h?.mass_review_rows),flaggedRows=n(h?.flagged_rows),guideRows=n(h?.guide_rows),pricedRows=n(h?.priced_rows),massReviewRatio=rowMassBalanceRows>0?massReviewRows/rowMassBalanceRows:0
   const components:Component[]=[
    component('quality','Calidad',qualityScore,qualityScore==null?'Esperando Grade A validado o controles live de color/rayos X.':liveQuality!=null?`${histQualitySamples} muestras canónicas directas + ${liveQualitySamples} procesos live incorporados al score.`:`Grade A canónico ${pct(gradeAYield)}${rejectionYield==null?'':` · rechazo ${pct(rejectionYield)}`}.`,qualitySource),
    component('yield','Rendimiento',yieldScore,yieldScore==null?'Sin rendimiento de captura directa físicamente reconciliado suficiente.':liveYield!=null?`${histYieldSamples} rendimientos canónicos directos + ${liveYieldSamples} rendimientos live; live ${pct(nullable(l?.live_yield_ratio))}.`:`Rendimiento canónico ${pct(nullable(h?.total_yield))} sobre ${histYieldSamples} registros directos elegibles.`,yieldSource),
    component('consistency','Consistencia',consistencyScore,consistencyScore==null?'Se requieren al menos 5 muestras de Grade A comparables y directas.':`Variabilidad de Grade A sobre ${histQualitySamples} muestras canónicas directas.`,'historical'),
    component('compliance','Cumplimiento',complianceScore,deviation==null?'Sin guía/peso comparable.':`Desviación acumulada guía vs recibido ${(deviation*100).toFixed(1)}%.`,'historical'),
    component('profitability','Rentabilidad',profitabilityScore,profitabilityScore==null?'Se activa con contribución real por proveedor.':`${Math.round(contributionPerKg??0).toLocaleString('es-CL')} CLP de contribución por kg recibido.`,'live'),
    component('incidents','Incidencias',incidentScore,incidentScore==null?'Se activa con el primer proceso live controlado.':`${issueRuns} de ${controlledRuns} procesos controlados con al menos una desviación/hold.`,'live')
   ]
   const available=components.filter(item=>item.score!=null),coverage=available.reduce((sum,item)=>sum+item.weight,0),weighted=available.reduce((sum,item)=>sum+(item.score??0)*item.weight,0),score=coverage?Number((weighted/coverage).toFixed(1)):null
   const confidence=confidenceFor(coverage,evidenceLots,massReviewRatio)
   const recent=nullable(h?.recent_grade_a),prior=nullable(h?.prior_grade_a),trend=recent!=null&&prior!=null?Number(((recent-prior)*100).toFixed(1)):null
   const supplierZones=zones.filter(row=>key(row.supplier)===normalizedName).map(row=>({zone:row.zone,lots:n(row.lots),receivedKg:n(row.received_kg),rowMassBalanceRows:n(row.row_mass_balance_rows),rollforwardRows:n(row.rollforward_rows),gradeAYieldPct:nullable(row.grade_a_yield)==null?null:Number((n(row.grade_a_yield)*100).toFixed(1)),totalYieldPct:nullable(row.total_yield)==null?null:Number((n(row.total_yield)*100).toFixed(1)),massReviewRows:n(row.mass_review_rows)})).sort((a,b)=>(b.gradeAYieldPct??-1)-(a.gradeAYieldPct??-1)||b.receivedKg-a.receivedKg).slice(0,4)
   const ranked=available.slice().sort((a,b)=>(b.score??0)-(a.score??0)),strong=ranked[0],weak=ranked[ranked.length-1]
   const rollforwardNote=rollforwardRows?` ${rollforwardRows} filas históricas usan captura roll-forward de planta y no entran a masa/rendimiento; no reducen la nota del proveedor.`:''
   const massNote=massReviewRows?` ${massReviewRows} filas de captura directa sí requieren revisar masa; reducen confianza, no score.`:''
   const explanation=(score==null?'Todavía no existe evidencia suficiente para puntuar este proveedor.':`${strong?`Fortaleza: ${strong.label.toLowerCase()} ${strong.score?.toFixed(0)}.`:''}${weak&&weak.key!==strong?.key?` Principal brecha: ${weak.label.toLowerCase()} ${weak.score?.toFixed(0)}.`:''}${trend!=null&&Math.abs(trend)>=5?` Grade A ${trend>0?'sube':'baja'} ${Math.abs(trend).toFixed(1)} pp en los últimos registros comparables.`:''}`.trim())+rollforwardNote+massNote
   return {supplierId:l?.supplier_id??p?.supplier_id??null,supplier:name,score,label:labelFor(score,coverage,evidenceLots,confidence),confidence,coverage,lots,historicalLots,liveLots,receivedKg:n(h?.received_kg)+receivedLive,trendGradeAPoints:trend,components,zones:supplierZones,explanation,lastHistoricalDate:h?.last_date??null,identity:l?.supplier_id||p?.supplier_id?'canonical-or-exact-name':'canonical-history-only',liveEvidence:{runs:liveRuns,qualitySamples:liveQualitySamples,yieldSamples:liveYieldSamples,controlledRuns},evidence:{canonicalLots:historicalLots,rowMassBalanceRows,rollforwardRows,flaggedRows,massReviewRows,massValidatedPct:rowMassBalanceRows?Number(((rowMassBalanceRows-massReviewRows)/rowMassBalanceRows*100).toFixed(1)):null,semanticEligiblePct:historicalLots?Number((rowMassBalanceRows/historicalLots*100).toFixed(1)):null,sourceFlaggedPct:historicalLots?Number((flaggedRows/historicalLots*100).toFixed(1)):null,guideCoveragePct:historicalLots?Number((guideRows/historicalLots*100).toFixed(1)):null,priceCoveragePct:historicalLots?Number((pricedRows/historicalLots*100).toFixed(1)):null,qualityEligibleRows:histQualitySamples,yieldEligibleRows:histYieldSamples}}
  }).sort((a,b)=>(b.score??-1)-(a.score??-1)||b.receivedKg-a.receivedKg)
  const scored=suppliers.filter(item=>item.score!=null),preferred=scored.filter(item=>item.label==='Preferente').length,highConfidence=scored.filter(item=>item.confidence==='alta').length
  const canonicalLots=suppliers.reduce((sum,item)=>sum+item.evidence.canonicalLots,0),rowMassBalanceRows=suppliers.reduce((sum,item)=>sum+item.evidence.rowMassBalanceRows,0),rollforwardRows=suppliers.reduce((sum,item)=>sum+item.evidence.rollforwardRows,0),massReviewRows=suppliers.reduce((sum,item)=>sum+item.evidence.massReviewRows,0)
  return res.status(200).json({ok:true,method:{version:'supplier-score-v1.3-capture-semantics',weights:WEIGHTS,rule:'El score separa proveedor de semántica de planta. En la fuente 2026, Curanue/Isla Guafo (IG), Santa Rosa (MDQ) y candelaria/Cesar (MI) usan captura roll-forward entre grados/destinos; esas filas conservan volumen, guía y precio, pero no entran a masa, calidad-rendimiento ni consistencia como si fueran una sola recepción. Sólo fallas de masa en captura directa reducen confianza; nunca castigan directamente la nota. Evidencia live continúa entrando por Grade/color/rayos X/rendimiento.'},summary:{suppliers:suppliers.length,scored:scored.length,preferred,highConfidence,canonicalLots,rowMassBalanceRows,rollforwardRows,massReviewRows},suppliers})
 }catch(error){const message=error instanceof Error?error.message:'';return res.status(message.includes('historical_production_records')||message.includes('supplier_profitability')||message.includes('canonical_source_files')?503:500).json({ok:false,error:message.includes('canonical_source_files')?'Falta el registro de fuentes canónicas para calcular Supplier Score':message.includes('historical_production_records')?'Falta inteligencia histórica para calcular Supplier Score':message.includes('supplier_profitability')?'Falta la proyección de rentabilidad por proveedor':'No fue posible calcular Supplier Intelligence'})}
}
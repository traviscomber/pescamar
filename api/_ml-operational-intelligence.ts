import type {SessionOperator} from './_auth.js'
import {getSql} from './_db.js'

const ML_OPERATIONAL_VERSION='seafood.ml.operational.v2' as const

type Row=Record<string,unknown>
type SignalClass='normal'|'change'|'deviation'|'new_pattern'
type Sample={date:string;month:string;supplier:string;site:string;receivedKg:number;guideDiffPct:number|null;flagged:boolean}
type Cohort={key:string;supplier:string;site:string;samples:Sample[]}
type MonthlyAggregate={month:string;rows:number;receivedKg:number;flaggedRows:number;guideDiffValues:number[];cohortKeys:Set<string>}

const rows=(value:unknown)=>Array.isArray(value)?value as Row[]:[]
const text=(value:unknown)=>String(value??'').trim()
const finite=(value:unknown)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:null}
const round=(value:number,digits=2)=>Number(value.toFixed(digits))
const normalized=(value:unknown)=>text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim()
const canonicalSite=(value:unknown)=>{const raw=text(value),key=normalized(raw);if(key==='pescamar')return'Pescamar';if(key==='curanue')return'Curanue';if(key==='santa rosa')return'Santa Rosa';if(key==='candelaria')return'Candelaria';if(key==='piedra azul')return'Piedra Azul';return raw||'Sin planta'}
const median=(values:number[])=>{if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2}
const mad=(values:number[],center:number)=>median(values.map(value=>Math.abs(value-center)))
const robustZ=(value:number,values:number[])=>{const center=median(values);if(center==null)return null;const spread=mad(values,center);if(spread==null||spread===0)return null;return 0.6745*(value-center)/spread}
const confidence=(samples:number)=>samples>=30?'high':samples>=15?'medium':'low'
const cohortKey=(supplier:string,site:string)=>`${normalized(supplier)}|${normalized(site)}`
const signalLabel=(signalClass:SignalClass)=>({normal:'Normal',change:'Cambio',deviation:'Desviación',new_pattern:'Patrón nuevo'} as const)[signalClass]

function sampleFromRow(row:Row):Sample|null{
 const date=text(row.event_date),supplier=text(row.supplier),receivedKg=finite(row.received_kg),guideKg=finite(row.guide_kg)
 if(!date||!supplier||receivedKg==null)return null
 const guideDiffPct=guideKg&&guideKg>0?round((guideKg-receivedKg)/guideKg*100,3):null
 return {date,month:date.slice(0,7),supplier,site:canonicalSite(row.process_site),receivedKg,guideDiffPct,flagged:Array.isArray(row.data_quality_flags)&&row.data_quality_flags.length>0}
}

function classifyRobust(value:number,baseline:number[],isNewPattern=false):SignalClass{
 if(isNewPattern)return'new_pattern'
 const z=robustZ(value,baseline)
 if(z==null)return'normal'
 const score=Math.abs(z)
 if(score>=3.5)return'deviation'
 if(score>=1.5)return'change'
 return'normal'
}

export async function buildMlOperationalIntelligence(operator:SessionOperator){
 const sql=getSql()
 const [rawProduction,rawPacking]=await Promise.all([
  sql`select event_date,
    coalesce(nullif(btrim(supplier_name),''),nullif(btrim(supplier_original),''),'Sin proveedor') supplier,
    coalesce(nullif(btrim(process_site_original),''),nullif(btrim(plant_id),''),'Sin planta') process_site,
    guide_kg,received_kg,data_quality_flags
   from historical_production_records
   where record_status='operational' and event_date is not null and received_kg is not null
   order by event_date`,
  sql`select production_date,pack_format,total_kg,data_quality_flags
   from canonical_packing_boxes
   where production_date is not null
   order by production_date`
 ])
 const samples=rows(rawProduction).map(sampleFromRow).filter((sample):sample is Sample=>Boolean(sample))
 const grouped=new Map<string,Cohort>()
 for(const sample of samples){const key=cohortKey(sample.supplier,sample.site),current=grouped.get(key)??{key,supplier:sample.supplier,site:sample.site,samples:[]};current.samples.push(sample);grouped.set(key,current)}
 const cohorts=[...grouped.values()].filter(cohort=>cohort.samples.length>=8).map(cohort=>{
  const lotValues=cohort.samples.map(sample=>sample.receivedKg)
  const diffValues=cohort.samples.map(sample=>sample.guideDiffPct).filter((value):value is number=>value!=null)
  const lotMedian=median(lotValues),diffMedian=median(diffValues)
  return {supplier:cohort.supplier,site:cohort.site,samples:cohort.samples.length,firstDate:cohort.samples[0]?.date??null,lastDate:cohort.samples.at(-1)?.date??null,baseline:{receivedKgMedian:lotMedian==null?null:round(lotMedian,1),guideDiffPctMedian:diffMedian==null?null:round(diffMedian,2)},confidence:confidence(cohort.samples.length)}
 }).sort((a,b)=>b.samples-a.samples)

 const monthlyMap=new Map<string,MonthlyAggregate>()
 for(const sample of samples){
  const current=monthlyMap.get(sample.month)??{month:sample.month,rows:0,receivedKg:0,flaggedRows:0,guideDiffValues:[],cohortKeys:new Set<string>()}
  current.rows+=1;current.receivedKg+=sample.receivedKg;if(sample.flagged)current.flaggedRows+=1;if(sample.guideDiffPct!=null)current.guideDiffValues.push(sample.guideDiffPct);current.cohortKeys.add(cohortKey(sample.supplier,sample.site));monthlyMap.set(sample.month,current)
 }
 const monthly=[...monthlyMap.values()].sort((a,b)=>a.month.localeCompare(b.month))
 const monthlyKgBaseline=monthly.map(item=>item.receivedKg)
 const monthlyRowsBaseline=monthly.map(item=>item.rows)
 const firstSeen=new Map<string,string>()
 for(const sample of samples){const key=cohortKey(sample.supplier,sample.site),existing=firstSeen.get(key);if(!existing||sample.month<existing)firstSeen.set(key,sample.month)}
 const activityPattern=monthly.map(item=>{
  const newCohorts=[...item.cohortKeys].filter(key=>firstSeen.get(key)===item.month&&grouped.get(key)!.samples.length>=3)
  const signalClass=classifyRobust(item.receivedKg,monthlyKgBaseline,newCohorts.length>0&&item.month===monthly.at(-1)?.month)
  const guideDiffMedian=median(item.guideDiffValues)
  return {month:item.month,rows:item.rows,receivedKg:round(item.receivedKg,1),flaggedRows:item.flaggedRows,flagRatePct:round(item.rows?item.flaggedRows/item.rows*100:0,1),guideDiffPctMedian:guideDiffMedian==null?null:round(guideDiffMedian,2),lotCountRobustZ:round(robustZ(item.rows,monthlyRowsBaseline)??0,2),kgRobustZ:round(robustZ(item.receivedKg,monthlyKgBaseline)??0,2),signalClass,label:signalLabel(signalClass),newCohorts:newCohorts.length,confidence:item.rows>=15?'derived':'needs-human-validation'}
 })

 const anomalies=samples.flatMap(sample=>{
  const cohort=grouped.get(cohortKey(sample.supplier,sample.site))
  if(!cohort||cohort.samples.length<8)return[]
  const lotZ=robustZ(sample.receivedKg,cohort.samples.map(item=>item.receivedKg))
  const diffValues=cohort.samples.map(item=>item.guideDiffPct).filter((value):value is number=>value!=null)
  const diffZ=sample.guideDiffPct==null?null:robustZ(sample.guideDiffPct,diffValues)
  const score=Math.max(Math.abs(lotZ??0),Math.abs(diffZ??0))
  if(score<3.5)return[]
  return [{date:sample.date,supplier:sample.supplier,site:sample.site,receivedKg:sample.receivedKg,guideDiffPct:sample.guideDiffPct,score:round(score,2),signalClass:'deviation' as const,label:signalLabel('deviation'),drivers:[Math.abs(lotZ??0)>=3.5?'lot_size':null,Math.abs(diffZ??0)>=3.5?'guide_reception_difference':null].filter(Boolean),confidence:'derived' as const,recommendedReview:'Revisar evidencia fuente y contexto operativo antes de atribuir causa.'}]
 }).sort((a,b)=>b.date.localeCompare(a.date)||b.score-a.score).slice(0,20)

 const packingByFormat=new Map<string,{format:string;rows:number;kg:number;flaggedRows:number;missingLotReference:number}>()
 for(const row of rows(rawPacking)){
  const format=text(row.pack_format).toUpperCase()||'SIN FORMATO',current=packingByFormat.get(format)??{format,rows:0,kg:0,flaggedRows:0,missingLotReference:0},flags=Array.isArray(row.data_quality_flags)?row.data_quality_flags.map(text):[]
  current.rows+=1;current.kg+=finite(row.total_kg)??0;if(flags.length)current.flaggedRows+=1;if(flags.includes('missing_lot_reference'))current.missingLotReference+=1;packingByFormat.set(format,current)
 }
 const packingTraceability=[...packingByFormat.values()].map(item=>{
  const missingPct=item.rows?item.missingLotReference/item.rows*100:0
  const signalClass:SignalClass=item.missingLotReference===0?'normal':missingPct>=50?'deviation':'change'
  return {format:item.format,rows:item.rows,totalKg:round(item.kg,1),flaggedRows:item.flaggedRows,missingLotReference:item.missingLotReference,missingLotReferencePct:round(missingPct,1),signalClass,label:signalLabel(signalClass),interpretation:item.missingLotReference?'Brecha de trazabilidad: falta referencia de lote en packing. No es evidencia de defecto de calidad del producto.':'Sin brecha de referencia de lote observada en este formato.',confidence:'observed' as const}
 }).sort((a,b)=>b.rows-a.rows)

 const latestDate=samples.map(sample=>sample.date).sort().at(-1)??null
 const activeCohorts=cohorts.filter(cohort=>cohort.confidence!=='low').length
 const source={id:'ml_intelligence',label:'ML · patrones históricos explicables',path:'/pescamar-ia',rows:cohorts.length,freshness:latestDate}
 return {source,data:{schemaVersion:ML_OPERATIONAL_VERSION,model:{kind:'explainable_robust_historical_signals',features:['supplier','process_site','received_kg','guide_reception_difference_pct','monthly_activity','packing_lot_reference_completeness'],minimumCohortSamples:8,anomalyThresholdRobustZ:3.5,changeThresholdRobustZ:1.5,trainingRows:samples.length,cohorts:cohorts.length,activeCohorts},scope:{role:operator.role,historicalOnly:true},signalVocabulary:{normal:'Normal',change:'Cambio',deviation:'Desviación',new_pattern:'Patrón nuevo'},cohorts:cohorts.slice(0,25),activityPattern:activityPattern.slice(-18),recentAnomalies:anomalies,packingTraceability,boundary:{writesOperationalState:false,approvesMaterialActions:false,predictsFutureQuantities:false,historicalOnly:true,livePlantMappingEstablished:false,gradeBreakdownExcluded:true,gradeBreakdownReason:'Las categorías históricas de grade_breakdown no están demostradas como mutuamente excluyentes ni comparten un denominador seguro; no se usan como yield ni como feature ML.',rule:'El ML clasifica patrones históricos como Normal, Cambio, Desviación o Patrón nuevo. No prueba causalidad, calidad, merma, fraude ni incumplimiento; packing con missing_lot_reference indica brecha de trazabilidad, no defecto de producto. Ninguna señal reemplaza evidencia live ni decisión humana.'}}}
}

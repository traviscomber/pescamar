import type {SessionOperator} from './_auth.js'
import {getSql} from './_db.js'

const ML_OPERATIONAL_VERSION='seafood.ml.operational.v1' as const

type Row=Record<string,unknown>
type Sample={date:string;supplier:string;site:string;receivedKg:number;guideDiffPct:number|null;flagged:boolean}
type Cohort={key:string;supplier:string;site:string;samples:Sample[]}

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

function sampleFromRow(row:Row):Sample|null{
 const date=text(row.event_date),supplier=text(row.supplier),receivedKg=finite(row.received_kg),guideKg=finite(row.guide_kg)
 if(!date||!supplier||receivedKg==null)return null
 const guideDiffPct=guideKg&&guideKg>0?round((guideKg-receivedKg)/guideKg*100,3):null
 return {date,supplier,site:canonicalSite(row.process_site),receivedKg,guideDiffPct,flagged:Array.isArray(row.data_quality_flags)&&row.data_quality_flags.length>0}
}

export async function buildMlOperationalIntelligence(operator:SessionOperator){
 const sql=getSql()
 const raw=await sql`select event_date,
   coalesce(nullif(btrim(supplier_name),''),nullif(btrim(supplier_original),''),'Sin proveedor') supplier,
   coalesce(nullif(btrim(process_site_original),''),nullif(btrim(plant_id),''),'Sin planta') process_site,
   guide_kg,received_kg,data_quality_flags
  from historical_production_records
  where record_status='operational' and event_date is not null and received_kg is not null
  order by event_date`
 const samples=rows(raw).map(sampleFromRow).filter((sample):sample is Sample=>Boolean(sample))
 const grouped=new Map<string,Cohort>()
 for(const sample of samples){const key=`${normalized(sample.supplier)}|${normalized(sample.site)}`,current=grouped.get(key)??{key,supplier:sample.supplier,site:sample.site,samples:[]};current.samples.push(sample);grouped.set(key,current)}
 const cohorts=[...grouped.values()].filter(cohort=>cohort.samples.length>=8).map(cohort=>{
  const lotValues=cohort.samples.map(sample=>sample.receivedKg)
  const diffValues=cohort.samples.map(sample=>sample.guideDiffPct).filter((value):value is number=>value!=null)
  const lotMedian=median(lotValues),diffMedian=median(diffValues)
  return {supplier:cohort.supplier,site:cohort.site,samples:cohort.samples.length,firstDate:cohort.samples[0]?.date??null,lastDate:cohort.samples.at(-1)?.date??null,baseline:{receivedKgMedian:lotMedian==null?null:round(lotMedian,1),guideDiffPctMedian:diffMedian==null?null:round(diffMedian,2)},confidence:confidence(cohort.samples.length)}
 }).sort((a,b)=>b.samples-a.samples)
 const latestDate=samples.map(sample=>sample.date).sort().at(-1)??null
 const anomalies=samples.flatMap(sample=>{
  const cohort=grouped.get(`${normalized(sample.supplier)}|${normalized(sample.site)}`)
  if(!cohort||cohort.samples.length<8)return[]
  const lotZ=robustZ(sample.receivedKg,cohort.samples.map(item=>item.receivedKg))
  const diffValues=cohort.samples.map(item=>item.guideDiffPct).filter((value):value is number=>value!=null)
  const diffZ=sample.guideDiffPct==null?null:robustZ(sample.guideDiffPct,diffValues)
  const score=Math.max(Math.abs(lotZ??0),Math.abs(diffZ??0))
  if(score<3.5)return[]
  return [{date:sample.date,supplier:sample.supplier,site:sample.site,receivedKg:sample.receivedKg,guideDiffPct:sample.guideDiffPct,score:round(score,2),drivers:[Math.abs(lotZ??0)>=3.5?'lot_size':null,Math.abs(diffZ??0)>=3.5?'guide_reception_difference':null].filter(Boolean),confidence:'derived' as const}]
 }).sort((a,b)=>b.date.localeCompare(a.date)||b.score-a.score).slice(0,20)
 const activeCohorts=cohorts.filter(cohort=>cohort.confidence!=='low').length
 const source={id:'ml_intelligence',label:'ML · baseline operacional histórico',path:'/pescamar-ia',rows:cohorts.length,freshness:latestDate}
 return {source,data:{schemaVersion:ML_OPERATIONAL_VERSION,model:{kind:'explainable_robust_cohort_anomaly',features:['supplier','process_site','received_kg','guide_reception_difference_pct'],minimumCohortSamples:8,anomalyThresholdRobustZ:3.5,trainingRows:samples.length,cohorts:cohorts.length,activeCohorts},scope:{role:operator.role,historicalOnly:true},cohorts:cohorts.slice(0,25),recentAnomalies:anomalies,boundary:{writesOperationalState:false,approvesMaterialActions:false,predictsFutureQuantities:false,historicalOnly:true,livePlantMappingEstablished:false,rule:'El ML aprende patrones históricos por proveedor + centro de proceso. Sus scores detectan desviación estadística; no prueban causalidad, calidad, merma, fraude ni incumplimiento. Un score nunca reemplaza evidencia live ni decisión humana.'}}}
}

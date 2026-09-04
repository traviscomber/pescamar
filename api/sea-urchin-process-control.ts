import {requireOperator,type SessionOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>;query?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type MetricStats={count:number;mean:number|null;stdDev:number|null;min:number|null;max:number|null}
type StageRow={stage:string;actualTemperatureC:number|null;actualDurationSeconds:number|null;status:string}
type Run={runId:string;receptionId:string;receptionNumber:string;plantId:string;grade:string;status:string;supplier:string;stages:StageRow[]}

const grades=['A','B','C','D','E'] as const
const criticalStages=['blanching','thermal_shock','dripping','draining','molding','freezing'] as const
const one=(value:string|string[]|undefined)=>Array.isArray(value)?value[0]:value
const numberOrNull=(value:unknown)=>{if(value==null||value==='')return null;const number=Number(value);return Number.isFinite(number)?number:null}
function plantScope(operator:SessionOperator,requested:string){if(operator.role==='admin')return requested||null;if(requested&&!operator.plantIds.includes(requested))return 'forbidden';return requested||null}
function stats(values:number[]):MetricStats{if(!values.length)return {count:0,mean:null,stdDev:null,min:null,max:null};const mean=values.reduce((sum,value)=>sum+value,0)/values.length;const variance=values.length>1?values.reduce((sum,value)=>sum+(value-mean)**2,0)/(values.length-1):0;return {count:values.length,mean,stdDev:Math.sqrt(variance),min:Math.min(...values),max:Math.max(...values)}}
function score(value:number|null,baseline:MetricStats){if(value==null||baseline.count<5||baseline.mean==null)return null;const z=baseline.stdDev&&baseline.stdDev>0?(value-baseline.mean)/baseline.stdDev:null;const outsideObserved=baseline.min!=null&&baseline.max!=null&&(value<baseline.min||value>baseline.max);const level=outsideObserved||z!=null&&Math.abs(z)>=3?'high':z!=null&&Math.abs(z)>=2?'watch':'normal';return {value,z,outsideObserved,level,baseline}}

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 try{
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
  const requested=String(one(req.query?.plantId)??'').trim(),scope=plantScope(operator,requested)
  if(scope==='forbidden')return res.status(403).json({ok:false,error:'Planta fuera de alcance'})
  const sql=getSql(),admin=operator.role==='admin',plantIds=operator.plantIds
  const [baselineRaw,currentRaw]=await Promise.all([
   sql`select u.id run_id,u.grade,s.stage,s.actual_temperature_c,s.actual_duration_seconds
      from sea_urchin_process_runs u
      join receptions r on r.id=u.reception_id
      join sea_urchin_stage_checks s on s.run_id=u.id
      where u.grade in ('A','B','C','D','E')
        and u.status in ('ready_for_packing','closed')
        and s.stage in ('blanching','thermal_shock','dripping','draining','molding','freezing')
        and s.status not in ('pending','not_applicable')
        and (${admin} or r.plant_id=any(${plantIds}::text[]))
        and (${scope}::text is null or r.plant_id=${scope})`,
   sql`select u.id run_id,u.reception_id,u.grade,u.status,r.reception_number,r.plant_id,p.legal_name supplier,
        coalesce((select jsonb_agg(jsonb_build_object('stage',s.stage,'status',s.status,'actualTemperatureC',s.actual_temperature_c,'actualDurationSeconds',s.actual_duration_seconds) order by s.sequence_no) from sea_urchin_stage_checks s where s.run_id=u.id and s.stage in ('blanching','thermal_shock','dripping','draining','molding','freezing')),'[]'::jsonb) stages
      from sea_urchin_process_runs u
      join receptions r on r.id=u.reception_id
      join parties p on p.id=r.supplier_id
      where u.status<>'closed'
        and u.grade in ('A','B','C','D','E')
        and (${admin} or r.plant_id=any(${plantIds}::text[]))
        and (${scope}::text is null or r.plant_id=${scope})
      order by r.received_at desc`
  ])
  const baseline=new Map<string,{temperature:number[];duration:number[]}>()
  for(const item of Array.isArray(baselineRaw)?baselineRaw:[]){const row=item as Record<string,unknown>,grade=String(row.grade??''),stage=String(row.stage??'');if(!grades.includes(grade as typeof grades[number])||!criticalStages.includes(stage as typeof criticalStages[number]))continue;const key=`${grade}:${stage}`,entry=baseline.get(key)??{temperature:[],duration:[]},temperature=numberOrNull(row.actual_temperature_c),duration=numberOrNull(row.actual_duration_seconds);if(temperature!=null)entry.temperature.push(temperature);if(duration!=null)entry.duration.push(duration);baseline.set(key,entry)}
  const runs=(Array.isArray(currentRaw)?currentRaw:[]).map(item=>{const row=item as Record<string,unknown>,rawStages=Array.isArray(row.stages)?row.stages as Array<Record<string,unknown>>:[];return {runId:String(row.run_id??''),receptionId:String(row.reception_id??''),receptionNumber:String(row.reception_number??''),plantId:String(row.plant_id??''),grade:String(row.grade??''),status:String(row.status??''),supplier:String(row.supplier??''),stages:rawStages.map(stage=>({stage:String(stage.stage??''),status:String(stage.status??''),actualTemperatureC:numberOrNull(stage.actualTemperatureC),actualDurationSeconds:numberOrNull(stage.actualDurationSeconds)})).filter(stage=>criticalStages.includes(stage.stage as typeof criticalStages[number]))} satisfies Run})
  const assessments=runs.map(run=>{
   const metrics=run.stages.flatMap(stage=>{const base=baseline.get(`${run.grade}:${stage.stage}`)??{temperature:[],duration:[]},temperature=score(stage.actualTemperatureC,stats(base.temperature)),duration=score(stage.actualDurationSeconds,stats(base.duration));return [{stage:stage.stage,metric:'temperatureC' as const,assessment:temperature},{stage:stage.stage,metric:'durationSeconds' as const,assessment:duration}]}).filter(item=>item.assessment)
   const high=metrics.filter(item=>item.assessment?.level==='high'),watch=metrics.filter(item=>item.assessment?.level==='watch')
   return {runId:run.runId,receptionId:run.receptionId,receptionNumber:run.receptionNumber,plantId:run.plantId,supplier:run.supplier,grade:run.grade,status:run.status,level:high.length?'high':watch.length?'watch':'normal',highSignals:high.length,watchSignals:watch.length,metrics}
  })
  const high=assessments.filter(item=>item.level==='high'),watch=assessments.filter(item=>item.level==='watch')
  return res.status(200).json({ok:true,scope:{plantId:scope},summary:{eligibleRuns:assessments.length,high:high.length,watch:watch.length,normal:assessments.filter(item=>item.level==='normal').length},assessments,policy:{minimumBaselineLots:5,watchZ:2,highZ:3,automaticAction:false},disclaimer:'Control estadístico orientativo. No bloquea, libera ni modifica parámetros; Calidad y Operaciones revisan la evidencia.'})
 }catch(error){const message=error instanceof Error?error.message:'';return res.status(message.includes('sea_urchin_')?503:500).json({ok:false,error:message.includes('sea_urchin_')?'Falta aplicar la migración de proceso de erizo':'No fue posible calcular control estadístico de proceso'})}
}

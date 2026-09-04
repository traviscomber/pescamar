import {requireOperator,type SessionOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>;query?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type Stage={stage:string;status:string;actualTemperatureC:number|null;actualDurationSeconds:number|null}
type Run={runId:string;grade:string;inputKg:number|null;outputKg:number|null;stages:Stage[]}

const grades=['A','B','C','D','E'] as const
const criticalStages=['blanching','thermal_shock','dripping','draining','molding','freezing'] as const
const one=(value:string|string[]|undefined)=>Array.isArray(value)?value[0]:value
const numberOrNull=(value:unknown)=>{if(value==null||value==='')return null;const n=Number(value);return Number.isFinite(n)?n:null}
function plantScope(operator:SessionOperator,requested:string){if(operator.role==='admin')return requested||null;if(requested&&!operator.plantIds.includes(requested))return 'forbidden';return requested||null}
function stats(values:number[]){if(!values.length)return {count:0,avg:null,min:null,max:null};return {count:values.length,avg:values.reduce((sum,value)=>sum+value,0)/values.length,min:Math.min(...values),max:Math.max(...values)}}

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 try{
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
  const requested=String(one(req.query?.plantId)??'').trim(),scope=plantScope(operator,requested)
  if(scope==='forbidden')return res.status(403).json({ok:false,error:'Planta fuera de alcance'})
  const sql=getSql(),admin=operator.role==='admin',plantIds=operator.plantIds
  const [runsRaw,colorRaw]=await Promise.all([
   sql`select u.id run_id,u.grade,u.output_kg,coalesce(r.accepted_kg,greatest(0,r.gross_kg-r.tare_kg)) input_kg,
     coalesce((select jsonb_agg(jsonb_build_object('stage',s.stage,'status',s.status,'actualTemperatureC',s.actual_temperature_c,'actualDurationSeconds',s.actual_duration_seconds) order by s.sequence_no) from sea_urchin_stage_checks s where s.run_id=u.id and s.stage in ('blanching','thermal_shock','dripping','draining','molding','freezing')),'[]'::jsonb) stages
     from sea_urchin_process_runs u join receptions r on r.id=u.reception_id
     where u.grade in ('A','B','C','D','E') and (${admin} or r.plant_id=any(${plantIds}::text[])) and (${scope}::text is null or r.plant_id=${scope})`,
   sql`select c.run_id,c.l_mean,c.a_mean,c.b_mean,c.l_std,c.a_std,c.b_std,c.delta_e
     from sea_urchin_color_captures c join sea_urchin_process_runs u on u.id=c.run_id join receptions r on r.id=u.reception_id
     where c.confirmed_at is not null and c.decision='accepted' and u.grade in ('A','B','C','D','E') and (${admin} or r.plant_id=any(${plantIds}::text[])) and (${scope}::text is null or r.plant_id=${scope})`
  ])
  const runs=(Array.isArray(runsRaw)?runsRaw:[]).map(item=>{const row=item as Record<string,unknown>;const rawStages=Array.isArray(row.stages)?row.stages as Array<Record<string,unknown>>:[];return {runId:String(row.run_id??''),grade:String(row.grade??''),inputKg:numberOrNull(row.input_kg),outputKg:numberOrNull(row.output_kg),stages:rawStages.map(stage=>({stage:String(stage.stage??''),status:String(stage.status??''),actualTemperatureC:numberOrNull(stage.actualTemperatureC),actualDurationSeconds:numberOrNull(stage.actualDurationSeconds)})).filter(stage=>criticalStages.includes(stage.stage as typeof criticalStages[number]))} satisfies Run})
  const colorsByRun=new Map<string,Array<Record<string,unknown>>>()
  for(const item of Array.isArray(colorRaw)?colorRaw:[]){const row=item as Record<string,unknown>,runId=String(row.run_id??'');if(!runId)continue;const list=colorsByRun.get(runId)??[];list.push(row);colorsByRun.set(runId,list)}
  const profiles=grades.map(grade=>{
   const gradeRuns=runs.filter(run=>run.grade===grade),yieldRuns=gradeRuns.filter(run=>run.inputKg!=null&&run.inputKg>0&&run.outputKg!=null&&run.outputKg>=0)
   const totalInputKg=yieldRuns.reduce((sum,run)=>sum+(run.inputKg??0),0),totalOutputKg=yieldRuns.reduce((sum,run)=>sum+(run.outputKg??0),0),yieldValues=yieldRuns.map(run=>(run.outputKg??0)/(run.inputKg??1)*100)
   const stages=criticalStages.map(stage=>{const evidence=gradeRuns.map(run=>run.stages.find(item=>item.stage===stage)).filter((item):item is Stage=>Boolean(item&&item.status!=='pending'));const temperatures=evidence.map(item=>item.actualTemperatureC).filter((value):value is number=>value!=null),durations=evidence.map(item=>item.actualDurationSeconds).filter((value):value is number=>value!=null);return {stage,lots:evidence.length,deviations:evidence.filter(item=>['deviation','hold'].includes(item.status)).length,temperatureC:stats(temperatures),durationSeconds:stats(durations)}})
   const colorRows=gradeRuns.flatMap(run=>colorsByRun.get(run.runId)??[]),l=colorRows.map(row=>numberOrNull(row.l_mean)).filter((value):value is number=>value!=null),a=colorRows.map(row=>numberOrNull(row.a_mean)).filter((value):value is number=>value!=null),b=colorRows.map(row=>numberOrNull(row.b_mean)).filter((value):value is number=>value!=null),dispersion=colorRows.map(row=>{const ls=numberOrNull(row.l_std),as=numberOrNull(row.a_std),bs=numberOrNull(row.b_std);return ls==null||as==null||bs==null?null:Math.sqrt(ls*ls+as*as+bs*bs)}).filter((value):value is number=>value!=null),deltaE=colorRows.map(row=>numberOrNull(row.delta_e)).filter((value):value is number=>value!=null)
   return {grade,lots:gradeRuns.length,yield:{lots:yieldRuns.length,inputKg:totalInputKg,outputKg:totalOutputKg,pct:totalInputKg>0?totalOutputKg/totalInputKg*100:null,observedRangePct:yieldValues.length?{min:Math.min(...yieldValues),max:Math.max(...yieldValues)}:null},color:{confirmedCaptures:colorRows.length,meanLab:l.length&&a.length&&b.length?{l:l.reduce((s,v)=>s+v,0)/l.length,a:a.reduce((s,v)=>s+v,0)/a.length,b:b.reduce((s,v)=>s+v,0)/b.length}:null,meanDispersion:dispersion.length?dispersion.reduce((s,v)=>s+v,0)/dispersion.length:null,meanDeltaE:deltaE.length?deltaE.reduce((s,v)=>s+v,0)/deltaE.length:null},stages,coverage:{measuredStages:stages.filter(stage=>stage.temperatureC.count>0||stage.durationSeconds.count>0).length,totalStages:criticalStages.length},status:'observed' as const}
  })
  return res.status(200).json({ok:true,scope:{plantId:scope},profiles,disclaimer:'Perfiles observados. No son recetas, límites de proceso ni evidencia causal.'})
 }catch(error){const message=error instanceof Error?error.message:'';return res.status(message.includes('sea_urchin_')?503:500).json({ok:false,error:message.includes('sea_urchin_')?'Falta aplicar la migración de proceso de erizo':'No fue posible construir perfiles por Grade'})}
}

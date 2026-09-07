import {requireOperator} from './_auth.js'
import {hasPlantAccess} from './_plants.js'
import {getSql} from './_db.js'

type Request={method?:string;query?:Record<string,string|string[]|undefined>;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}

const labels=new Set(['good','bad'])
const clean=(value:unknown,max=80)=>String(Array.isArray(value)?value[0]??'':value??'').trim().slice(0,max)
const integer=(value:unknown,fallback:number)=>{const parsed=Number(clean(value,12));return Number.isInteger(parsed)?Math.max(1,Math.min(500,parsed)):fallback}

async function feedbackSchemaReady(){
 const sql=getSql()
 const rows=await sql`select count(*)::int as count from information_schema.columns where table_schema='public' and table_name='sea_urchin_color_captures' and column_name in ('quality_feedback_reason','quality_feedback_note','quality_learning_label','learning_eligible')`
 return Number(Array.isArray(rows)?(rows[0] as {count?:number|string}|undefined)?.count??0:0)===4
}

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 const operator=await requireOperator(req)
 if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
 if(!['admin','quality'].includes(operator.role))return res.status(403).json({ok:false,error:'Sólo Calidad o Administración puede consultar ejemplos de aprendizaje'})
 if(req.method!=='GET'){
  res.setHeader('Allow','GET')
  return res.status(405).json({ok:false,error:'Método no permitido'})
 }
 if(!(await feedbackSchemaReady()))return res.status(503).json({ok:false,error:'Falta aplicar 050_uni_vision_quality_feedback.sql'})

 const plantId=clean(req.query?.plantId,80),label=clean(req.query?.label,12),limit=integer(req.query?.limit,100)
 if(plantId&&operator.role!=='admin'&&!hasPlantAccess(operator,plantId))return res.status(403).json({ok:false,error:'Planta fuera de tu alcance'})
 if(label&&!labels.has(label))return res.status(400).json({ok:false,error:'Label inválido'})

 const sql=getSql()
 const rows=await sql`
  select
   c.id as capture_id,c.run_id,u.reception_id,r.reception_number,r.plant_id,r.species,
   c.evidence_file_id,c.source_image_sha256,c.image_sha256,c.capture_source,c.device_label,
   c.pixel_count,c.l_mean,c.a_mean,c.b_mean,c.l_std,c.a_std,c.b_std,c.chroma,c.hue_deg,
   c.suggested_grade,c.delta_e,c.operator_grade as human_grade,c.decision,
   c.quality_learning_label,c.quality_feedback_reason,c.quality_feedback_note,
   c.confirmed_by,c.confirmed_at,c.created_at
  from sea_urchin_color_captures c
  join sea_urchin_process_runs u on u.id=c.run_id
  join receptions r on r.id=u.reception_id
  where c.learning_eligible=true
   and c.quality_learning_label in ('good','bad')
   and c.confirmed_at is not null
   and c.confirmed_by_operator_id is not null
   and c.evidence_file_id is not null
   and (${plantId}='' or r.plant_id=${plantId})
   and (${label}='' or c.quality_learning_label=${label})
   and (${operator.role==='admin'} or r.plant_id=any(${operator.plantIds}::text[]))
  order by c.confirmed_at desc
  limit ${limit}
 `
 const examples=Array.isArray(rows)?rows.map(row=>{
  const item=row as Record<string,unknown>,fileId=String(item.evidence_file_id??'')
  return {...item,evidenceUrl:fileId?`/api/reception-evidence-file?id=${encodeURIComponent(fileId)}`:null,authority:'human_quality',automaticTraining:false}
 }):[]
 const good=examples.filter(item=>String((item as Record<string,unknown>).quality_learning_label)==='good').length
 const bad=examples.filter(item=>String((item as Record<string,unknown>).quality_learning_label)==='bad').length
 return res.status(200).json({ok:true,summary:{examples:examples.length,good,bad},examples,policy:{authority:'human_quality',automaticTraining:false,reviewEligible:false}})
}
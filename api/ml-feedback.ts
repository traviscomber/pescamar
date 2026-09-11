import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'
import {activeOrganization} from './_organization.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>;body?:unknown}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type Body={rating?:unknown;comment?:unknown;question?:unknown;answer?:unknown;plantId?:unknown;receptionId?:unknown;sourceIds?:unknown;policyVersion?:unknown;engine?:unknown;routerIntent?:unknown}

const text=(value:unknown,max:number)=>typeof value==='string'?value.trim().slice(0,max):''
const receptionUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function handler(request:Request,response:Response){
 response.setHeader('Cache-Control','no-store')
 if(request.method!=='POST'){response.setHeader('Allow','POST');return response.status(405).json({ok:false,error:'Método no permitido'})}
 try{
  const operator=await requireOperator(request)
  if(!operator)return response.status(401).json({ok:false,error:'Sesión requerida'})
  if(operator.organizationId!==activeOrganization.organizationId)return response.status(403).json({ok:false,error:'Organización fuera de alcance'})
  const body=(request.body&&typeof request.body==='object'?request.body:{}) as Body
  const rating=body.rating==='good'?'good':body.rating==='bad'?'bad':null
  const comment=text(body.comment,1200),question=text(body.question,1800),answer=text(body.answer,12000),plantId=text(body.plantId,120),receptionId=text(body.receptionId,80),policyVersion=text(body.policyVersion,120),engine=text(body.engine,120),routerIntent=text(body.routerIntent,160)
  const sourceIds=Array.isArray(body.sourceIds)?body.sourceIds.flatMap(value=>typeof value==='string'&&value.trim()?[value.trim().slice(0,120)]:[]).slice(0,30):[]
  if(!rating||!question||!answer)return response.status(400).json({ok:false,error:'Feedback incompleto'})
  if(rating==='bad'&&!comment)return response.status(400).json({ok:false,error:'Agrega un comentario para explicar qué estuvo incorrecto'})
  if(plantId&&operator.role!=='admin'&&!operator.plantIds.includes(plantId))return response.status(403).json({ok:false,error:'Planta fuera de alcance'})
  const scopedReceptionId=receptionUuid.test(receptionId)?receptionId:null
  if(scopedReceptionId){
   const rows=plantId
    ?await getSql()`select id from receptions where id=${scopedReceptionId}::uuid and plant_id=${plantId} limit 1`
    :operator.role==='admin'
      ?await getSql()`select id from receptions where id=${scopedReceptionId}::uuid limit 1`
      :await getSql()`select id from receptions where id=${scopedReceptionId}::uuid and plant_id=any(${operator.plantIds}::text[]) limit 1`
   if(!Array.isArray(rows)||!rows.length)return response.status(403).json({ok:false,error:'Lote fuera de alcance'})
  }
  const rows=await getSql()`insert into ml_feedback(operator_id,organization_id,operator_role,plant_id,reception_id,rating,comment,question,answer,source_ids,policy_version,engine,router_intent)
   values(${operator.id}::uuid,${operator.organizationId},${operator.role},${plantId||null},${scopedReceptionId}::uuid,${rating},${comment||null},${question},${answer},${sourceIds}::text[],${policyVersion||null},${engine||null},${routerIntent||null}) returning id,learning_status,learning_eligible,created_at`
  const saved=Array.isArray(rows)?rows[0]:null
  return response.status(201).json({ok:true,feedback:saved,boundary:{automaticTraining:false,writesOperationalState:false,trainingRequiresReview:true}})
 }catch(error){
  const message=error instanceof Error?error.message:''
  if(message.includes('ml_feedback')||message.includes('42P01'))return response.status(503).json({ok:false,error:'Feedback ML pendiente de migración canónica'})
  console.error('ml_feedback_failed',message||'unknown')
  return response.status(500).json({ok:false,error:'No fue posible guardar el feedback'})
 }
}

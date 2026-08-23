import { requireOperator } from './_auth.js'
import { ensureReceptionSchema } from './_reception-schema.js'
import { getSql } from './_db.js'

type ApiRequest={headers?:Record<string,string|string[]|undefined>}
type ApiResponse={status:(code:number)=>ApiResponse;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
declare const process:{env:Record<string,string|undefined>}
type OperationalMetrics={pendingDecisions:number;pendingCredits:number;activeOperators:number;receptions:number}

const emptyMetrics:OperationalMetrics={pendingDecisions:0,pendingCredits:0,activeOperators:0,receptions:0}

export default async function handler(request:ApiRequest,response:ApiResponse){
  response.setHeader('Cache-Control','no-store')
  const operator=await requireOperator(request)
  if(!operator)return response.status(401).json({ok:false,error:'Sesión requerida'})
  const databaseConfigured=Boolean(process.env.DATABASE_URL)
  let database=databaseConfigured,files=databaseConfigured,metrics=emptyMetrics
  if(databaseConfigured){
    try{
      await ensureReceptionSchema()
      const plantIds=operator.plantIds
      const admin=operator.role==='admin'
      const finance=operator.role==='finance'
      const operations=operator.role==='operations'
      const quality=operator.role==='quality'
      const rows=await getSql()`
        select
          (
            ${admin||finance}::boolean::int * (select count(*)::int from credit_requests where status='pending') +
            ${admin||operations||quality}::boolean::int * (select count(*)::int from receptions where status='pending' and (${admin} or plant_id=any(${plantIds}::text[]))) +
            ${admin||finance}::boolean::int * (select count(*)::int from settlements s join receptions r on r.id=s.reception_id where s.status='pending' and (${admin} or r.plant_id=any(${plantIds}::text[])))
          )::int as pending_decisions,
          case when ${admin||finance} then (select count(*)::int from credit_requests where status='pending') else 0 end as pending_credits,
          case when ${admin} then (select count(*)::int from operators where active=true) else 0 end as active_operators,
          (select count(*)::int from receptions where ${admin} or plant_id=any(${plantIds}::text[])) as receptions,
          to_regclass('public.reception_evidence_files') is not null as evidence_files_ready
      `
      const row=Array.isArray(rows)?rows[0] as Record<string,number|boolean>|undefined:undefined
      if(row){
        metrics={pendingDecisions:Number(row.pending_decisions),pendingCredits:Number(row.pending_credits),activeOperators:Number(row.active_operators),receptions:Number(row.receptions)}
        files=Boolean(row.evidence_files_ready)
      }
    }catch{database=false;files=false}
  }
  const ok=database&&files
  const issues=[!database?'database_unavailable':null,!files?'evidence_store_unavailable':null].filter(Boolean)
  response.setHeader('X-Pescamar-Health',ok?'ok':'degraded')
  return response.status(200).json({
    ok,
    service:'pescamar-control',
    platform:'vercel-functions',
    environment:process.env.VERCEL_ENV??'local',
    persistence:{database,files,fileStore:files?'neon':'unavailable'},
    metrics,
    issues,
    commit:process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,7)??null,
    checkedAt:new Date().toISOString()
  })
}

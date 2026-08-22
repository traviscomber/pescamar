import { getSql } from './_db.js'

type ApiResponse={status:(code:number)=>ApiResponse;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
declare const process:{env:Record<string,string|undefined>}
type OperationalMetrics={pendingDecisions:number;pendingCredits:number;activeOperators:number;receptions:number}

const emptyMetrics:OperationalMetrics={pendingDecisions:0,pendingCredits:0,activeOperators:0,receptions:0}

export default async function handler(_request:unknown,response:ApiResponse){
  response.setHeader('Cache-Control','no-store')
  const databaseConfigured=Boolean(process.env.DATABASE_URL)
  let database=databaseConfigured,metrics=emptyMetrics
  if(databaseConfigured){
    try{
      const rows=await getSql()`
        select
          ((select count(*) from credit_requests where status='pending') +
           (select count(*) from receptions where status='pending') +
           (select count(*) from settlements where status='pending'))::int as pending_decisions,
          (select count(*)::int from credit_requests where status='pending') as pending_credits,
          (select count(*)::int from operators where active=true) as active_operators,
          (select count(*)::int from receptions) as receptions
      `
      const row=Array.isArray(rows)?rows[0] as Record<string,number>|undefined:undefined
      if(row)metrics={pendingDecisions:Number(row.pending_decisions),pendingCredits:Number(row.pending_credits),activeOperators:Number(row.active_operators),receptions:Number(row.receptions)}
    }catch{database=false}
  }
  response.status(200).json({
    ok:true,
    service:'pescamar-control',
    platform:'vercel-functions',
    environment:process.env.VERCEL_ENV??'local',
    persistence:{database,files:Boolean(process.env.BLOB_READ_WRITE_TOKEN)},
    metrics,
    commit:process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,7)??null,
    checkedAt:new Date().toISOString()
  })
}

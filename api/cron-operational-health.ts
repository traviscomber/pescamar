import {calculateOperationalHealth} from './_operational-health-core.js'

declare const process:{env:Record<string,string|undefined>}
type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
const one=(value:string|string[]|undefined)=>Array.isArray(value)?value[0]:value
const runtimeLog=(payload:unknown)=>{try{const target=(globalThis as unknown as {console?:{log?:(value:string)=>void}}).console;target?.log?.(JSON.stringify(payload))}catch{/* Observability must never break the scheduled health check. */}}

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
 const secret=process.env.CRON_SECRET
 if(!secret){
  runtimeLog({event:'operational_health_cron',status:'disabled',reason:'cron_secret_missing',checkedAt:new Date().toISOString()})
  return res.status(200).json({ok:true,status:'disabled',reason:'CRON_SECRET no configurado'})
 }
 const authorization=one(req.headers?.authorization)
 if(authorization!==`Bearer ${secret}`)return res.status(401).json({ok:false,error:'No autorizado'})
 try{
  const result=await calculateOperationalHealth({scheduledHealthCheck:true})
  runtimeLog({event:'operational_health_cron',status:result.status,summary:result.summary,alertIds:result.alerts.map(alert=>alert.id),checkedAt:result.checkedAt,commit:result.deployment.commit})
  return res.status(200).json({ok:true,status:result.status,summary:result.summary,alerts:result.alerts.map(alert=>({id:alert.id,severity:alert.severity,domain:alert.domain})),checkedAt:result.checkedAt})
 }catch(error){
  const detail=error instanceof Error?error.message.slice(0,180):'unknown'
  runtimeLog({event:'operational_health_cron',status:'broken',error:detail,checkedAt:new Date().toISOString()})
  return res.status(500).json({ok:false,status:'broken',error:'No fue posible ejecutar supervisión programada'})
 }
}

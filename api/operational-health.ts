import {requireOperator} from './_auth.js'
import {calculateOperationalHealth} from './_operational-health-core.js'

declare const process:{env:Record<string,string|undefined>}
type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
 const operator=await requireOperator(req)
 if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
 try{
  const result=await calculateOperationalHealth({scheduledHealthCheck:Boolean(process.env.CRON_SECRET)})
  return res.status(200).json(result)
 }catch(error){
  const message=error instanceof Error?error.message:'unknown'
  return res.status(500).json({ok:false,status:'broken',error:'No fue posible calcular salud operacional',detail:message.slice(0,180),checkedAt:new Date().toISOString()})
 }
}

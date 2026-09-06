import {requireOperator} from './_auth.js'
import {getLotLifecycle,recordLotLifecycleAction} from './_lot-lifecycle.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>;query?:Record<string,string|string[]|undefined>;body?:unknown}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
const one=(value:string|string[]|undefined)=>Array.isArray(value)?value[0]:value

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 try{
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  if(req.method==='GET'){
   const lifecycle=await getLotLifecycle(operator,String(one(req.query?.receptionId)??'').trim())
   if(!lifecycle)return res.status(404).json({ok:false,error:'Lote no disponible'})
   return res.status(200).json({ok:true,...lifecycle})
  }
  if(req.method==='POST'){
   const body=req.body&&typeof req.body==='object'&&!Array.isArray(req.body)?req.body as Record<string,unknown>:{}
   const result=await recordLotLifecycleAction(operator,body.receptionId,body.action,body.reason)
   if('error' in result)return res.status(result.status).json({ok:false,error:result.error,...('blockers' in result?{blockers:result.blockers}:{})})
   return res.status(result.status).json({ok:true,...result.lifecycle})
  }
  res.setHeader('Allow','GET, POST')
  return res.status(405).json({ok:false,error:'Método no permitido'})
 }catch(error){
  console.error('lot_lifecycle_error',error instanceof Error?error.message:'unknown')
  return res.status(500).json({ok:false,error:'No fue posible actualizar el ciclo de vida del lote'})
 }
}

import {requireOperator} from './_auth.js'
import {buildCanonicalSourceHealth} from './_canonical-source-health.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}

export default async function handler(req:Request,res:Response){
  res.setHeader('Cache-Control','no-store, max-age=0')
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
  try{
    const operator=await requireOperator(req,['admin','operations'])
    if(!operator)return res.status(403).json({ok:false,error:'Permisos insuficientes'})
    const health=await buildCanonicalSourceHealth()
    return res.status(200).json({ok:true,...health})
  }catch(error){
    console.error('canonical_source_health_failed',error instanceof Error?error.message:'unknown')
    return res.status(503).json({ok:false,error:'No fue posible calcular salud de fuentes canónicas'})
  }
}

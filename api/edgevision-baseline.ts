import {requireOperator} from './_auth.js'
import {allowClientIp} from './_rate-limit.js'
import {EDGE_VISION_BASELINE_CAPABILITIES,POLICY_BOUNDARY_MESSAGE,promoteCapabilityBaseline,type EdgeVisionBaselineCapability} from './_edgevision-baseline.js'

type Request={method?:string;body?:unknown;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type Input={capability?:unknown}
const text=(value:unknown,max=120)=>String(value??'').trim().slice(0,max)

export default async function handler(req:Request,res:Response){
  res.setHeader('Cache-Control','no-store')
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false,error:'Método no permitido'})}
  try{
    const operator=await requireOperator(req,['admin'])
    if(!operator)return res.status(401).json({ok:false,error:'Sesión de administrador requerida'})
    if(!allowClientIp(req,60_000,10))return res.status(429).json({ok:false,error:'Demasiadas solicitudes de línea de base EdgeVision por minuto'})
    const input=(req.body??{}) as Input
    const capability=text(input.capability,40) as EdgeVisionBaselineCapability
    if(!(EDGE_VISION_BASELINE_CAPABILITIES as readonly string[]).includes(capability))return res.status(400).json({ok:false,error:'Capacidad inválida'})
    const result=await promoteCapabilityBaseline(capability,operator.id)
    if(!result.promoted){
      // Inert seam by design: while no validated batch meets the evidence
      // thresholds the request is refused with the policy explanation and
      // the predictive boundary stays hard (predictiveBaselineAvailable:false).
      return res.status(409).json({ok:false,promoted:false,code:result.code,reason:result.reason,policyBoundary:POLICY_BOUNDARY_MESSAGE})
    }
    return res.status(200).json({ok:true,promoted:true,batchId:result.batchId,capability:result.capability,recordedAt:result.recordedAt,note:'Provenance registrado. La frontera predictiva sigue cerrada hasta Gate 5 y Gate 7 de docs/SEAFOOD-GRADE-A.md.'})
  }catch(error){
    console.error('edgevision baseline promotion failed',error)
    if(error instanceof Error&&error.message.includes('edgevision_dataset_batches'))return res.status(503).json({ok:false,error:'Esquema EdgeVision pendiente de migración (059_edgevision_dataset_batches)'})
    return res.status(500).json({ok:false,error:'No fue posible evaluar la línea de base EdgeVision'})
  }
}

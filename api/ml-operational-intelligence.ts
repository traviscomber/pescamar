import {requireOperator} from './_auth.js'
import {buildMlOperationalIntelligence} from './_ml-operational-intelligence.js'
import {resolveRequestOrganization} from './_organization.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}

export default async function handler(request:Request,response:Response){
 response.setHeader('Cache-Control','no-store')
 if(request.method!=='GET'){response.setHeader('Allow','GET');return response.status(405).json({ok:false,error:'Método no permitido'})}
 try{
  const operator=await requireOperator(request)
  if(!operator)return response.status(401).json({ok:false,error:'Sesión requerida'})
  const organization=resolveRequestOrganization(request.headers,operator.organizationId)
  if(!organization)return response.status(409).json({ok:false,code:'ORGANIZATION_CONTEXT_UNSUPPORTED',error:'La organización solicitada no está habilitada'})
  const result=await buildMlOperationalIntelligence(operator)
  return response.status(200).json({ok:true,organizationId:organization.organizationId,generatedAt:new Date().toISOString(),...result.data,source:result.source})
 }catch(error){console.error('ml_operational_intelligence_failed',error instanceof Error?error.message:'unknown');return response.status(500).json({ok:false,error:'No fue posible construir inteligencia ML'})}
}

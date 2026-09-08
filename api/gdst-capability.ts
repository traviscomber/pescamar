import {requireOperator} from './_auth.js'
import {gdst2CapabilityProfile,gdst2EventMappings,gdst2RequiredQueryParameters} from './_gdst2.js'
import {resolveRequestOrganization} from './_organization.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}

export default async function handler(request:Request,response:Response){
  response.setHeader('Cache-Control','no-store')
  if(request.method!=='GET'){response.setHeader('Allow','GET');return response.status(405).json({ok:false,error:'Método no permitido'})}
  try{
    const operator=await requireOperator(request,['admin','operations'])
    if(!operator)return response.status(401).json({ok:false,error:'Sesión o rol requerido'})
    const organization=resolveRequestOrganization(request.headers,operator.organizationId)
    if(!organization)return response.status(409).json({ok:false,code:'ORGANIZATION_CONTEXT_UNSUPPORTED',error:'La organización solicitada no está habilitada en esta implementación'})
    return response.status(200).json({
      ok:true,
      organization:{id:organization.organizationId,implementationId:organization.implementationId,implementationName:organization.implementationName,isolationMode:organization.isolationMode},
      profile:gdst2CapabilityProfile,
      mappings:gdst2EventMappings,
      requiredQueryParameters:gdst2RequiredQueryParameters,
    })
  }catch{
    return response.status(500).json({ok:false,error:'No fue posible cargar el perfil GDST'})
  }
}

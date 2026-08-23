import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}

type IdentityRow={source_system:string;source_label:string;source_label_normalized:string;plant_id:string|null;link_status:'unlinked'|'candidate'|'confirmed'|'rejected';evidence:Record<string,unknown>;confirmed_by:string|null;confirmed_at:string|null;updated_at:string}

export default async function handler(request:Request,response:Response){
  response.setHeader('Cache-Control','no-store')
  if(request.method!=='GET'){response.setHeader('Allow','GET');return response.status(405).json({ok:false,error:'Método no permitido'})}
  try{
    const operator=await requireOperator(request)
    if(!operator)return response.status(401).json({ok:false,error:'Sesión requerida'})
    if(!['admin','operations'].includes(operator.role))return response.status(403).json({ok:false,error:'Tu rol no puede revisar identidades históricas'})
    const rows=await getSql()`select source_system,source_label,source_label_normalized,plant_id,link_status,evidence,confirmed_by,confirmed_at,updated_at from plant_identity_links order by coalesce((evidence->>'record_count')::int,0) desc,source_label_normalized`
    const identities=(Array.isArray(rows)?rows:[] as IdentityRow[]).map((raw)=>{const row=raw as IdentityRow;return {sourceSystem:row.source_system,sourceLabel:row.source_label,normalizedLabel:row.source_label_normalized,plantId:row.plant_id,status:row.link_status,evidence:row.evidence??{},confirmedBy:row.confirmed_by,confirmedAt:row.confirmed_at,updatedAt:row.updated_at}})
    const summary=identities.reduce((acc,item)=>{acc.total++;acc[item.status]++;acc.records+=Number(item.evidence?.record_count??0);return acc},{total:0,unlinked:0,candidate:0,confirmed:0,rejected:0,records:0} as Record<string,number>)
    return response.status(200).json({ok:true,summary,identities})
  }catch(error){const message=error instanceof Error?error.message:'';return response.status(message.includes('DATABASE_URL')?503:500).json({ok:false,error:message.includes('DATABASE_URL')?'Base de datos no conectada':'No fue posible cargar identidades históricas'})}
}

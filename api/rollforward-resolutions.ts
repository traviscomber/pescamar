import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}

export default async function handler(request:Request,response:Response){
 response.setHeader('Cache-Control','no-store')
 if(request.method!=='GET'){response.setHeader('Allow','GET');return response.status(405).json({ok:false,error:'Método no permitido'})}
 try{
  const operator=await requireOperator(request)
  if(!operator)return response.status(401).json({ok:false,error:'Sesión requerida'})
  const sql=getSql()
  try{
   const rows=await sql`select r.sheet_name,r.source_block,r.selected_main_source_row,r.resolution_status,r.resolution_basis,r.review_note,r.candidate_snapshot,r.reviewed_at,
     o.full_name reviewed_by
    from canonical_production_support_resolutions r
    join operators o on o.id=r.reviewed_by_operator_id
    where r.parser_version='production-support-v2'
      and r.source_file_hash in(select file_hash from canonical_source_files where canonical and (source_kind='production' or file_name ilike '%produccion%'))
    order by r.reviewed_at desc`
   return response.status(200).json({ok:true,status:'ready',parserVersion:'production-support-v2',resolutions:Array.isArray(rows)?rows:[],governance:{closedDecisionsImmutable:true,deferredDecisionsRevisable:true,priorReviewRetainedInSnapshot:true,writesLive:false}})
  }catch(error){const message=error instanceof Error?error.message:'';if(message.includes('canonical_production_support_resolutions')||message.includes('42P01'))return response.status(200).json({ok:true,status:'migration_required',parserVersion:'production-support-v2',resolutions:[],governance:{closedDecisionsImmutable:true,deferredDecisionsRevisable:true,priorReviewRetainedInSnapshot:true,writesLive:false}});throw error}
 }catch(error){const message=error instanceof Error?error.message:'';return response.status(message.includes('DATABASE_URL')?503:500).json({ok:false,error:message.includes('DATABASE_URL')?'Base de datos no conectada':'No fue posible leer las resoluciones roll-forward'})}
}

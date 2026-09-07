import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}

export default async function handler(req:Request,res:Response){
  res.setHeader('Cache-Control','no-store')
  try{
    const operator=await requireOperator(req)
    if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
    if(req.method!=='GET'){
      res.setHeader('Allow','GET')
      return res.status(405).json({ok:false,error:'Método no permitido'})
    }
    if(!['admin','quality'].includes(operator.role))return res.status(403).json({ok:false,error:'Sólo Calidad o Administración puede consultar referencias externas'})
    const rows=await getSql()`
      select id,title,source_page,image_url,source_type,license,attribution,scene,intended_use,quality_status,official_grade,notes,provenance,created_at,updated_at
      from sea_urchin_external_references
      order by created_at,id
    `
    return res.status(200).json({
      ok:true,
      references:Array.isArray(rows)?rows:[],
      semantics:{
        operationalEvidence:false,
        humanQualityLabels:false,
        automaticTraining:false,
        note:'Referencias externas para QA/variabilidad. Calidad sigue siendo autoridad para good/bad y Grade.'
      }
    })
  }catch(error){
    const message=error instanceof Error?error.message:''
    return res.status(message.includes('sea_urchin_external_references')?503:500).json({ok:false,error:message.includes('sea_urchin_external_references')?'Falta aplicar la migración de referencias externas Uni':'No fue posible cargar referencias externas Uni'})
  }
}

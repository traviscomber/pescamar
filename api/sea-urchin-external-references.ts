import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type ReferenceRow={id:string;title:string;source_page:string;image_url:string|null;source_type:string;license:string;attribution:string|null;scene:string;intended_use:string;quality_status:string;official_grade:null;notes:string;provenance:unknown;created_at:string;updated_at:string}

function reviewPriority(row:ReferenceRow){
  let score=0
  const reasons:string[]=[]
  if(row.intended_use==='defect_variability'){score+=50;reasons.push('posible defecto/variabilidad difícil')}
  if(row.intended_use==='segmentation_qa'){score+=35;reasons.push('útil para validar segmentación')}
  if(row.scene==='mixed_product'){score+=20;reasons.push('contexto visual ambiguo')}
  if(row.scene==='saltwater'){score+=20;reasons.push('agua/reflejos alteran apariencia')}
  if(row.scene==='shell'){score+=15;reasons.push('producto dentro de concha')}
  if(row.source_type==='commercial_reference'){score+=10;reasons.push('referencia comercial externa')}
  if(row.source_type==='research_reference'){score+=5;reasons.push('referencia externa no operacional')}
  if(!row.image_url){score-=100;reasons.push('sin imagen directa')}
  return {reviewPriority:score,reviewReason:reasons.join(' · ')||'variabilidad visual general'}
}

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
    ` as ReferenceRow[]
    const references=(Array.isArray(rows)?rows:[]).map(row=>({...row,...reviewPriority(row)})).sort((a,b)=>b.reviewPriority-a.reviewPriority||a.id.localeCompare(b.id))
    return res.status(200).json({
      ok:true,
      references,
      reviewQueue:{
        total:references.length,
        highPriority:references.filter(item=>item.reviewPriority>=50).length,
        firstBatch:references.slice(0,12).map(item=>item.id),
        rule:'Prioridad derivada sólo desde contexto/provenance; no implica calidad, Grade ni rechazo.'
      },
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

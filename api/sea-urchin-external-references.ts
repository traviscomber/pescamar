import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>;body?:unknown}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type Review={decision:'accepted'|'rejected';rejection_reason:string|null;note:string|null;reviewed_by:string;reviewed_at:string}|null
type VisionTest={status:string;analyzed_at:string;engine:string;mask_mode:string;usable_ratio:number;l_mean:number;a_mean:number;b_mean:number;dispersion:number;border_candidate_ratio:number;confidence:string;recommendation:string;operational_evidence:boolean;automatic_training:boolean;human_decision_required:boolean}|null
type ReferenceRow={id:string;title:string;source_page:string;image_url:string|null;source_type:string;license:string;attribution:string|null;scene:string;intended_use:string;quality_status:string;official_grade:null;notes:string;provenance:Record<string,unknown>|null;created_at:string;updated_at:string;latest_review:Review}

const rejectionReasons=new Set(['color_fuera_objetivo','color_poco_uniforme','dano_visual','apariencia_no_conforme','material_extrano_visible','presentacion_no_conforme','otro'])

function visionTest(row:ReferenceRow):VisionTest{
  const value=row.provenance?.vision_test
  if(!value||typeof value!=='object')return null
  return value as VisionTest
}

function reviewPriority(row:ReferenceRow){
  let score=0
  const reasons:string[]=[]
  const analysis=visionTest(row)
  if(row.latest_review)score-=200
  if(analysis?.status==='pending_quality_review'){score+=80;reasons.push('análisis Vision listo para decisión de Calidad')}
  if(row.intended_use==='defect_variability'){score+=50;reasons.push('posible defecto/variabilidad difícil')}
  if(row.intended_use==='segmentation_qa'){score+=35;reasons.push('útil para validar segmentación')}
  if(row.scene==='mixed_product'){score+=20;reasons.push('contexto visual ambiguo')}
  if(row.scene==='saltwater'){score+=20;reasons.push('agua/reflejos alteran apariencia')}
  if(row.scene==='shell'){score+=15;reasons.push('producto dentro de concha')}
  if(row.source_type==='commercial_reference'){score+=10;reasons.push('referencia comercial externa')}
  if(row.source_type==='research_reference'){score+=5;reasons.push('referencia externa no operacional')}
  if(!row.image_url){score-=100;reasons.push('sin imagen directa')}
  if(row.latest_review)reasons.unshift('ya revisada por Calidad')
  return {reviewPriority:score,reviewReason:reasons.join(' · ')||'variabilidad visual general',visionTest:analysis}
}

function parseBody(body:unknown){
  if(typeof body==='string'){try{return JSON.parse(body) as Record<string,unknown>}catch{return {}}}
  return body&&typeof body==='object'?body as Record<string,unknown>:{}
}

export default async function handler(req:Request,res:Response){
  res.setHeader('Cache-Control','no-store')
  try{
    const operator=await requireOperator(req)
    if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
    if(!['admin','quality'].includes(operator.role))return res.status(403).json({ok:false,error:'Sólo Calidad o Administración puede revisar referencias externas'})

    if(req.method==='POST'){
      const body=parseBody(req.body)
      const referenceId=typeof body.referenceId==='string'?body.referenceId.trim():''
      const decision=body.decision==='accepted'||body.decision==='rejected'?body.decision:null
      const rejectionReason=typeof body.rejectionReason==='string'&&body.rejectionReason.trim()?body.rejectionReason.trim():null
      const note=typeof body.note==='string'&&body.note.trim()?body.note.trim().slice(0,1000):null
      if(!referenceId||!decision)return res.status(400).json({ok:false,error:'Referencia y decisión son obligatorias'})
      if(decision==='rejected'&&(!rejectionReason||!rejectionReasons.has(rejectionReason)))return res.status(400).json({ok:false,error:'Selecciona un motivo de rechazo válido'})
      if(decision==='accepted'&&rejectionReason)return res.status(400).json({ok:false,error:'Una aprobación no debe registrar motivo de rechazo'})
      if(decision==='rejected'&&rejectionReason==='otro'&&!note)return res.status(400).json({ok:false,error:'Describe el motivo cuando seleccionas Otro'})
      const exists=await getSql()`select id from sea_urchin_external_references where id=${referenceId} limit 1`
      if(!Array.isArray(exists)||!exists[0])return res.status(404).json({ok:false,error:'Referencia Uni no encontrada'})
      const provenance={source:'quality_human_review',operatorEmail:operator.email,operatorName:operator.fullName,operationalEvidence:false,automaticTraining:false}
      const rows=await getSql()`
        insert into sea_urchin_external_reference_reviews(reference_id,decision,rejection_reason,note,reviewed_by,provenance)
        values (${referenceId},${decision},${rejectionReason},${note},${operator.id},${JSON.stringify(provenance)}::jsonb)
        returning id,reference_id,decision,rejection_reason,note,reviewed_by,reviewed_at,provenance
      `
      return res.status(201).json({ok:true,review:Array.isArray(rows)?rows[0]:null,semantics:{humanDecision:true,operationalEvidence:false,automaticTraining:false}})
    }

    if(req.method!=='GET'){
      res.setHeader('Allow','GET, POST')
      return res.status(405).json({ok:false,error:'Método no permitido'})
    }
    const rows=await getSql()`
      select r.id,r.title,r.source_page,r.image_url,r.source_type,r.license,r.attribution,r.scene,r.intended_use,r.quality_status,r.official_grade,r.notes,r.provenance,r.created_at,r.updated_at,
        case when rv.id is null then null else jsonb_build_object('decision',rv.decision,'rejection_reason',rv.rejection_reason,'note',rv.note,'reviewed_by',rv.reviewed_by,'reviewed_at',rv.reviewed_at) end as latest_review
      from sea_urchin_external_references r
      left join lateral (
        select id,decision,rejection_reason,note,reviewed_by,reviewed_at
        from sea_urchin_external_reference_reviews
        where reference_id=r.id
        order by reviewed_at desc,id desc limit 1
      ) rv on true
      order by r.created_at,r.id
    ` as ReferenceRow[]
    const references=(Array.isArray(rows)?rows:[]).map(row=>({...row,...reviewPriority(row)})).sort((a,b)=>b.reviewPriority-a.reviewPriority||a.id.localeCompare(b.id))
    const pending=references.filter(item=>!item.latest_review)
    return res.status(200).json({
      ok:true,
      references,
      reviewQueue:{
        total:references.length,
        pending:pending.length,
        reviewed:references.length-pending.length,
        analyzedPending:pending.filter(item=>item.visionTest?.status==='pending_quality_review').length,
        highPriority:pending.filter(item=>item.reviewPriority>=50).length,
        firstBatch:pending.slice(0,12).map(item=>item.id),
        rule:'Prioridad derivada sólo desde contexto/provenance; no implica calidad, Grade ni rechazo.'
      },
      semantics:{
        operationalEvidence:false,
        humanQualityLabels:true,
        automaticTraining:false,
        note:'Vision puede proponer evidencia visual; sólo Calidad/Admin crea accepted/rejected. No es Grade ni evidencia operacional.'
      }
    })
  }catch(error){
    const message=error instanceof Error?error.message:''
    const missingSchema=message.includes('sea_urchin_external_references')||message.includes('sea_urchin_external_reference_reviews')
    return res.status(missingSchema?503:500).json({ok:false,error:missingSchema?'Falta aplicar la migración de referencias externas Uni':'No fue posible procesar referencias externas Uni'})
  }
}

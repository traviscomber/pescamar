import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type MatchStatus='exact_both'|'guide_only'|'lot_only'|'conflict'|'ambiguous'|'unmatched'
const t=(v:unknown)=>String(v??'').trim()
const n=(v:unknown)=>{const x=Number(v);return Number.isFinite(x)?x:0}
const norm=(v:unknown)=>t(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')
const family=(site:string,lot:string)=>{const s=site.toLowerCase(),l=lot.toLowerCase();if(l.startsWith('ig')||s==='curanue')return'IG';if(l.startsWith('mdq')||s==='santa rosa')return'MDQ';if(l.startsWith('mi')||s==='candelaria')return'MI';return'RF'}
const gradeMap:Record<string,string>={GA:'A1',C:'C1',P:'PT',R:'R',V:'Vj100',D:'D'}
const round1=(v:number)=>Number(v.toFixed(1))

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
 try{
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  if(!(operator.role==='admin'||operator.plantIds.length>=6))return res.status(403).json({ok:false,error:'Acceso corporativo requerido'})
  const sql=getSql()
  const [blockRaw,rowRaw,mainRaw]=await Promise.all([
   sql`select sheet_name,source_block,family_key,supplier_name,guide_number,lot_reference,observation_count
       from canonical_production_support_blocks
       where parser_version='production-support-v2'
         and source_file_hash in(select file_hash from canonical_source_files where canonical and file_name='planilla de produccion 2026.xlsx')
       order by sheet_name,source_block`,
   sql`select sheet_name,source_block,grade_code,guide_kg,accepted_kg,destined_kg
       from canonical_production_support_rows
       where parser_version='production-support-v2'
         and source_file_hash in(select file_hash from canonical_source_files where canonical and file_name='planilla de produccion 2026.xlsx')
       order by sheet_name,source_block,source_row`,
   sql`select source_row,coalesce(nullif(btrim(supplier_name),''),nullif(btrim(supplier_original),''),'Sin proveedor') supplier,
       coalesce(nullif(btrim(process_site_original),''),nullif(btrim(plant_id),''),'Sin planta') process_site,
       guide_number,lot_code,received_kg,grade_breakdown
       from historical_production_records
       where record_status='operational'
         and source_file_hash in(select file_hash from canonical_source_files where canonical and file_name='planilla de produccion 2026.xlsx')`
  ])
  const blocks=(Array.isArray(blockRaw)?blockRaw:[]) as Record<string,unknown>[]
  const supportRows=(Array.isArray(rowRaw)?rowRaw:[]) as Record<string,unknown>[]
  const byBlock=new Map<string,Record<string,unknown>[]>()
  for(const row of supportRows){const key=`${t(row.sheet_name)}:${n(row.source_block)}`,bucket=byBlock.get(key);if(bucket)bucket.push(row);else byBlock.set(key,[row])}
  const main=(Array.isArray(mainRaw)?mainRaw:[]).map((r:any)=>({sourceRow:n(r.source_row),supplier:t(r.supplier),familyKey:family(t(r.process_site),t(r.lot_code)),guide:t(r.guide_number),lot:t(r.lot_code),receivedKg:n(r.received_kg),gradeBreakdown:(r.grade_breakdown&&typeof r.grade_breakdown==='object'?r.grade_breakdown:{}) as Record<string,{kg?:unknown}>}))
  const links=blocks.map((b:any)=>{
   const supplier=t(b.supplier_name),familyKey=t(b.family_key),guide=t(b.guide_number),lotRef=t(b.lot_reference),pool=main.filter(r=>r.familyKey===familyKey&&norm(r.supplier)===norm(supplier))
   const byGuide=guide?pool.filter(r=>r.guide===guide):[],token=norm(lotRef),byLot=token?pool.filter(r=>norm(r.lot).startsWith(token)):[]
   const guideIds=new Set(byGuide.map(r=>r.sourceRow)),lotIds=new Set(byLot.map(r=>r.sourceRow)),both=[...guideIds].filter(id=>lotIds.has(id))
   let status:MatchStatus='unmatched',selected:typeof main[number]|undefined
   if(both.length===1){status='exact_both';selected=pool.find(r=>r.sourceRow===both[0])}
   else if(guideIds.size&&lotIds.size)status=both.length>1?'ambiguous':'conflict'
   else if(guideIds.size===1){status='guide_only';selected=byGuide[0]}
   else if(lotIds.size===1){status='lot_only';selected=byLot[0]}
   else if(guideIds.size||lotIds.size)status='ambiguous'

   const rows=byBlock.get(`${t(b.sheet_name)}:${n(b.source_block)}`)??[]
   const supportGuideKg=rows.reduce((sum,row)=>sum+n(row.guide_kg),0),acceptedKg=rows.reduce((sum,row)=>sum+n(row.accepted_kg),0),destinedKg=rows.reduce((sum,row)=>sum+n(row.destined_kg),0)
   const unknownGrades=[...new Set(rows.map(row=>t(row.grade_code)).filter(code=>code&&!gradeMap[code]))]
   const mappedMainGradeKg=selected?rows.reduce((sum,row)=>{const sourceGrade=gradeMap[t(row.grade_code)];if(!sourceGrade)return sum;return sum+n(selected.gradeBreakdown[sourceGrade]?.kg)},0):0
   const guideDeltaKg=selected&&unknownGrades.length===0?round1(supportGuideKg-mappedMainGradeKg):null
   const guideReconciliationState=!selected?'not_comparable':unknownGrades.length?'unmapped_grade':Math.abs(guideDeltaKg??0)<=0.1?'exact':Math.abs(guideDeltaKg??0)<=1?'near':'mismatch'
   const allocationDeltaKg=round1(supportGuideKg-acceptedKg-destinedKg)
   const allocationState=supportGuideKg<=0?'not_comparable':allocationDeltaKg>=-0.1?'within_support_guide':'exceeds_support_guide'
   const needsReview=status==='unmatched'||status==='ambiguous'||status==='conflict'||guideReconciliationState==='mismatch'||guideReconciliationState==='unmapped_grade'||allocationState==='exceeds_support_guide'
   return {supplier,sheetName:t(b.sheet_name),sourceBlock:n(b.source_block),guide:guide||null,lotReference:lotRef||null,status,selectedMainSourceRow:selected?.sourceRow??null,observations:rows.length,receivedKg:selected?round1(selected.receivedKg):null,supportGuideKg:round1(supportGuideKg),acceptedKg:round1(acceptedKg),destinedKg:round1(destinedKg),allocationDeltaKg,allocationState,mappedMainGradeKg:selected?round1(mappedMainGradeKg):null,guideDeltaKg,guideReconciliationState,unknownGrades,confidence:needsReview?'needs-human-validation':'derived'}
  })
  const linkable=new Set<MatchStatus>(['exact_both','guide_only','lot_only'])
  const linked=links.filter(x=>linkable.has(x.status)),unresolved=links.filter(x=>!linkable.has(x.status)),gradeWarnings=linked.filter(x=>x.guideReconciliationState==='mismatch'||x.guideReconciliationState==='unmapped_grade'),allocationWarnings=linked.filter(x=>x.allocationState==='exceeds_support_guide')
  const suppliers=[...new Set(links.map(x=>x.supplier))].map(supplier=>{const items=links.filter(x=>x.supplier===supplier),li=items.filter(x=>linkable.has(x.status));return {supplier,blocks:items.length,linkedBlocks:li.length,linkCoveragePct:items.length?Number((li.length/items.length*100).toFixed(1)):null,exactGradeReconciliations:li.filter(x=>x.guideReconciliationState==='exact').length,gradeMismatchBlocks:li.filter(x=>x.guideReconciliationState==='mismatch').length,allocationWarningBlocks:li.filter(x=>x.allocationState==='exceeds_support_guide').length,comparability:'grade-reconciliation-evidence'}})
  const reviewItems=[...unresolved,...gradeWarnings,...allocationWarnings]
  return res.status(200).json({ok:true,status:'ready',validationCase:'PV-006',maturity:'pilot-evidence',historicalOnly:true,writesLive:false,method:{version:'supplier-link-evidence-v2-grade-reconciliation',rule:'En las hojas auxiliares cada bloque repite columnas Grado / Kilos Guia / Kilos Aceptados / D (destinado). Kilos Guia se contrasta contra la evidencia de kilos por grado de la fila principal mediante el mapeo GA→A1, C→C1, P→PT, R→R, V→Vj100 y D→D. received_kg queda sólo como contexto upstream: no se usa como denominador ni límite de accepted/destined. No se calcula yield ni ranking hasta validación humana del significado operacional completo.'},summary:{blocks:links.length,linkedBlocks:linked.length,unresolvedBlocks:unresolved.length,linkCoveragePct:links.length?Number((linked.length/links.length*100).toFixed(1)):null,exactGradeReconciliations:linked.filter(x=>x.guideReconciliationState==='exact').length,nearGradeReconciliations:linked.filter(x=>x.guideReconciliationState==='near').length,gradeMismatchBlocks:gradeWarnings.length,allocationWarningBlocks:allocationWarnings.length},suppliers,reviewQueue:reviewItems.map(x=>({priority:1,state:'needs-human-validation',supplier:x.supplier,evidence:{sheetName:x.sheetName,sourceBlock:x.sourceBlock,guide:x.guide,lotReference:x.lotReference,status:x.status,supportGuideKg:x.supportGuideKg,mappedMainGradeKg:x.mappedMainGradeKg,guideDeltaKg:x.guideDeltaKg,acceptedKg:x.acceptedKg,destinedKg:x.destinedKg,allocationState:x.allocationState,guideReconciliationState:x.guideReconciliationState},action:!linkable.has(x.status)?'Confirmar guía/lote contra respaldo físico original.':x.guideReconciliationState==='mismatch'||x.guideReconciliationState==='unmapped_grade'?'Revisar el mapeo de grado o la diferencia entre Kilos Guia del soporte y kilos por grado de la fila principal.':'Revisar por qué Kilos Aceptados + D (destinado) supera Kilos Guia dentro del mismo bloque auxiliar.'})),links:links.slice(0,120)})
 }catch(error){const message=error instanceof Error?error.message:'';return res.status(message.includes('DATABASE_URL')?503:500).json({ok:false,error:message.includes('DATABASE_URL')?'Base de datos no conectada':'No fue posible construir evidencia por vínculo'})}
}

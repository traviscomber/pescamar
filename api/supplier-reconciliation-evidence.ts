import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
const t=(v:unknown)=>String(v??'').trim()

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
 try{
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  if(!(operator.role==='admin'||operator.plantIds.length>=6))return res.status(403).json({ok:false,error:'Acceso corporativo requerido'})
  const sql=getSql()
  const raw=await sql`select sheet_name,source_block,supplier_name,guide_number,lot_reference,notes,raw_record
    from canonical_production_support_blocks
    where parser_version='production-support-v2'
      and source_file_hash in(select file_hash from canonical_source_files where canonical and file_name='planilla de produccion 2026.xlsx')
      and (notes is not null or jsonb_array_length(coalesce(raw_record->'auxiliaryEvidence','[]'::jsonb))>0)
    order by sheet_name,source_block`
  const blocks=(Array.isArray(raw)?raw:[]) as Record<string,unknown>[]
  const evidence=blocks.map((row:any)=>{
   const payload=row.raw_record&&typeof row.raw_record==='object'?row.raw_record:{}
   const auxiliary=Array.isArray(payload.auxiliaryEvidence)?payload.auxiliaryEvidence.map((item:any)=>({cell:t(item?.cell),value:item?.value??null,kind:t(item?.kind)||'unknown'})):[]
   const note=t(row.notes)||null
   return {sheetName:t(row.sheet_name),sourceBlock:Number(row.source_block)||0,supplier:t(row.supplier_name),guide:t(row.guide_number)||null,lotReference:t(row.lot_reference)||null,note,auxiliaryEvidence:auxiliary,semanticStatus:'unlabeled_reconciliation_evidence' as const,confidence:'needs-human-validation' as const,historicalOnly:true,writesLive:false}
  })
  const notes=evidence.filter(x=>x.note),withAux=evidence.filter(x=>x.auxiliaryEvidence.length>0)
  return res.status(200).json({ok:true,status:'ready',validationCase:'PV-006',maturity:'pilot-evidence',historicalOnly:true,writesLive:false,method:{version:'supplier-reconciliation-evidence-v1',rule:'Las filas auxiliares fuera de Grado/Kilos Guia/Kilos Aceptados/D (destinado) se preservan como evidencia de conciliación sin asignarles significado contable, productivo o de deuda por inferencia. El texto fuente se conserva literalmente; los valores sin etiqueta requieren validación humana.'},summary:{blocksWithEvidence:evidence.length,blocksWithTextNotes:notes.length,blocksWithAuxiliaryValues:withAux.length},reviewQueue:evidence.map(item=>({priority:1,state:'needs-human-validation',supplier:item.supplier,evidence:{sheetName:item.sheetName,sourceBlock:item.sourceBlock,guide:item.guide,lotReference:item.lotReference,note:item.note,auxiliaryEvidence:item.auxiliaryEvidence},action:item.note?'Confirmar el significado operacional y la resolución del texto de conciliación contra el respaldo original.':'Confirmar qué representan los valores auxiliares sin etiqueta antes de usarlos en KPI, deuda, yield o score.',responsibleRole:'operations'})),evidence})
 }catch(error){const message=error instanceof Error?error.message:'';return res.status(message.includes('DATABASE_URL')?503:500).json({ok:false,error:message.includes('DATABASE_URL')?'Base de datos no conectada':'No fue posible construir evidencia de conciliación'})}
}

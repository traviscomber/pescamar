import ExcelJS from 'exceljs'
import {createHash} from 'node:crypto'
import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'
import {parseProductionSupport} from './_production-support-parser.js'

type Request={method?:string;body?:unknown;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type Payload={fileName?:unknown;base64?:unknown}
const text=(value:unknown)=>String(value??'').trim()

export default async function handler(request:Request,response:Response){
 response.setHeader('Cache-Control','no-store')
 if(request.method!=='POST'){response.setHeader('Allow','POST');return response.status(405).json({ok:false,error:'Método no permitido'})}
 try{
  const operator=await requireOperator(request,['admin','operations'])
  if(!operator)return response.status(403).json({ok:false,error:'Permisos insuficientes'})
  const body=(request.body??{}) as Payload,fileName=text(body.fileName),base64=text(body.base64)
  if(fileName!=='planilla de produccion 2026.xlsx'||!base64)return response.status(400).json({ok:false,error:'Se requiere la fuente canónica planilla de produccion 2026.xlsx'})
  const buffer=Buffer.from(base64.replace(/^data:.*?;base64,/,''),'base64')
  if(!buffer.length||buffer.length>15*1024*1024)return response.status(413).json({ok:false,error:'Archivo inválido o demasiado grande'})
  const fileHash=createHash('sha256').update(buffer).digest('hex'),sql=getSql()
  const sourceRaw=await sql`select file_name,canonical from canonical_source_files where file_hash=${fileHash} limit 1`
  const source=Array.isArray(sourceRaw)?sourceRaw[0] as {file_name?:unknown;canonical?:unknown}|undefined:undefined
  if(!source||source.file_name!==fileName||source.canonical!==true)return response.status(409).json({ok:false,error:'El archivo no coincide exactamente con la fuente canónica aprobada'})
  const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(buffer)
  const parsed=parseProductionSupport(workbook)
  if(!parsed.blockRecords.length||!parsed.rows.length)return response.status(422).json({ok:false,error:'No se encontraron bloques y observaciones utilizables en Isla Guafo, Diaz termiando o Cesar'})
  await sql`insert into canonical_production_support_blocks(source_file_hash,parser_version,sheet_name,source_block,family_key,event_date,supplier_name,process_site,guide_number,lot_reference,notes,observation_count,data_quality_flags,raw_record)
   select ${fileHash},x.parser_version,x.sheet_name,x.source_block,x.family_key,nullif(x.event_date,'')::date,x.supplier_name,x.process_site,nullif(x.guide_number,''),nullif(x.lot_reference,''),nullif(x.notes,''),x.observation_count,coalesce(x.data_quality_flags,array[]::text[]),coalesce(x.raw_record,'{}'::jsonb)
   from jsonb_to_recordset(${JSON.stringify(parsed.blockRecords.map(block=>({parser_version:parsed.parserVersion,sheet_name:block.sheetName,source_block:block.sourceBlock,family_key:block.familyKey,event_date:block.eventDate??'',supplier_name:block.supplierName,process_site:block.processSite,guide_number:block.guideNumber??'',lot_reference:block.lotReference??'',notes:block.notes??'',observation_count:block.observationCount,data_quality_flags:block.dataQualityFlags,raw_record:block.rawRecord})))}::jsonb)
   as x(parser_version text,sheet_name text,source_block integer,family_key text,event_date text,supplier_name text,process_site text,guide_number text,lot_reference text,notes text,observation_count integer,data_quality_flags text[],raw_record jsonb)
   on conflict(source_file_hash,parser_version,sheet_name,source_block) do update set family_key=excluded.family_key,event_date=excluded.event_date,supplier_name=excluded.supplier_name,process_site=excluded.process_site,guide_number=excluded.guide_number,lot_reference=excluded.lot_reference,notes=excluded.notes,observation_count=excluded.observation_count,data_quality_flags=excluded.data_quality_flags,raw_record=excluded.raw_record,imported_at=now()`
  await sql`insert into canonical_production_support_rows(source_file_hash,parser_version,sheet_name,source_block,source_row,family_key,event_date,supplier_name,process_site,guide_number,lot_reference,grade_code,guide_kg,accepted_kg,destined_kg,notes,data_quality_flags,raw_record)
   select ${fileHash},x.parser_version,x.sheet_name,x.source_block,x.source_row,x.family_key,nullif(x.event_date,'')::date,x.supplier_name,x.process_site,nullif(x.guide_number,''),nullif(x.lot_reference,''),x.grade_code,x.guide_kg,x.accepted_kg,x.destined_kg,nullif(x.notes,''),coalesce(x.data_quality_flags,array[]::text[]),coalesce(x.raw_record,'{}'::jsonb)
   from jsonb_to_recordset(${JSON.stringify(parsed.rows.map(row=>({parser_version:parsed.parserVersion,sheet_name:row.sheetName,source_block:row.sourceBlock,source_row:row.sourceRow,family_key:row.familyKey,event_date:row.eventDate??'',supplier_name:row.supplierName,process_site:row.processSite,guide_number:row.guideNumber??'',lot_reference:row.lotReference??'',grade_code:row.gradeCode,guide_kg:row.guideKg,accepted_kg:row.acceptedKg,destined_kg:row.destinedKg,notes:row.notes??'',data_quality_flags:row.dataQualityFlags,raw_record:row.rawRecord})))}::jsonb)
   as x(parser_version text,sheet_name text,source_block integer,source_row integer,family_key text,event_date text,supplier_name text,process_site text,guide_number text,lot_reference text,grade_code text,guide_kg numeric,accepted_kg numeric,destined_kg numeric,notes text,data_quality_flags text[],raw_record jsonb)
   on conflict(source_file_hash,parser_version,sheet_name,source_block,source_row) do update set family_key=excluded.family_key,event_date=excluded.event_date,supplier_name=excluded.supplier_name,process_site=excluded.process_site,guide_number=excluded.guide_number,lot_reference=excluded.lot_reference,grade_code=excluded.grade_code,guide_kg=excluded.guide_kg,accepted_kg=excluded.accepted_kg,destined_kg=excluded.destined_kg,notes=excluded.notes,data_quality_flags=excluded.data_quality_flags,raw_record=excluded.raw_record,imported_at=now()`
  const flagged=parsed.rows.filter(row=>row.dataQualityFlags.length>0).length,flaggedBlocks=parsed.blockRecords.filter(block=>block.dataQualityFlags.length>0).length
  return response.status(200).json({ok:true,fileName,fileHash,parserVersion:parsed.parserVersion,blocks:parsed.blocks,rows:parsed.rows.length,flagged,flaggedBlocks,bySheet:parsed.bySheet,blocksBySheet:parsed.blocksBySheet,idempotent:true,writesLive:false})
 }catch(error){console.error('production_support_import_failed',error);const message=error instanceof Error?error.message:'';if(message.includes('canonical_production_support_blocks')||message.includes('canonical_production_support_rows')||message.includes('42P01'))return response.status(503).json({ok:false,error:'Falta aplicar las migraciones 030/032 de evidencia auxiliar de producción'});return response.status(message.includes('DATABASE_URL')?503:500).json({ok:false,error:message.includes('DATABASE_URL')?'Base de datos no conectada':'No fue posible publicar las hojas auxiliares de producción'})}
}

import ExcelJS from 'exceljs'
import {createHash} from 'node:crypto'
import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'
import {parseProductionSupport} from './_production-support-parser.js'

type Request={method?:string;body?:unknown;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type Payload={fileName?:unknown;base64?:unknown}
type Row=Record<string,unknown>
const txt=(v:unknown)=>String(v??'').trim()
const iso=(v:unknown)=>v instanceof Date&&!Number.isNaN(v.getTime())?v.toISOString().slice(0,10):null
function formulaResult(v:unknown){if(v&&typeof v==='object'&&'result' in v)return (v as {result?:unknown}).result;return v}
function n(v:unknown){const x=formulaResult(v);if(typeof x==='number'&&Number.isFinite(x))return x;if(typeof x==='string'&&x.trim()&&Number.isFinite(Number(x)))return Number(x);if(v&&typeof v==='object'&&'formula' in v){const f=String((v as {formula?:unknown}).formula??'').replace(/^\+/, '');if(/^[0-9+*/(). -]+$/.test(f)){try{const parts=f.split('*').map(Number);if(parts.every(Number.isFinite))return parts.reduce((a,b)=>a*b,1)}catch{}}}return null}
function s(v:unknown){const x=formulaResult(v);return x==null?'':String(x).trim()}
function dateCell(v:unknown){const x=formulaResult(v);return iso(x)}
function rawValue(v:unknown){if(v instanceof Date)return v.toISOString();if(v&&typeof v==='object'&&'formula' in v)return `=${String((v as {formula?:unknown}).formula??'')}`;if(v&&typeof v==='object'&&'text' in v)return String((v as {text?:unknown}).text??'');return v??null}
function rawRow(ws:ExcelJS.Worksheet,r:number,max:number){const out:Row={};for(let c=1;c<=max;c++){const cell=ws.getCell(r,c);if(cell.value!==null&&cell.value!==undefined)out[cell.address]=rawValue(cell.value)}return out}
function hasFormula(v:unknown){return !!(v&&typeof v==='object'&&'formula' in v)}

function production(ws:ExcelJS.Worksheet){
 const rows:Row[]=[]
 const aliases:Record<string,string>={'glady mansilla':'Gladys Mansilla','patrcio diaz':'Patricio Diaz'}
 const sites:Record<string,string>={'pescamar':'Pescamar','curanue':'Curanue','santa rosa':'Santa Rosa','piedra azul':'Piedra Azul','mechaico':'Mechaico','respaldo':'Respaldo'}
 const grades=[['A1',15,16],['A2',17,18],['Vj100',19,20],['Vj50',21,22],['C1',23,24],['C2',25,26],['D',27,28],['Total',29,30],['PT',31,32],['R',33,34],['Total2',35,36]] as const
 for(let r=3;r<=ws.rowCount;r++){
  const lot=s(ws.getCell(r,10).value);if(!lot)continue
  const rec=dateCell(ws.getCell(r,1).value),proc=dateCell(ws.getCell(r,2).value),prod=dateCell(ws.getCell(r,3).value)
  const supplierOriginal=s(ws.getCell(r,6).value)||null,supplierName=supplierOriginal?aliases[supplierOriginal.toLowerCase()]??supplierOriginal:null
  const siteOriginal=s(ws.getCell(r,9).value)||null,siteName=siteOriginal?sites[siteOriginal.toLowerCase()]??siteOriginal:null
  const flags:string[]=[]
  if(rec&&proc&&proc<rec)flags.push('process_before_reception')
  if(proc&&prod&&prod<proc)flags.push('production_before_process')
  if(!rec)flags.push('missing_reception_date')
  const guide=s(ws.getCell(r,5).value)||null
  if(!guide||['s/g','sin guia'].includes(guide.toLowerCase()))flags.push('missing_or_nonstandard_guide')
  if(supplierOriginal&&supplierName!==supplierOriginal)flags.push('supplier_alias_candidate')
  if(siteOriginal&&siteName!==siteOriginal)flags.push('process_site_alias_candidate')
  const grade:Row={}
  for(const [name,a,b] of grades){const boxes=n(ws.getCell(r,a).value),kg=n(ws.getCell(r,b).value);if(boxes!==null||kg!==null)grade[name]={boxes,kg}}
  const guideKg=n(ws.getCell(r,11).value),receivedKg=n(ws.getCell(r,12).value)
  rows.push({sourceRow:r,recordStatus:'operational',eventDate:rec,receptionDate:rec,processDate:proc,productionDate:prod,guideNumber:guide,supplierOriginal,supplierName,extractionZone:s(ws.getCell(r,7).value)||null,guidePriceClp:n(ws.getCell(r,8).value),processSiteOriginal:siteName,lotCode:lot,guideKg,receivedKg,differenceKg:guideKg!==null&&receivedKg!==null?guideKg-receivedKg:null,qualityDiscount:n(ws.getCell(r,14).value),gradeBreakdown:grade,yields:{},client:s(ws.getCell(r,45).value)||null,observations:s(ws.getCell(r,46).value)||null,dataQualityFlags:flags,rawRecord:rawRow(ws,r,46)})
 }
 return rows
}

function account(wb:ExcelJS.Workbook){
 const ledger:Row[]=[],stock:Row[]=[],transfers:Row[]=[]
 const ws=wb.getWorksheet('CUENTA CORRIENTE')
 if(ws){
  let balance=0,prev:string|null=null
  for(let r=5;r<=ws.rowCount;r++){
   const dt=dateCell(ws.getCell(r,3).value),desc=s(ws.getCell(r,4).value)||null,inflow=n(ws.getCell(r,5).value),outflow=n(ws.getCell(r,6).value)
   if(!dt&&!desc&&inflow===null&&outflow===null)continue
   const flags:string[]=[]
   if(!dt)flags.push('missing_date');else if(dt<'2024-01-01'||dt>'2026-12-31')flags.push('date_outlier')
   if(prev&&dt&&dt<prev)flags.push('date_order_regression');if(dt)prev=dt
   if(hasFormula(ws.getCell(r,5).value)||hasFormula(ws.getCell(r,6).value))flags.push('formula_value_extracted')
   balance+=(inflow??0)-(outflow??0)
   ledger.push({sheetName:'CUENTA CORRIENTE',sourceRow:r,eventDate:dt,description:desc,inflowClp:inflow,outflowClp:outflow,balanceClp:balance,dataQualityFlags:flags,rawRecord:rawRow(ws,r,7)})
  }
 }
 const er=wb.getWorksheet('STOCK FISICO ERIZOS')
 if(er){
  const names=['H5_kilos','J100','J100B','GRADO_C','GRADO_D','RECHAZO_500','H5_espejo','J100_espejo','J100B_espejo','GRADO_C_espejo','GRADO_D_espejo']
  for(let r=6;r<=er.rowCount;r++){
   const item=s(er.getCell(r,2).value)||null,dt=dateCell(er.getCell(r,1).value),g:Row={};let total=0,seen=false
   for(let c=3;c<=13;c++){const v=n(er.getCell(r,c).value);if(v!==null){g[names[c-3]]=v;total+=v;seen=true}}
   if(!item&&!dt&&!seen)continue
   const flags:string[]=[];if(!dt&&item?.toUpperCase()!=='INICIAL')flags.push('missing_date')
   stock.push({sheetName:'STOCK FISICO ERIZOS',sourceRow:r,eventDate:dt,item,productFamily:'erizo',lotReference:null,gradeBreakdown:g,totalKg:total,dataQualityFlags:flags,rawRecord:rawRow(er,r,14)})
  }
 }
 const pu=wb.getWorksheet('STOCK PULPO')
 if(pu){
  const names=['08-1','1-1.5','1.5-2','2up']
  for(let r=8;r<=pu.rowCount;r++){
   const seq=formulaResult(pu.getCell(r,1).value),dt=dateCell(pu.getCell(r,2).value),g:Row={};let total=0,seen=false
   for(let c=3;c<=6;c++){const v=n(pu.getCell(r,c).value);if(v!==null){g[names[c-3]]=v;total+=v;seen=true}}
   if(seq==null&&!dt&&!seen)continue
   stock.push({sheetName:'STOCK PULPO',sourceRow:r,eventDate:dt,item:seq==null?null:`fila ${seq}`,productFamily:'pulpo',lotReference:null,gradeBreakdown:g,totalKg:total,dataQualityFlags:dt?[]:['missing_date'],rawRecord:rawRow(pu,r,23)})
  }
 }
 const tr=wb.getWorksheet('TRANSF RECIBIDAS')
 if(tr){
  for(let r=7;r<=tr.rowCount;r++){
   const dt=dateCell(tr.getCell(r,3).value),bank=s(tr.getCell(r,4).value)||null,sender=s(tr.getCell(r,5).value)||null,amount=n(tr.getCell(r,6).value)
   if(!dt&&!bank&&!sender&&amount===null)continue
   const flags:string[]=[];if(!dt)flags.push('missing_date');if(amount===null)flags.push('missing_amount')
   transfers.push({sheetName:'TRANSF RECIBIDAS',sourceRow:r,eventDate:dt,bank,sender,amountClp:amount,dataQualityFlags:flags,rawRecord:rawRow(tr,r,6)})
  }
 }
 return {ledger,stock,transfers}
}

function packing(wb:ExcelJS.Workbook){
 const rows:Row[]=[]
 for(const cfg of [{sheet:'BLOQUE',format:'BLOQUE',lot:7,date:8,names:['08-1','1-1.5','1.5-2']},{sheet:'IQF',format:'IQF',lot:0,date:7,names:['08-1.3','1.4-1.9','2UP']}]){
  const ws=wb.getWorksheet(cfg.sheet);if(!ws)continue
  for(let r=6;r<=ws.rowCount;r++){
   const box=n(ws.getCell(r,3).value);if(box===null||!Number.isInteger(box))continue
   const weights:Row={};let total=0
   for(let c=4;c<=6;c++){const v=n(ws.getCell(r,c).value);if(v!==null){weights[cfg.names[c-4]]=v;total+=v}}
   const lot=cfg.lot?s(ws.getCell(r,cfg.lot).value)||null:null
   const flags:string[]=[];if(!lot)flags.push('missing_lot_reference')
   rows.push({sheetName:cfg.sheet,sourceRow:r,packFormat:cfg.format,boxNumber:box,lotCode:lot,productionDate:dateCell(ws.getCell(r,cfg.date).value),weightBreakdown:weights,totalKg:total,notes:null,dataQualityFlags:flags,rawRecord:rawRow(ws,r,Math.max(cfg.date,8))})
  }
 }
 return rows
}

async function insert(sql:ReturnType<typeof getSql>,fileName:string,fileHash:string,kind:string,rows:Row[]){
 if(kind==='production')await sql`insert into historical_production_records(source_row,source_file,source_file_hash,record_status,event_date,reception_date,process_date,production_date,guide_number,supplier_original,supplier_name,extraction_zone,guide_price_clp,process_site_original,lot_code,guide_kg,received_kg,difference_kg,quality_discount,grade_breakdown,yields,client,observations,data_quality_flags,raw_record) select x.source_row,${fileName},${fileHash},'operational',nullif(x.event_date,'')::date,nullif(x.reception_date,'')::date,nullif(x.process_date,'')::date,nullif(x.production_date,'')::date,nullif(x.guide_number,''),nullif(x.supplier_original,''),nullif(x.supplier_name,''),nullif(x.extraction_zone,''),x.guide_price_clp,nullif(x.process_site_original,''),x.lot_code,x.guide_kg,x.received_kg,x.difference_kg,x.quality_discount,coalesce(x.grade_breakdown,'{}'::jsonb),coalesce(x.yields,'{}'::jsonb),nullif(x.client,''),nullif(x.observations,''),coalesce(x.data_quality_flags,array[]::text[]),coalesce(x.raw_record,'{}'::jsonb) from jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) as x(source_row integer,event_date text,reception_date text,process_date text,production_date text,guide_number text,supplier_original text,supplier_name text,extraction_zone text,guide_price_clp numeric,process_site_original text,lot_code text,guide_kg numeric,received_kg numeric,difference_kg numeric,quality_discount numeric,grade_breakdown jsonb,yields jsonb,client text,observations text,data_quality_flags text[],raw_record jsonb) on conflict(source_file_hash,source_row) do nothing`
 else if(kind==='ledger')await sql`insert into canonical_account_entries(source_file_hash,sheet_name,source_row,event_date,description,inflow_clp,outflow_clp,balance_clp,data_quality_flags,raw_record) select ${fileHash},x.sheet_name,x.source_row,nullif(x.event_date,'')::date,nullif(x.description,''),x.inflow_clp,x.outflow_clp,x.balance_clp,coalesce(x.data_quality_flags,array[]::text[]),coalesce(x.raw_record,'{}'::jsonb) from jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) as x(sheet_name text,source_row integer,event_date text,description text,inflow_clp numeric,outflow_clp numeric,balance_clp numeric,data_quality_flags text[],raw_record jsonb) on conflict(source_file_hash,sheet_name,source_row) do nothing`
 else if(kind==='stock')await sql`insert into canonical_stock_records(source_file_hash,sheet_name,source_row,event_date,item,product_family,lot_reference,grade_breakdown,total_kg,data_quality_flags,raw_record) select ${fileHash},x.sheet_name,x.source_row,nullif(x.event_date,'')::date,nullif(x.item,''),x.product_family,nullif(x.lot_reference,''),coalesce(x.grade_breakdown,'{}'::jsonb),x.total_kg,coalesce(x.data_quality_flags,array[]::text[]),coalesce(x.raw_record,'{}'::jsonb) from jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) as x(sheet_name text,source_row integer,event_date text,item text,product_family text,lot_reference text,grade_breakdown jsonb,total_kg numeric,data_quality_flags text[],raw_record jsonb) on conflict(source_file_hash,sheet_name,source_row) do nothing`
 else if(kind==='transfers')await sql`insert into canonical_transfers_received(source_file_hash,sheet_name,source_row,event_date,bank,sender,amount_clp,data_quality_flags,raw_record) select ${fileHash},x.sheet_name,x.source_row,nullif(x.event_date,'')::date,nullif(x.bank,''),nullif(x.sender,''),x.amount_clp,coalesce(x.data_quality_flags,array[]::text[]),coalesce(x.raw_record,'{}'::jsonb) from jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) as x(sheet_name text,source_row integer,event_date text,bank text,sender text,amount_clp numeric,data_quality_flags text[],raw_record jsonb) on conflict(source_file_hash,sheet_name,source_row) do nothing`
 else await sql`insert into canonical_packing_boxes(source_file_hash,sheet_name,source_row,pack_format,box_number,lot_code,production_date,weight_breakdown,total_kg,notes,data_quality_flags,raw_record) select ${fileHash},x.sheet_name,x.source_row,x.pack_format,x.box_number,nullif(x.lot_code,''),nullif(x.production_date,'')::date,coalesce(x.weight_breakdown,'{}'::jsonb),x.total_kg,nullif(x.notes,''),coalesce(x.data_quality_flags,array[]::text[]),coalesce(x.raw_record,'{}'::jsonb) from jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) as x(sheet_name text,source_row integer,pack_format text,box_number integer,lot_code text,production_date text,weight_breakdown jsonb,total_kg numeric,notes text,data_quality_flags text[],raw_record jsonb) on conflict(source_file_hash,sheet_name,source_row) do nothing`
}

async function insertProductionSupport(sql:ReturnType<typeof getSql>,fileHash:string,wb:ExcelJS.Workbook){
 const parsed=parseProductionSupport(wb)
 if(!parsed.blockRecords.length||!parsed.rows.length)throw new Error('No se encontraron bloques y observaciones auxiliares de producción')
 await sql`insert into canonical_production_support_blocks(source_file_hash,parser_version,sheet_name,source_block,family_key,event_date,supplier_name,process_site,guide_number,lot_reference,notes,observation_count,data_quality_flags,raw_record)
 select ${fileHash},x.parser_version,x.sheet_name,x.source_block,x.family_key,nullif(x.event_date,'')::date,x.supplier_name,x.process_site,nullif(x.guide_number,''),nullif(x.lot_reference,''),nullif(x.notes,''),x.observation_count,coalesce(x.data_quality_flags,array[]::text[]),coalesce(x.raw_record,'{}'::jsonb)
 from jsonb_to_recordset(${JSON.stringify(parsed.blockRecords.map(block=>({parser_version:parsed.parserVersion,sheet_name:block.sheetName,source_block:block.sourceBlock,family_key:block.familyKey,event_date:block.eventDate??'',supplier_name:block.supplierName,process_site:block.processSite,guide_number:block.guideNumber??'',lot_reference:block.lotReference??'',notes:block.notes??'',observation_count:block.observationCount,data_quality_flags:block.dataQualityFlags,raw_record:block.rawRecord})))}::jsonb)
 as x(parser_version text,sheet_name text,source_block integer,family_key text,event_date text,supplier_name text,process_site text,guide_number text,lot_reference text,notes text,observation_count integer,data_quality_flags text[],raw_record jsonb)
 on conflict(source_file_hash,parser_version,sheet_name,source_block) do nothing`
 await sql`insert into canonical_production_support_rows(source_file_hash,parser_version,sheet_name,source_block,source_row,family_key,event_date,supplier_name,process_site,guide_number,lot_reference,grade_code,guide_kg,accepted_kg,destined_kg,notes,data_quality_flags,raw_record)
 select ${fileHash},x.parser_version,x.sheet_name,x.source_block,x.source_row,x.family_key,nullif(x.event_date,'')::date,x.supplier_name,x.process_site,nullif(x.guide_number,''),nullif(x.lot_reference,''),x.grade_code,x.guide_kg,x.accepted_kg,x.destined_kg,nullif(x.notes,''),coalesce(x.data_quality_flags,array[]::text[]),coalesce(x.raw_record,'{}'::jsonb)
 from jsonb_to_recordset(${JSON.stringify(parsed.rows.map(row=>({parser_version:parsed.parserVersion,sheet_name:row.sheetName,source_block:row.sourceBlock,source_row:row.sourceRow,family_key:row.familyKey,event_date:row.eventDate??'',supplier_name:row.supplierName,process_site:row.processSite,guide_number:row.guideNumber??'',lot_reference:row.lotReference??'',grade_code:row.gradeCode,guide_kg:row.guideKg,accepted_kg:row.acceptedKg,destined_kg:row.destinedKg,notes:row.notes??'',data_quality_flags:row.dataQualityFlags,raw_record:row.rawRecord})))}::jsonb)
 as x(parser_version text,sheet_name text,source_block integer,source_row integer,family_key text,event_date text,supplier_name text,process_site text,guide_number text,lot_reference text,grade_code text,guide_kg numeric,accepted_kg numeric,destined_kg numeric,notes text,data_quality_flags text[],raw_record jsonb)
 on conflict(source_file_hash,parser_version,sheet_name,source_block,source_row) do nothing`
 return {blocks:parsed.blocks,observations:parsed.rows.length,flagged:parsed.rows.filter(row=>row.dataQualityFlags.length>0).length,flaggedBlocks:parsed.blockRecords.filter(block=>block.dataQualityFlags.length>0).length,parserVersion:parsed.parserVersion}
}

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false,error:'Método no permitido'})}
 try{
  const operator=await requireOperator(req,['admin','operations'])
  if(!operator)return res.status(403).json({ok:false,error:'Permisos insuficientes'})
  const body=(req.body??{}) as Payload,fileName=txt(body.fileName),base64=txt(body.base64)
  if(!fileName||!base64)return res.status(400).json({ok:false,error:'Archivo requerido'})
  const buf=Buffer.from(base64.replace(/^data:.*?;base64,/,''),'base64')
  if(!buf.length||buf.length>15*1024*1024)return res.status(413).json({ok:false,error:'Archivo inválido o demasiado grande'})
  const fileHash=createHash('sha256').update(buf).digest('hex'),sql=getSql()
  const src=await sql`select file_name,source_kind,canonical from canonical_source_files where file_hash=${fileHash} limit 1`
  const source=Array.isArray(src)?src[0] as {file_name?:string;canonical?:boolean}|undefined:undefined
  if(!source||source.file_name!==fileName||!source.canonical)return res.status(409).json({ok:false,error:'El archivo no coincide exactamente con una fuente canónica aprobada'})
  const wb=new ExcelJS.Workbook();await wb.xlsx.load(buf)
  const result:Record<string,number>={};let sourceRecordCount=0
  if(fileName==='planilla de produccion 2026.xlsx'){
   const ws=wb.getWorksheet('Producción Pescamar 2026');if(!ws)throw new Error('Hoja de producción no encontrada')
   const rows=production(ws);await insert(sql,fileName,fileHash,'production',rows)
   const support=await insertProductionSupport(sql,fileHash,wb)
   result.production=rows.length;result.supportBlocks=support.blocks;result.supportObservations=support.observations;result.supportFlagged=support.flagged;result.supportFlaggedBlocks=support.flaggedBlocks;sourceRecordCount=rows.length
  }else if(fileName==='CUENTA2.xlsx'){
   const parsed=account(wb);await insert(sql,fileName,fileHash,'ledger',parsed.ledger);await insert(sql,fileName,fileHash,'stock',parsed.stock);await insert(sql,fileName,fileHash,'transfers',parsed.transfers)
   result.ledger=parsed.ledger.length;result.stock=parsed.stock.length;result.transfers=parsed.transfers.length;sourceRecordCount=parsed.ledger.length+parsed.stock.length+parsed.transfers.length
  }else if(fileName==='packing pulpo pescamar 2026-2.xlsx'){
   const rows=packing(wb);await insert(sql,fileName,fileHash,'packing',rows);result.packing=rows.length;sourceRecordCount=rows.length
  }else return res.status(400).json({ok:false,error:'Fuente canónica no soportada'})
  await sql`update canonical_source_files set record_count=${sourceRecordCount},imported_at=now() where file_hash=${fileHash}`
  return res.status(200).json({ok:true,fileName,fileHash,result,idempotent:true,immutable:true,writesLive:false})
 }catch(error){
  console.error('canonical_upload_failed',error)
  const message=error instanceof Error?error.message:''
  if(message.includes('canonical_production_support_blocks')||message.includes('canonical_production_support_rows')||message.includes('42P01'))return res.status(503).json({ok:false,error:'Faltan migraciones 030/032 para publicar evidencia auxiliar de producción'})
  return res.status(500).json({ok:false,error:'No fue posible procesar el XLSX canónico'})
 }
}

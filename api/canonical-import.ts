import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;body?:unknown;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type Kind='production'|'ledger'|'stock'|'transfers'|'packing'
type Payload={kind?:unknown;fileName?:unknown;fileHash?:unknown;rows?:unknown[]}
type SourceRow={file_name?:unknown;source_kind?:unknown;canonical?:unknown}
const text=(v:unknown,max=240)=>String(v??'').trim().slice(0,max)
const hash=/^[a-f0-9]{64}$/
const allowed=new Set<Kind>(['production','ledger','stock','transfers','packing'])
const sourceKinds:Record<Kind,ReadonlySet<string>>={
  production:new Set(['production_2026']),
  ledger:new Set(['finance_stock']),
  stock:new Set(['finance_stock']),
  transfers:new Set(['finance_stock']),
  packing:new Set(['packing_octopus_2026'])
}
const rowsOf=(v:unknown)=>Array.isArray(v)?v:[]
const sourceSupports=(kind:Kind,sourceKind:unknown)=>sourceKinds[kind].has(text(sourceKind,80).toLowerCase())

export default async function handler(req:Request,res:Response){
  res.setHeader('Cache-Control','no-store')
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false,error:'Método no permitido'})}
  try{
    const operator=await requireOperator(req,['admin','operations'])
    if(!operator)return res.status(403).json({ok:false,error:'Permisos insuficientes'})
    const body=(req.body??{}) as Payload
    const kind=text(body.kind,32) as Kind,fileName=text(body.fileName,240),fileHash=text(body.fileHash,64).toLowerCase(),rows=rowsOf(body.rows)
    if(!allowed.has(kind)||!fileName||!hash.test(fileHash)||!rows.length)return res.status(400).json({ok:false,error:'Fuente canónica inválida'})
    if(rows.length>10000)return res.status(413).json({ok:false,error:'La importación supera 10.000 filas'})
    const sql=getSql()
    const source=await sql`select file_hash,file_name,source_kind,canonical from canonical_source_files where file_hash=${fileHash} limit 1`
    const src=Array.isArray(source)?source[0] as SourceRow|undefined:undefined
    if(!src||String(src.file_name??'')!==fileName||src.canonical!==true)return res.status(409).json({ok:false,error:'El archivo no coincide con una fuente canónica aprobada'})
    if(!sourceSupports(kind,src.source_kind))return res.status(409).json({ok:false,error:'La clase de importación no corresponde al tipo de fuente canónica aprobada'})
    const sourceKind=text(src.source_kind,80).toLowerCase()

    if(kind==='production'){
      const clean=rows.filter(r=>Number.isInteger(Number((r as Record<string,unknown>).sourceRow))&&text((r as Record<string,unknown>).lotCode,120)).slice(0,10000)
      await sql`insert into historical_production_records(source_row,source_file,source_file_hash,record_status,event_date,reception_date,process_date,production_date,guide_number,supplier_original,supplier_name,extraction_zone,guide_price_clp,process_site_original,lot_code,guide_kg,received_kg,difference_kg,quality_discount,grade_breakdown,yields,client,observations,data_quality_flags,raw_record)
      select x.source_row,${fileName},${fileHash},case when x.record_status='void' then 'void' else 'operational' end,nullif(x.event_date,'')::date,nullif(x.reception_date,'')::date,nullif(x.process_date,'')::date,nullif(x.production_date,'')::date,nullif(x.guide_number,''),nullif(x.supplier_original,''),nullif(x.supplier_name,''),nullif(x.extraction_zone,''),x.guide_price_clp,nullif(x.process_site_original,''),x.lot_code,x.guide_kg,x.received_kg,x.difference_kg,x.quality_discount,coalesce(x.grade_breakdown,'{}'::jsonb),coalesce(x.yields,'{}'::jsonb),nullif(x.client,''),nullif(x.observations,''),coalesce(x.data_quality_flags,array[]::text[]),coalesce(x.raw_record,'{}'::jsonb)
      from jsonb_to_recordset(${JSON.stringify(clean)}::jsonb) as x(source_row integer,record_status text,event_date text,reception_date text,process_date text,production_date text,guide_number text,supplier_original text,supplier_name text,extraction_zone text,guide_price_clp numeric,process_site_original text,lot_code text,guide_kg numeric,received_kg numeric,difference_kg numeric,quality_discount numeric,grade_breakdown jsonb,yields jsonb,client text,observations text,data_quality_flags text[],raw_record jsonb)
      on conflict(source_file_hash,source_row) do nothing`
    }else if(kind==='ledger'){
      await sql`insert into canonical_account_entries(source_file_hash,sheet_name,source_row,event_date,description,inflow_clp,outflow_clp,balance_clp,data_quality_flags,raw_record)
      select ${fileHash},x.sheet_name,x.source_row,nullif(x.event_date,'')::date,nullif(x.description,''),x.inflow_clp,x.outflow_clp,x.balance_clp,coalesce(x.data_quality_flags,array[]::text[]),coalesce(x.raw_record,'{}'::jsonb)
      from jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) as x(sheet_name text,source_row integer,event_date text,description text,inflow_clp numeric,outflow_clp numeric,balance_clp numeric,data_quality_flags text[],raw_record jsonb)
      on conflict(source_file_hash,sheet_name,source_row) do nothing`
    }else if(kind==='stock'){
      await sql`insert into canonical_stock_records(source_file_hash,sheet_name,source_row,event_date,item,product_family,lot_reference,grade_breakdown,total_kg,data_quality_flags,raw_record)
      select ${fileHash},x.sheet_name,x.source_row,nullif(x.event_date,'')::date,nullif(x.item,''),x.product_family,nullif(x.lot_reference,''),coalesce(x.grade_breakdown,'{}'::jsonb),x.total_kg,coalesce(x.data_quality_flags,array[]::text[]),coalesce(x.raw_record,'{}'::jsonb)
      from jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) as x(sheet_name text,source_row integer,event_date text,item text,product_family text,lot_reference text,grade_breakdown jsonb,total_kg numeric,data_quality_flags text[],raw_record jsonb)
      on conflict(source_file_hash,sheet_name,source_row) do nothing`
    }else if(kind==='transfers'){
      await sql`insert into canonical_transfers_received(source_file_hash,sheet_name,source_row,event_date,bank,sender,amount_clp,data_quality_flags,raw_record)
      select ${fileHash},x.sheet_name,x.source_row,nullif(x.event_date,'')::date,nullif(x.bank,''),nullif(x.sender,''),x.amount_clp,coalesce(x.data_quality_flags,array[]::text[]),coalesce(x.raw_record,'{}'::jsonb)
      from jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) as x(sheet_name text,source_row integer,event_date text,bank text,sender text,amount_clp numeric,data_quality_flags text[],raw_record jsonb)
      on conflict(source_file_hash,sheet_name,source_row) do nothing`
    }else{
      await sql`insert into canonical_packing_boxes(source_file_hash,sheet_name,source_row,pack_format,box_number,lot_code,production_date,weight_breakdown,total_kg,notes,data_quality_flags,raw_record)
      select ${fileHash},x.sheet_name,x.source_row,x.pack_format,x.box_number,nullif(x.lot_code,''),nullif(x.production_date,'')::date,coalesce(x.weight_breakdown,'{}'::jsonb),x.total_kg,nullif(x.notes,''),coalesce(x.data_quality_flags,array[]::text[]),coalesce(x.raw_record,'{}'::jsonb)
      from jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) as x(sheet_name text,source_row integer,pack_format text,box_number integer,lot_code text,production_date text,weight_breakdown jsonb,total_kg numeric,notes text,data_quality_flags text[],raw_record jsonb)
      on conflict(source_file_hash,sheet_name,source_row) do nothing`
    }
    return res.status(200).json({ok:true,kind,fileName,fileHash,sourceKind,rows:rows.length,idempotent:true,immutable:true})
  }catch(error){
    const message=error instanceof Error?error.message:''
    return res.status(message.includes('canonical_')||message.includes('historical_production')?503:500).json({ok:false,error:message.includes('canonical_')||message.includes('historical_production')?'Falta aplicar la capa canónica':'No fue posible publicar la fuente canónica'})
  }
}

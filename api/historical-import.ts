import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>;body?:unknown}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type PayloadRow={sourceRow:number;recordStatus:'operational'|'void';eventDate:string|null;receptionDate:string|null;processDate:string|null;productionDate:string|null;guideNumber:string|null;supplierOriginal:string|null;supplierName:string|null;extractionZone:string|null;guidePriceClp:number|null;processSiteOriginal:string|null;lotCode:string;guideKg:number|null;receivedKg:number|null;differenceKg:number|null;qualityDiscount:number|null;gradeBreakdown:Record<string,unknown>;yields:Record<string,unknown>;client:string|null;observations:string|null;dataQualityFlags:string[];rawRecord:Record<string,unknown>}
type Payload={fileName?:string;fileHash?:string;rows?:PayloadRow[]}

export default async function handler(request:Request,response:Response){
  response.setHeader('Cache-Control','no-store')
  if(request.method!=='POST'){response.setHeader('Allow','POST');return response.status(405).json({ok:false,error:'Método no permitido'})}
  try{
    const operator=await requireOperator(request,['admin','operations'])
    if(!operator)return response.status(403).json({ok:false,error:'Permisos insuficientes'})
    const body=(request.body??{}) as Payload
    const fileName=String(body.fileName??'').trim(),fileHash=String(body.fileHash??'').trim().toLowerCase(),rows=Array.isArray(body.rows)?body.rows:[]
    if(!fileName||!/^[a-f0-9]{64}$/.test(fileHash)||!rows.length)return response.status(400).json({ok:false,error:'Archivo, hash y filas válidas son obligatorios'})
    if(rows.length>10000)return response.status(413).json({ok:false,error:'La importación supera el máximo de 10.000 filas'})
    const clean=rows.filter(row=>Number.isInteger(row.sourceRow)&&row.sourceRow>0&&String(row.lotCode??'').trim()).map(row=>({...row,sourceFile:fileName,sourceFileHash:fileHash}))
    if(!clean.length)return response.status(400).json({ok:false,error:'No hay filas canónicas para publicar'})
    const sql=getSql()
    const before=await sql`select count(*)::int as count from historical_production_records where source_file_hash=${fileHash}`
    const existing=Number(Array.isArray(before)?before[0]?.count??0:0)
    await sql`
      insert into historical_production_records(
        source_row,source_file,source_file_hash,record_status,event_date,reception_date,process_date,production_date,
        guide_number,supplier_original,supplier_name,extraction_zone,guide_price_clp,process_site_original,lot_code,
        guide_kg,received_kg,difference_kg,quality_discount,grade_breakdown,yields,client,observations,data_quality_flags,raw_record
      )
      select
        x.source_row,${fileName},${fileHash},case when x.record_status='void' then 'void' else 'operational' end,
        nullif(x.event_date,'')::date,nullif(x.reception_date,'')::date,nullif(x.process_date,'')::date,nullif(x.production_date,'')::date,
        nullif(x.guide_number,''),nullif(x.supplier_original,''),nullif(x.supplier_name,''),nullif(x.extraction_zone,''),x.guide_price_clp,
        nullif(x.process_site_original,''),x.lot_code,x.guide_kg,x.received_kg,x.difference_kg,x.quality_discount,
        coalesce(x.grade_breakdown,'{}'::jsonb),coalesce(x.yields,'{}'::jsonb),nullif(x.client,''),nullif(x.observations,''),
        coalesce(x.data_quality_flags,array[]::text[]),coalesce(x.raw_record,'{}'::jsonb)
      from jsonb_to_recordset(${JSON.stringify(clean)}::jsonb) as x(
        source_row integer,record_status text,event_date text,reception_date text,process_date text,production_date text,
        guide_number text,supplier_original text,supplier_name text,extraction_zone text,guide_price_clp numeric,process_site_original text,lot_code text,
        guide_kg numeric,received_kg numeric,difference_kg numeric,quality_discount numeric,grade_breakdown jsonb,yields jsonb,client text,observations text,
        data_quality_flags text[],raw_record jsonb
      )
      on conflict(source_file_hash,source_row) do update set
        record_status=excluded.record_status,event_date=excluded.event_date,reception_date=excluded.reception_date,process_date=excluded.process_date,
        production_date=excluded.production_date,guide_number=excluded.guide_number,supplier_original=excluded.supplier_original,supplier_name=excluded.supplier_name,
        extraction_zone=excluded.extraction_zone,guide_price_clp=excluded.guide_price_clp,process_site_original=excluded.process_site_original,lot_code=excluded.lot_code,
        guide_kg=excluded.guide_kg,received_kg=excluded.received_kg,difference_kg=excluded.difference_kg,quality_discount=excluded.quality_discount,
        grade_breakdown=excluded.grade_breakdown,yields=excluded.yields,client=excluded.client,observations=excluded.observations,
        data_quality_flags=excluded.data_quality_flags,raw_record=excluded.raw_record
    `
    const after=await sql`select count(*)::int as count,count(*) filter(where cardinality(data_quality_flags)>0)::int as flagged from historical_production_records where source_file_hash=${fileHash}`
    const total=Number(Array.isArray(after)?after[0]?.count??0:0),flagged=Number(Array.isArray(after)?after[0]?.flagged??0:0)
    return response.status(200).json({ok:true,total,inserted:Math.max(0,total-existing),duplicates:Math.min(existing,total),flagged,fileHash})
  }catch(error){
    const message=error instanceof Error?error.message:''
    return response.status(message.includes('DATABASE_URL')?503:500).json({ok:false,error:message.includes('DATABASE_URL')?'Base de datos no conectada':'No fue posible publicar la producción histórica'})
  }
}

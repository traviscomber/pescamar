import type {SessionOperator} from './_auth.js'
import {getSql} from './_db.js'
import {allowedPlantIds} from './_plants.js'

type Row=Record<string,unknown>
function rows(value:unknown){return Array.isArray(value)?value as Row[]:[]}
function count(value:unknown){return Number(value??0)}
function numberOrNull(value:unknown){const parsed=Number(value);return Number.isFinite(parsed)?parsed:null}
function text(value:unknown){return value==null?null:String(value)}
function date(value:unknown){return value instanceof Date?value.toISOString():typeof value==='string'?value:null}
function object(value:unknown){return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null}

function historicalRecord(row:Row,financial:boolean,commercial:boolean){
  const flags=Array.isArray(row.data_quality_flags)?row.data_quality_flags:[]
  return {
    recordId:text(row.id),lotCode:text(row.lot_code),sourceFile:text(row.source_file),sourceFileHash:text(row.source_file_hash),sourceRow:count(row.source_row),recordStatus:text(row.record_status),
    eventDate:date(row.event_date),receptionDate:date(row.reception_date),processDate:date(row.process_date),productionDate:date(row.production_date),guideNumber:text(row.guide_number),supplier:text(row.supplier_name),extractionZone:text(row.extraction_zone),processSite:text(row.process_site_original),
    guideKg:numberOrNull(row.guide_kg),receivedKg:numberOrNull(row.received_kg),differenceKg:numberOrNull(row.difference_kg),guidePriceClp:financial?numberOrNull(row.guide_price_clp):null,
    gradeBreakdown:object(row.grade_breakdown)??{},yields:object(row.yields)??{},client:commercial?text(row.client):null,observations:text(row.observations),qualityDiscount:numberOrNull(row.quality_discount),dataQualityFlags:flags,
    replayCoverage:{reception:Boolean(row.reception_date||row.received_kg!=null||row.guide_kg!=null),production:Boolean(row.process_date||row.production_date||object(row.grade_breakdown)||object(row.yields)),qualityReview:Boolean(row.quality_discount!=null||flags.length),packing:false,inventory:false,commercialCommitment:false,dispatch:false,sale:false,finance:false},
    boundary:{readOnly:true,canonicalHistorical:true,liveInventory:false,promotionAllowed:false},
  }
}

export async function buildHistoricalLineageEvidence(operator:SessionOperator,focusLotCode:string|null=null){
  const corporateHistory=operator.role==='admin'||allowedPlantIds(operator).length>=6
  if(!corporateHistory)return null
  const sql=getSql(),focus=focusLotCode?.trim()||null,financial=['admin','finance','operations'].includes(operator.role),commercial=['admin','operations','finance'].includes(operator.role)
  const focusPromise=focus
    ?sql`select id,source_file,source_file_hash,source_row,record_status,event_date,reception_date,process_date,production_date,guide_number,supplier_name,extraction_zone,guide_price_clp,process_site_original,lot_code,guide_kg,received_kg,difference_kg,quality_discount,grade_breakdown,yields,client,observations,data_quality_flags from historical_production_records where record_status='operational' and lower(lot_code)=lower(${focus}) order by coalesce(event_date,production_date,process_date,reception_date),id limit 8`
    :Promise.resolve([])
  const [summaryRaw,latestRaw,focusRaw]=await Promise.all([
    sql`select count(*) filter(where record_status='operational')::int operational_rows,count(*) filter(where record_status='void')::int void_rows,count(*) filter(where record_status='operational' and coalesce(event_date,production_date,process_date,reception_date)>=date '2026-01-01' and coalesce(event_date,production_date,process_date,reception_date)<date '2027-01-01')::int rows_2026,count(*) filter(where record_status='operational' and coalesce(event_date,production_date,process_date,reception_date)>=date '2025-01-01' and coalesce(event_date,production_date,process_date,reception_date)<date '2026-01-01')::int rows_2025,min(coalesce(event_date,production_date,process_date,reception_date)) filter(where record_status='operational') first_event_date,max(coalesce(event_date,production_date,process_date,reception_date)) filter(where record_status='operational') latest_event_date from historical_production_records`,
    sql`select id,lot_code,source_file,source_row,coalesce(event_date,production_date,process_date,reception_date) event_date,reception_date,process_date,production_date,guide_number,supplier_name,extraction_zone,process_site_original,guide_kg,received_kg,difference_kg,data_quality_flags from historical_production_records where record_status='operational' order by coalesce(event_date,production_date,process_date,reception_date) desc nulls last,id limit 24`,
    focusPromise,
  ])
  const summary=rows(summaryRaw)[0]??{},latest=rows(latestRaw).map(row=>({recordId:text(row.id),lotCode:text(row.lot_code),sourceFile:text(row.source_file),sourceRow:count(row.source_row),eventDate:date(row.event_date),receptionDate:date(row.reception_date),processDate:date(row.process_date),productionDate:date(row.production_date),guideNumber:text(row.guide_number),supplier:text(row.supplier_name),extractionZone:text(row.extraction_zone),processSite:text(row.process_site_original),guideKg:count(row.guide_kg),receivedKg:count(row.received_kg),differenceKg:count(row.difference_kg),dataQualityFlags:Array.isArray(row.data_quality_flags)?row.data_quality_flags:[]})),focusRecords=rows(focusRaw).map(row=>historicalRecord(row,financial,commercial))
  const data={operationalRows:count(summary.operational_rows),voidRows:count(summary.void_rows),rows2026:count(summary.rows_2026),rows2025:count(summary.rows_2025),firstEventDate:date(summary.first_event_date),latestEventDate:date(summary.latest_event_date),latestRecords:latest,focusLotCode:focus,focusMatchCount:focusRecords.length,focusRecords,readOnly:true,canonicalHistorical:true,liveInventory:false,promotionAllowed:false,lineagePath:'/lineage?mode=historical&year=2026'}
  return {source:{id:'historical_lineage',label:'Seafood Event Graph · histórico canónico',path:'/lineage?mode=historical&year=2026',rows:data.operationalRows,freshness:data.latestEventDate},data}
}

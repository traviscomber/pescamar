import type {SessionOperator} from './_auth.js'
import {getSql} from './_db.js'
import {allowedPlantIds} from './_plants.js'

type Row=Record<string,unknown>
function rows(value:unknown){return Array.isArray(value)?value as Row[]:[]}
function count(value:unknown){return Number(value??0)}
function text(value:unknown){return value==null?null:String(value)}
function date(value:unknown){return value instanceof Date?value.toISOString():typeof value==='string'?value:null}

export async function buildHistoricalLineageEvidence(operator:SessionOperator){
  const corporateHistory=operator.role==='admin'||allowedPlantIds(operator).length>=6
  if(!corporateHistory)return null
  const sql=getSql()
  const [summaryRaw,latestRaw]=await Promise.all([
    sql`select count(*) filter(where record_status='operational')::int operational_rows,count(*) filter(where record_status='void')::int void_rows,count(*) filter(where record_status='operational' and coalesce(event_date,production_date,process_date,reception_date)>=date '2026-01-01' and coalesce(event_date,production_date,process_date,reception_date)<date '2027-01-01')::int rows_2026,count(*) filter(where record_status='operational' and coalesce(event_date,production_date,process_date,reception_date)>=date '2025-01-01' and coalesce(event_date,production_date,process_date,reception_date)<date '2026-01-01')::int rows_2025,min(coalesce(event_date,production_date,process_date,reception_date)) filter(where record_status='operational') first_event_date,max(coalesce(event_date,production_date,process_date,reception_date)) filter(where record_status='operational') latest_event_date from historical_production_records`,
    sql`select id,lot_code,source_file,source_row,coalesce(event_date,production_date,process_date,reception_date) event_date,reception_date,process_date,production_date,guide_number,supplier_name,extraction_zone,process_site_original,guide_kg,received_kg,difference_kg,data_quality_flags from historical_production_records where record_status='operational' order by coalesce(event_date,production_date,process_date,reception_date) desc nulls last,id limit 24`
  ])
  const summary=rows(summaryRaw)[0]??{},latest=rows(latestRaw).map(row=>({recordId:text(row.id),lotCode:text(row.lot_code),sourceFile:text(row.source_file),sourceRow:count(row.source_row),eventDate:date(row.event_date),receptionDate:date(row.reception_date),processDate:date(row.process_date),productionDate:date(row.production_date),guideNumber:text(row.guide_number),supplier:text(row.supplier_name),extractionZone:text(row.extraction_zone),processSite:text(row.process_site_original),guideKg:count(row.guide_kg),receivedKg:count(row.received_kg),differenceKg:count(row.difference_kg),dataQualityFlags:Array.isArray(row.data_quality_flags)?row.data_quality_flags:[]}))
  const data={operationalRows:count(summary.operational_rows),voidRows:count(summary.void_rows),rows2026:count(summary.rows_2026),rows2025:count(summary.rows_2025),firstEventDate:date(summary.first_event_date),latestEventDate:date(summary.latest_event_date),latestRecords:latest,readOnly:true,canonicalHistorical:true,liveInventory:false,lineagePath:'/lineage?mode=historical&year=2026'}
  return {source:{id:'historical_lineage',label:'Seafood Event Graph · histórico canónico',path:'/lineage?mode=historical&year=2026',rows:data.operationalRows,freshness:data.latestEventDate},data}
}

import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'
import {resolveRequestOrganization} from './_organization.js'
import {seafoodEvent,sortSeafoodEvents,type SeafoodEvent} from './_seafood-event.js'

type Request={method?:string;query?:Record<string,string|string[]|undefined>;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type Row=Record<string,unknown>
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
function one(value:string|string[]|undefined){return Array.isArray(value)?value[0]:value}
function text(value:unknown){return value==null?null:String(value)}
function numberOrNull(value:unknown){const parsed=Number(value);return Number.isFinite(parsed)?parsed:null}
function rows(value:unknown){return Array.isArray(value)?value as Row[]:[]}
function object(value:unknown){return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null}
function array(value:unknown){return Array.isArray(value)?value:[]}
function observedDate(row:Row){return text(row.event_date)??text(row.production_date)??text(row.process_date)??text(row.reception_date)}
function historicalLotId(row:Row){return text(row.lot_code)??`historical:${String(row.id)}`}

export default async function handler(request:Request,response:Response){
  response.setHeader('Cache-Control','no-store')
  if(request.method!=='GET'){response.setHeader('Allow','GET');return response.status(405).json({ok:false,error:'Método no permitido'})}
  try{
    const operator=await requireOperator(request)
    if(!operator)return response.status(401).json({ok:false,error:'Sesión requerida'})
    const organization=resolveRequestOrganization(request.headers,operator.organizationId)
    if(!organization)return response.status(409).json({ok:false,code:'ORGANIZATION_CONTEXT_UNSUPPORTED',error:'La organización solicitada no está habilitada en esta implementación'})
    const sql=getSql(),recordId=String(one(request.query?.recordId)??'').trim(),yearRaw=String(one(request.query?.year)??'2026').trim(),year=Number(yearRaw)
    if(!Number.isInteger(year)||year<2020||year>2100)return response.status(400).json({ok:false,error:'Año inválido'})

    if(!recordId){
      const start=`${year}-01-01`,end=`${year+1}-01-01`
      const result=await sql`select id,source_file,source_row,record_status,event_date,reception_date,process_date,production_date,guide_number,supplier_name,extraction_zone,process_site_original,plant_id,lot_code,guide_kg,received_kg,difference_kg,data_quality_flags from historical_production_records where record_status='operational' and coalesce(event_date,production_date,process_date,reception_date)>=${start}::date and coalesce(event_date,production_date,process_date,reception_date)<${end}::date order by coalesce(event_date,production_date,process_date,reception_date) desc,id`
      const records=rows(result).map(row=>({id:String(row.id),lotCode:text(row.lot_code),sourceFile:text(row.source_file),sourceRow:numberOrNull(row.source_row),eventDate:observedDate(row),receptionDate:text(row.reception_date),processDate:text(row.process_date),productionDate:text(row.production_date),guideNumber:text(row.guide_number),supplier:text(row.supplier_name),extractionZone:text(row.extraction_zone),processSite:text(row.process_site_original),plantId:text(row.plant_id),guideKg:numberOrNull(row.guide_kg),receivedKg:numberOrNull(row.received_kg),differenceKg:numberOrNull(row.difference_kg),qualityFlags:array(row.data_quality_flags)}))
      return response.status(200).json({ok:true,schemaVersion:'seafood.historical-lineage.index.v1',organizationId:organization.organizationId,year,count:records.length,records,boundary:{readOnly:true,canonicalHistorical:true,liveInventory:false}})
    }

    if(!uuid.test(recordId))return response.status(400).json({ok:false,error:'Registro histórico inválido'})
    const result=await sql`select id,source_file,source_file_hash,source_row,record_status,event_date,reception_date,process_date,production_date,guide_number,supplier_name,extraction_zone,guide_price_clp,process_site_original,plant_id,lot_code,guide_kg,received_kg,difference_kg,quality_discount,grade_breakdown,yields,client,observations,data_quality_flags,imported_at from historical_production_records where id=${recordId}::uuid and record_status='operational' limit 1`
    const row=rows(result)[0]
    if(!row)return response.status(404).json({ok:false,error:'Registro histórico no disponible'})

    const lotId=historicalLotId(row),siteId=text(row.plant_id)??text(row.process_site_original),events:SeafoodEvent[]=[]
    if(row.reception_date||row.received_kg!=null||row.guide_kg!=null){
      events.push(seafoodEvent({id:`historical-reception:${recordId}`,siteId,lotId,type:'reception',occurredAt:text(row.reception_date)??observedDate(row),title:`Recepción histórica · guía ${text(row.guide_number)??'sin número'}`,detail:text(row.supplier_name),actor:null,metrics:{historical:true,canonical:true,supplier:text(row.supplier_name),extractionZone:text(row.extraction_zone),guideKg:numberOrNull(row.guide_kg),receivedKg:numberOrNull(row.received_kg),differenceKg:numberOrNull(row.difference_kg),guidePriceClp:numberOrNull(row.guide_price_clp)},source:{entityType:'historical_production_record',entityId:recordId}}))
    }
    if(row.process_date){
      events.push(seafoodEvent({id:`historical-process:${recordId}`,siteId,lotId,type:'production',occurredAt:text(row.process_date),title:'Proceso histórico',detail:text(row.process_site_original),actor:null,metrics:{historical:true,canonical:true,processSite:text(row.process_site_original),observations:text(row.observations)},source:{entityType:'historical_production_record',entityId:recordId}}))
    }
    if(row.production_date||object(row.grade_breakdown)||object(row.yields)){
      events.push(seafoodEvent({id:`historical-production:${recordId}`,siteId,lotId,type:'production',occurredAt:text(row.production_date)??observedDate(row),title:'Producción histórica',detail:text(row.client),actor:null,metrics:{historical:true,canonical:true,gradeBreakdown:object(row.grade_breakdown)??{},yields:object(row.yields)??{},client:['admin','operations','finance'].includes(operator.role)?text(row.client):null},source:{entityType:'historical_production_record',entityId:recordId}}))
    }
    const flags=array(row.data_quality_flags)
    if(row.quality_discount!=null||flags.length){
      events.push(seafoodEvent({id:`historical-quality:${recordId}`,siteId,lotId,type:'quality',occurredAt:observedDate(row),title:'Calidad histórica',detail:flags.length?'Registro con señales de revisión':'Descuento de calidad observado',actor:null,metrics:{historical:true,canonical:true,qualityDiscount:numberOrNull(row.quality_discount),dataQualityFlags:flags},source:{entityType:'historical_production_record',entityId:recordId}}))
    }
    events.push(seafoodEvent({id:`historical-evidence:${recordId}`,siteId,lotId,type:'evidence',occurredAt:text(row.imported_at)??observedDate(row),title:`Fuente canónica · ${text(row.source_file)??'archivo histórico'}`,detail:`Fila ${text(row.source_row)??'—'} · evidencia histórica de solo lectura`,actor:null,metrics:{historical:true,canonical:true,sourceFile:text(row.source_file),sourceFileHash:text(row.source_file_hash),sourceRow:numberOrNull(row.source_row),recordStatus:text(row.record_status)},source:{entityType:'historical_production_record',entityId:recordId}}))

    const ordered=sortSeafoodEvents(events),has=(type:SeafoodEvent['type'])=>ordered.some(event=>event.type===type)
    return response.status(200).json({ok:true,schemaVersion:'seafood.historical-lineage.v1',organizationId:organization.organizationId,organization:{id:organization.organizationId,implementationId:organization.implementationId,implementationName:organization.implementationName,isolationMode:organization.isolationMode},siteId,lotId,recordId,mode:'canonical_historical',events:ordered,coverage:{reception:has('reception'),evidence:has('evidence'),quality:has('quality'),production:has('production'),vision:false,inventory:false,commercialCommitment:false,dispatch:false,sale:null},permissions:{canSeeCommercial:['admin','operations','finance'].includes(operator.role)},boundary:{readOnly:true,canonicalHistorical:true,liveInventory:false,organizationScoped:false}})
  }catch(error){
    const message=error instanceof Error?error.message:''
    const missing=message.includes('historical_production_records')
    return response.status(missing?503:500).json({ok:false,error:missing?'Falta la fuente histórica canónica':'No fue posible construir el lineage histórico'})
  }
}

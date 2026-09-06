import {requireOperator,type SessionOperator} from './_auth.js'
import {getSql} from './_db.js'
import {activeOrganization,resolveRequestOrganization} from './_organization.js'
import {seafoodEvent,sortSeafoodEvents,type SeafoodEvent} from './_seafood-event.js'

type Request={method?:string;query?:Record<string,string|string[]|undefined>;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type Row=Record<string,unknown>
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
function one(value:string|string[]|undefined){return Array.isArray(value)?value[0]:value}
function text(value:unknown){return value==null?null:String(value)}
function numberOrNull(value:unknown){const parsed=Number(value);return Number.isFinite(parsed)?parsed:null}
function rows(value:unknown){return Array.isArray(value)?value as Row[]:[]}
async function accessibleReception(id:string,operator:SessionOperator){const sql=getSql(),result=operator.role==='admin'?await sql`select id,plant_id from receptions where id=${id}::uuid limit 1`:await sql`select id,plant_id from receptions where id=${id}::uuid and plant_id=any(${operator.plantIds}::text[]) limit 1`;return Array.isArray(result)?result[0] as {id?:string;plant_id?:string|null}|undefined:undefined}
async function optionalVisionRows(receptionId:string){const sql=getSql();try{return await sql`select c.id,c.evidence_file_id,c.capture_source,c.device_label,c.image_sha256,c.source_image_sha256,c.pixel_count,c.l_mean,c.a_mean,c.b_mean,c.l_std,c.a_std,c.b_std,c.chroma,c.hue_deg,c.suggested_grade,c.delta_e,c.operator_grade,c.decision,c.confirmed_by,c.confirmed_at,c.created_by,c.created_at from sea_urchin_color_captures c join sea_urchin_process_runs u on u.id=c.run_id where u.reception_id=${receptionId}::uuid order by c.created_at`}catch(error){const message=error instanceof Error?error.message:'';if(message.includes('sea_urchin_color_captures')||message.includes('sea_urchin_process_runs'))return [];throw error}}

export default async function handler(request:Request,response:Response){
  response.setHeader('Cache-Control','no-store')
  if(request.method!=='GET'){response.setHeader('Allow','GET');return response.status(405).json({ok:false,error:'Método no permitido'})}
  try{
    const operator=await requireOperator(request)
    if(!operator)return response.status(401).json({ok:false,error:'Sesión requerida'})
    const organization=resolveRequestOrganization(request.headers,operator.organizationId)
    if(!organization)return response.status(409).json({ok:false,code:'ORGANIZATION_CONTEXT_UNSUPPORTED',error:'La organización solicitada no está habilitada en esta implementación'})
    const receptionId=String(one(request.query?.receptionId)??'').trim()
    if(!uuid.test(receptionId))return response.status(400).json({ok:false,error:'Recepción inválida'})
    const access=await accessibleReception(receptionId,operator)
    if(!access)return response.status(404).json({ok:false,error:'Lote no disponible'})

    const sql=getSql(),commercialRole=['admin','operations','finance'].includes(operator.role),siteId=access.plant_id??null
    const [receptionRaw,evidenceRaw,lotEventsRaw,visionRaw,movementsRaw,ordersRaw,dispatchRaw,salesRaw]=await Promise.all([
      sql`select r.id,r.reception_number,r.plant_id,r.species,r.extraction_zone,r.source_reference,r.source,r.guide_kg,r.gross_kg,r.tare_kg,r.drained_kg,r.accepted_kg,r.received_at,r.created_at,r.created_by,p.legal_name supplier from receptions r join parties p on p.id=r.supplier_id where r.id=${receptionId}::uuid limit 1`,
      sql`select id,kind,label,url,note,created_by,created_at from reception_evidence where reception_id=${receptionId}::uuid order by created_at`,
      sql`select id,event_type,title,detail,metrics,created_by,occurred_at from lot_events where reception_id=${receptionId}::uuid order by occurred_at`,
      optionalVisionRows(receptionId),
      sql`select m.id,m.movement_type,m.moved_kg,m.reason,m.occurred_at,m.created_by,fl.name from_location,tl.name to_location from inventory_movements m left join inventory_locations fl on fl.id=m.from_location_id left join inventory_locations tl on tl.id=m.to_location_id where m.reception_id=${receptionId}::uuid order by m.occurred_at`,
      commercialRole?sql`select a.id allocation_id,a.allocated_kg,a.created_at,a.created_by,o.id order_id,o.order_number,o.product,o.delivery_date,o.status,c.legal_name customer from sales_order_allocations a join sales_orders o on o.id=a.order_id join parties c on c.id=o.customer_id where a.reception_id=${receptionId}::uuid order by a.created_at`:Promise.resolve([]),
      sql`select d.id,d.dispatch_number,d.destination,d.dispatched_kg,d.document_ref,d.vehicle_ref,d.status,d.dispatched_at,d.created_by,c.legal_name customer from lot_dispatches d left join parties c on c.id=d.customer_id where d.reception_id=${receptionId}::uuid order by d.dispatched_at`,
      commercialRole?sql`select s.id,s.dispatch_id,s.sold_kg,s.price_per_kg_clp,s.invoice_ref,s.status,s.sold_at,s.created_by,c.legal_name customer from lot_sales s join parties c on c.id=s.customer_id where s.reception_id=${receptionId}::uuid order by s.sold_at`:Promise.resolve([])
    ])

    const reception=rows(receptionRaw)[0]
    if(!reception)return response.status(404).json({ok:false,error:'Lote no disponible'})
    const events:SeafoodEvent[]=[]
    events.push(seafoodEvent({id:`reception:${receptionId}`,siteId,lotId:receptionId,type:'reception',occurredAt:text(reception.received_at)??text(reception.created_at),title:`Recepción ${text(reception.reception_number)??receptionId.slice(0,8)}`,detail:text(reception.species),actor:text(reception.created_by),metrics:{species:text(reception.species),supplier:text(reception.supplier),extractionZone:text(reception.extraction_zone),sourceReference:text(reception.source_reference),source:text(reception.source),guideKg:numberOrNull(reception.guide_kg),grossKg:numberOrNull(reception.gross_kg),tareKg:numberOrNull(reception.tare_kg),drainedKg:numberOrNull(reception.drained_kg),acceptedKg:numberOrNull(reception.accepted_kg)},source:{entityType:'reception',entityId:receptionId}},organization))

    for(const row of rows(evidenceRaw)){
      const id=String(row.id)
      events.push(seafoodEvent({id:`evidence:${id}`,siteId,lotId:receptionId,type:'evidence',occurredAt:text(row.created_at),title:`Evidencia · ${text(row.label)??text(row.kind)??'Documento'}`,detail:text(row.note),actor:text(row.created_by),metrics:{kind:text(row.kind),label:text(row.label),url:text(row.url)},source:{entityType:'reception_evidence',entityId:id}},organization))
    }

    for(const row of rows(lotEventsRaw)){
      const id=String(row.id),rawType=String(row.event_type??'note'),type=rawType==='quality'||rawType==='production'?rawType:'note'
      events.push(seafoodEvent({id:`lot_event:${id}`,siteId,lotId:receptionId,type,occurredAt:text(row.occurred_at),title:text(row.title)??'Evento operacional',detail:text(row.detail),actor:text(row.created_by),metrics:row.metrics&&typeof row.metrics==='object'&&!Array.isArray(row.metrics)?row.metrics as Record<string,unknown>:{},source:{entityType:'lot_event',entityId:id}},organization))
    }

    for(const row of rows(visionRaw)){
      const id=String(row.id)
      events.push(seafoodEvent({id:`vision:${id}`,siteId,lotId:receptionId,type:'vision',occurredAt:text(row.created_at),title:'Vision · Uni Vision color',detail:text(row.decision),actor:text(row.created_by),metrics:{evidenceFileId:text(row.evidence_file_id),captureSource:text(row.capture_source),deviceLabel:text(row.device_label),imageSha256:text(row.image_sha256),sourceImageSha256:text(row.source_image_sha256),pixelCount:numberOrNull(row.pixel_count),lab:{l:numberOrNull(row.l_mean),a:numberOrNull(row.a_mean),b:numberOrNull(row.b_mean)},dispersion:{l:numberOrNull(row.l_std),a:numberOrNull(row.a_std),b:numberOrNull(row.b_std)},chroma:numberOrNull(row.chroma),hueDeg:numberOrNull(row.hue_deg),suggestedGrade:text(row.suggested_grade),deltaE:numberOrNull(row.delta_e),operatorGrade:text(row.operator_grade),decision:text(row.decision),confirmedBy:text(row.confirmed_by),confirmedAt:text(row.confirmed_at)},source:{entityType:'sea_urchin_color_capture',entityId:id}},organization))
    }

    for(const row of rows(movementsRaw)){
      const id=String(row.id),movementType=text(row.movement_type)??'movimiento'
      events.push(seafoodEvent({id:`inventory:${id}`,siteId,lotId:receptionId,type:'inventory',occurredAt:text(row.occurred_at),title:`Inventario · ${movementType}`,detail:text(row.reason),actor:text(row.created_by),metrics:{movementType,movedKg:numberOrNull(row.moved_kg),fromLocation:text(row.from_location),toLocation:text(row.to_location)},source:{entityType:'inventory_movement',entityId:id}},organization))
    }

    for(const row of rows(ordersRaw)){
      const id=String(row.allocation_id)
      events.push(seafoodEvent({id:`commercial_commitment:${id}`,siteId,lotId:receptionId,type:'commercial_commitment',occurredAt:text(row.created_at),title:`Compromiso · ${text(row.order_number)??id.slice(0,8)}`,detail:text(row.product),actor:text(row.created_by),metrics:{orderId:text(row.order_id),orderNumber:text(row.order_number),customer:text(row.customer),product:text(row.product),allocatedKg:numberOrNull(row.allocated_kg),deliveryDate:text(row.delivery_date),status:text(row.status)},source:{entityType:'sales_order_allocation',entityId:id}},organization))
    }

    for(const row of rows(dispatchRaw)){
      const id=String(row.id)
      events.push(seafoodEvent({id:`dispatch:${id}`,siteId,lotId:receptionId,type:'dispatch',occurredAt:text(row.dispatched_at),title:`Despacho · ${text(row.dispatch_number)??id.slice(0,8)}`,detail:text(row.destination),actor:text(row.created_by),metrics:{customer:text(row.customer),destination:text(row.destination),dispatchedKg:numberOrNull(row.dispatched_kg),documentRef:text(row.document_ref),vehicleRef:text(row.vehicle_ref),status:text(row.status)},source:{entityType:'lot_dispatch',entityId:id}},organization))
    }

    for(const row of rows(salesRaw)){
      const id=String(row.id)
      events.push(seafoodEvent({id:`sale:${id}`,siteId,lotId:receptionId,type:'sale',occurredAt:text(row.sold_at),title:`Venta · ${text(row.invoice_ref)??text(row.customer)??id.slice(0,8)}`,detail:text(row.customer),actor:text(row.created_by),metrics:{dispatchId:text(row.dispatch_id),customer:text(row.customer),soldKg:numberOrNull(row.sold_kg),pricePerKgClp:numberOrNull(row.price_per_kg_clp),invoiceRef:text(row.invoice_ref),status:text(row.status)},source:{entityType:'lot_sale',entityId:id}},organization))
    }

    const ordered=sortSeafoodEvents(events),has=(type:SeafoodEvent['type'])=>ordered.some(event=>event.type===type)
    return response.status(200).json({ok:true,schemaVersion:'seafood.lineage.v1',organizationId:organization.organizationId,organization:{id:organization.organizationId,implementationId:organization.implementationId,implementationName:organization.implementationName,isolationMode:organization.isolationMode},siteId,lotId:receptionId,events:ordered,coverage:{reception:has('reception'),evidence:has('evidence'),quality:has('quality'),production:has('production'),vision:has('vision'),inventory:has('inventory'),commercialCommitment:has('commercial_commitment'),dispatch:has('dispatch'),sale:commercialRole?has('sale'):null},permissions:{canSeeCommercial:commercialRole},boundary:{organizationScoped:activeOrganization.isolationMode==='organization_scoped'}})
  }catch(error){
    const message=error instanceof Error?error.message:''
    const migration=['lot_events','inventory_movements','sales_order_allocations','lot_dispatches','lot_sales'].some(table=>message.includes(table))
    return response.status(migration?503:500).json({ok:false,error:migration?'Faltan migraciones de trazabilidad':'No fue posible construir el lineage del lote'})
  }
}
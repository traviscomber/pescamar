import type { SessionOperator } from './_auth.js'
import { getSql } from './_db.js'
import { allowedPlantIds, hasPlantAccess, PLANT_IDS } from './_plants.js'

export type CopilotSource={id:string;label:string;path:string;rows:number;freshness:string|null}
export type CopilotContext={generatedAt:string;scope:{plantId:string|null;plantIds:string[];role:SessionOperator['role'];financial:boolean;corporateHistory:boolean};sources:CopilotSource[];data:Record<string,unknown>}

const rows=(value:unknown)=>Array.isArray(value)?value as Record<string,unknown>[]:[]
const count=(value:unknown)=>Number(value??0)
const date=(value:unknown)=>value instanceof Date?value.toISOString():typeof value==='string'?value:null
const latest=(records:Record<string,unknown>[],key:string)=>records.reduce<string|null>((current,row)=>{const next=date(row[key]);return next&&(!current||next>current)?next:current},null)
const productFamily=(sourceKinds:unknown)=>{const kinds=String(sourceKinds??'').toLowerCase();if(kinds.includes('octopus'))return 'pulpo';if(kinds.includes('urchin'))return 'erizo';return null}

export function resolveCopilotPlant(operator:SessionOperator,value:unknown){
 const plantId=typeof value==='string'?value.trim().toLowerCase():''
 if(!plantId)return null
 return PLANT_IDS.includes(plantId as typeof PLANT_IDS[number])&&hasPlantAccess(operator,plantId)?plantId:undefined
}

export async function buildCopilotContext(operator:SessionOperator,plantId:string|null):Promise<CopilotContext>{
 const sql=getSql(),allowed=allowedPlantIds(operator),admin=operator.role==='admin',plantIds=plantId?[plantId]:allowed
 const financial=['admin','finance','operations'].includes(operator.role)
 const commercial=['admin','finance','operations','viewer'].includes(operator.role)
 const corporateHistory=admin||allowed.length>=6
 const [receptionRaw,productionRaw,qualityRaw,inventoryRaw,ordersRaw,canonicalRaw,canonicalInventoryRaw,financeRaw]=await Promise.all([
  sql`select r.id,r.reception_number,r.plant_id,r.species,r.status,r.quality_status,r.received_at,r.guide_kg,r.gross_kg,r.accepted_kg,p.legal_name supplier from receptions r join parties p on p.id=r.supplier_id where (${admin} or r.plant_id=any(${plantIds}::text[])) and (${plantId===null} or r.plant_id=${plantId}) order by r.received_at desc limit 80`,
  sql`select r.plant_id,count(*)::int events,coalesce(sum((le.metrics->>'inputKg')::numeric),0)::numeric input_kg,coalesce(sum((le.metrics->>'outputKg')::numeric),0)::numeric output_kg,max(le.occurred_at) latest_at from lot_events le join receptions r on r.id=le.reception_id where le.event_type='production' and (${admin} or r.plant_id=any(${plantIds}::text[])) and (${plantId===null} or r.plant_id=${plantId}) group by r.plant_id order by r.plant_id`,
  sql`select r.id,r.reception_number,r.plant_id,r.quality_status,r.species,p.legal_name supplier,r.received_at,coalesce((select count(*) from regulatory_holds h where h.reception_id=r.id and h.status in ('open','rejected')),0)::int active_holds from receptions r join parties p on p.id=r.supplier_id where (${admin} or r.plant_id=any(${plantIds}::text[])) and (${plantId===null} or r.plant_id=${plantId}) and (r.quality_status in ('Alerta calibre','Revisión') or exists(select 1 from regulatory_holds h where h.reception_id=r.id and h.status in ('open','rejected'))) order by r.received_at desc limit 50`,
  sql`select r.plant_id,count(*) filter(where coalesce(pos.kg,0)>0)::int lots,coalesce(sum(greatest(coalesce(pos.kg,0),0)),0)::numeric observed_kg,max(pos.latest_at) latest_at from receptions r left join lateral(select sum(case when im.to_location_id is not null then im.moved_kg else 0 end-case when im.from_location_id is not null then im.moved_kg else 0 end) kg,max(im.occurred_at) latest_at from inventory_movements im where im.reception_id=r.id)pos on true where (${admin} or r.plant_id=any(${plantIds}::text[])) and (${plantId===null} or r.plant_id=${plantId}) group by r.plant_id order by r.plant_id`,
  commercial?sql`select o.id,o.order_number,o.plant_id,o.species,o.product,o.committed_kg,o.delivery_date,o.status,c.legal_name customer,coalesce((select sum(a.allocated_kg) from sales_order_allocations a where a.order_id=o.id),0)::numeric allocated_kg from sales_orders o join parties c on c.id=o.customer_id where (${admin} or o.plant_id=any(${plantIds}::text[])) and (${plantId===null} or o.plant_id=${plantId}) and o.status in ('pending','prepared') order by o.delivery_date limit 60`:Promise.resolve([]),
  corporateHistory?sql`select file_name,source_kind,record_count,period_start,period_end,imported_at from canonical_source_files where canonical order by imported_at desc limit 40`:Promise.resolve([]),
  corporateHistory?sql`with packed as (
     select lot_code,min(production_date) first_date,max(production_date) last_date from canonical_packing_boxes where lot_code is not null group by lot_code
    ),produced as (
     select distinct lot_code from historical_production_records where record_status='operational' and lot_code is not null
    ),coverage as (
     select min(event_date) first_date,max(event_date) last_date,count(*)::int rows,count(*) filter(where lot_code is not null)::int rows_with_lot from historical_production_records where record_status='operational'
    ),linkage as (
     select count(*)::int packing_lots,count(*) filter(where h.lot_code is not null)::int matched_lots,count(*) filter(where h.lot_code is null and (c.last_date is null or p.last_date>c.last_date))::int outside_coverage_lots,count(*) filter(where h.lot_code is null and c.last_date is not null and p.last_date<=c.last_date)::int unresolved_within_coverage_lots
     from packed p cross join coverage c left join produced h on h.lot_code=p.lot_code
    )
    select (select string_agg(distinct s.file_name,', ' order by s.file_name) from canonical_source_files s join canonical_packing_boxes p on p.source_file_hash=s.file_hash where s.canonical) source_files,
      (select string_agg(distinct s.source_kind,', ' order by s.source_kind) from canonical_source_files s join canonical_packing_boxes p on p.source_file_hash=s.file_hash where s.canonical) source_kinds,
      (select count(*)::int from canonical_packing_boxes) packing_boxes,(select coalesce(sum(total_kg),0)::numeric from canonical_packing_boxes) packing_kg,(select min(production_date) from canonical_packing_boxes) packing_first_date,(select max(production_date) from canonical_packing_boxes) packing_last_date,
      c.first_date historical_first_date,c.last_date historical_last_date,c.rows historical_rows,c.rows_with_lot historical_rows_with_lot,l.packing_lots,l.matched_lots,l.outside_coverage_lots,l.unresolved_within_coverage_lots
    from coverage c cross join linkage l`:Promise.resolve([]),
  financial?sql`select count(*) filter(where s.status='pending')::int pending_settlements,coalesce(sum(s.gross_amount_clp) filter(where s.status in ('pending','approved')),0)::numeric known_gross_clp,max(s.updated_at) latest_at from settlements s join receptions r on r.id=s.reception_id where (${admin} or r.plant_id=any(${plantIds}::text[])) and (${plantId===null} or r.plant_id=${plantId})`:Promise.resolve([]),
 ])
 const receptions=rows(receptionRaw).map(row=>({receptionId:row.id,receptionNumber:count(row.reception_number),plantId:row.plant_id,species:row.species,status:row.status,qualityStatus:row.quality_status,receivedAt:row.received_at,guideKg:count(row.guide_kg),grossKg:count(row.gross_kg),acceptedKg:count(row.accepted_kg),supplier:row.supplier}))
 const production=rows(productionRaw).map(row=>{const input=count(row.input_kg),output=count(row.output_kg);return {plantId:row.plant_id,events:count(row.events),inputKg:input,outputKg:output,yieldPct:input>0?Number((output/input*100).toFixed(1)):null,latestAt:row.latest_at}})
 const quality=rows(qualityRaw).map(row=>({receptionId:row.id,receptionNumber:count(row.reception_number),plantId:row.plant_id,species:row.species,supplier:row.supplier,qualityStatus:row.quality_status,activeHolds:count(row.active_holds),receivedAt:row.received_at}))
 const inventory=rows(inventoryRaw).map(row=>({plantId:row.plant_id,lots:count(row.lots),observedKg:count(row.observed_kg),latestAt:row.latest_at}))
 const orders=rows(ordersRaw).map(row=>({orderId:row.id,orderNumber:count(row.order_number),plantId:row.plant_id,customer:row.customer,species:row.species,product:row.product,committedKg:count(row.committed_kg),allocatedKg:count(row.allocated_kg),deliveryDate:row.delivery_date,status:row.status}))
 const canonicalSources=rows(canonicalRaw).map(row=>({fileName:row.file_name,kind:row.source_kind,recordCount:count(row.record_count),periodStart:row.period_start,periodEnd:row.period_end,importedAt:row.imported_at}))
 const canonicalInventoryRow=corporateHistory?(rows(canonicalInventoryRaw)[0]??null):null
 const canonicalInventory=canonicalInventoryRow?{sourceFiles:canonicalInventoryRow.source_files,sourceKinds:canonicalInventoryRow.source_kinds,productFamily:productFamily(canonicalInventoryRow.source_kinds),packingBoxes:count(canonicalInventoryRow.packing_boxes),packingKg:count(canonicalInventoryRow.packing_kg),packingFirstDate:canonicalInventoryRow.packing_first_date,packingLastDate:canonicalInventoryRow.packing_last_date,historicalFirstDate:canonicalInventoryRow.historical_first_date,historicalLastDate:canonicalInventoryRow.historical_last_date,historicalRows:count(canonicalInventoryRow.historical_rows),historicalRowsWithLot:count(canonicalInventoryRow.historical_rows_with_lot),packingLots:count(canonicalInventoryRow.packing_lots),matchedLots:count(canonicalInventoryRow.matched_lots),outsideCoverageLots:count(canonicalInventoryRow.outside_coverage_lots),unresolvedWithinCoverageLots:count(canonicalInventoryRow.unresolved_within_coverage_lots),writesLiveInventory:false,linkageRule:'exact_lot_only; outside upstream coverage is not a failed match'}:null
 const finance=financial?(rows(financeRaw)[0]??null):null
 const sources:CopilotSource[]=[
  {id:'receptions',label:'Recepciones vivas',path:'/recepciones',rows:receptions.length,freshness:latest(receptions as Record<string,unknown>[],'receivedAt')},
  {id:'production',label:'Producción observada',path:'/lineas',rows:production.length,freshness:latest(production as Record<string,unknown>[],'latestAt')},
  {id:'quality',label:'Calidad y holds',path:'/control-regulatorio',rows:quality.length,freshness:latest(quality as Record<string,unknown>[],'receivedAt')},
  {id:'inventory',label:'Inventario observado',path:'/inventario',rows:inventory.length,freshness:latest(inventory as Record<string,unknown>[],'latestAt')},
 ]
 if(commercial)sources.push({id:'orders',label:'Compromisos comerciales',path:'/ordenes-venta',rows:orders.length,freshness:latest(orders as Record<string,unknown>[],'deliveryDate')})
 if(corporateHistory){sources.push({id:'canonical_sources',label:'Fuentes canónicas',path:'/importaciones',rows:canonicalSources.length,freshness:latest(canonicalSources as Record<string,unknown>[],'importedAt')});sources.push({id:'canonical_inventory',label:'Evidencia canónica de inventario',path:'/inventario',rows:canonicalInventory?.packingBoxes??0,freshness:canonicalInventory?date(canonicalInventory.packingLastDate):null})}
 if(financial)sources.push({id:'finance',label:'Cierre económico conocido',path:'/liquidaciones',rows:finance?1:0,freshness:finance?date(finance.latest_at):null})
 return {generatedAt:new Date().toISOString(),scope:{plantId,plantIds,role:operator.role,financial,corporateHistory},sources,data:{receptions,production,quality,inventory,...(commercial?{orders}:{}),...(corporateHistory?{canonical_sources:canonicalSources,canonical_inventory:canonicalInventory}:{}),...(financial?{finance:finance?{pendingSettlements:count(finance.pending_settlements),knownGrossClp:count(finance.known_gross_clp),latestAt:finance.latest_at}:null}:{})}}
}

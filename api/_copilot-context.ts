import type { SessionOperator } from './_auth.js'
import { getSql } from './_db.js'
import { allowedPlantIds, hasPlantAccess, PLANT_IDS } from './_plants.js'

export type CopilotSource={id:string;label:string;path:string;rows:number;freshness:string|null}
export type CopilotContext={generatedAt:string;scope:{plantId:string|null;plantIds:string[];role:SessionOperator['role'];financial:boolean;corporateHistory:boolean};sources:CopilotSource[];data:Record<string,unknown>}

const rows=(value:unknown)=>Array.isArray(value)?value as Record<string,unknown>[]:[]
const count=(value:unknown)=>Number(value??0)
const date=(value:unknown)=>value instanceof Date?value.toISOString():typeof value==='string'?value:null
const latest=(records:Record<string,unknown>[],key:string)=>records.reduce<string|null>((current,row)=>{const next=date(row[key]);return next&&(!current||next>current)?next:current},null)

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
 const [receptionRaw,productionRaw,qualityRaw,inventoryRaw,ordersRaw,canonicalRaw,financeRaw]=await Promise.all([
  sql`select r.id,r.reception_number,r.plant_id,r.species,r.status,r.quality_status,r.received_at,r.guide_kg,r.gross_kg,r.accepted_kg,p.legal_name supplier from receptions r join parties p on p.id=r.supplier_id where (${admin} or r.plant_id=any(${plantIds}::text[])) and (${plantId===null} or r.plant_id=${plantId}) order by r.received_at desc limit 80`,
  sql`select r.plant_id,count(*)::int events,coalesce(sum((le.metrics->>'inputKg')::numeric),0)::numeric input_kg,coalesce(sum((le.metrics->>'outputKg')::numeric),0)::numeric output_kg,max(le.occurred_at) latest_at from lot_events le join receptions r on r.id=le.reception_id where le.event_type='production' and (${admin} or r.plant_id=any(${plantIds}::text[])) and (${plantId===null} or r.plant_id=${plantId}) group by r.plant_id order by r.plant_id`,
  sql`select r.id,r.reception_number,r.plant_id,r.quality_status,r.species,p.legal_name supplier,r.received_at,coalesce((select count(*) from regulatory_holds h where h.reception_id=r.id and h.status in ('open','rejected')),0)::int active_holds from receptions r join parties p on p.id=r.supplier_id where (${admin} or r.plant_id=any(${plantIds}::text[])) and (${plantId===null} or r.plant_id=${plantId}) and (r.quality_status in ('Alerta calibre','Revisión') or exists(select 1 from regulatory_holds h where h.reception_id=r.id and h.status in ('open','rejected'))) order by r.received_at desc limit 50`,
  sql`select r.plant_id,count(*) filter(where coalesce(pos.kg,0)>0)::int lots,coalesce(sum(greatest(coalesce(pos.kg,0),0)),0)::numeric observed_kg,max(pos.latest_at) latest_at from receptions r left join lateral(select sum(case when im.to_location_id is not null then im.moved_kg else 0 end-case when im.from_location_id is not null then im.moved_kg else 0 end) kg,max(im.occurred_at) latest_at from inventory_movements im where im.reception_id=r.id)pos on true where (${admin} or r.plant_id=any(${plantIds}::text[])) and (${plantId===null} or r.plant_id=${plantId}) group by r.plant_id order by r.plant_id`,
  commercial?sql`select o.id,o.order_number,o.plant_id,o.species,o.product,o.committed_kg,o.delivery_date,o.status,c.legal_name customer,coalesce((select sum(a.allocated_kg) from sales_order_allocations a where a.order_id=o.id),0)::numeric allocated_kg from sales_orders o join parties c on c.id=o.customer_id where (${admin} or o.plant_id=any(${plantIds}::text[])) and (${plantId===null} or o.plant_id=${plantId}) and o.status in ('pending','prepared') order by o.delivery_date limit 60`:Promise.resolve([]),
  corporateHistory?sql`select file_name,source_kind,record_count,period_start,period_end,imported_at from canonical_source_files where canonical order by imported_at desc limit 40`:Promise.resolve([]),
  financial?sql`select count(*) filter(where s.status='pending')::int pending_settlements,coalesce(sum(s.gross_amount_clp) filter(where s.status in ('pending','approved','settled')),0)::numeric known_gross_clp,max(s.updated_at) latest_at from settlements s join receptions r on r.id=s.reception_id where (${admin} or r.plant_id=any(${plantIds}::text[])) and (${plantId===null} or r.plant_id=${plantId})`:Promise.resolve([]),
 ])
 const receptions=rows(receptionRaw).map(row=>({receptionId:row.id,receptionNumber:count(row.reception_number),plantId:row.plant_id,species:row.species,status:row.status,qualityStatus:row.quality_status,receivedAt:row.received_at,guideKg:count(row.guide_kg),grossKg:count(row.gross_kg),acceptedKg:count(row.accepted_kg),supplier:row.supplier}))
 const production=rows(productionRaw).map(row=>{const input=count(row.input_kg),output=count(row.output_kg);return {plantId:row.plant_id,events:count(row.events),inputKg:input,outputKg:output,yieldPct:input>0?Number((output/input*100).toFixed(1)):null,latestAt:row.latest_at}})
 const quality=rows(qualityRaw).map(row=>({receptionId:row.id,receptionNumber:count(row.reception_number),plantId:row.plant_id,species:row.species,supplier:row.supplier,qualityStatus:row.quality_status,activeHolds:count(row.active_holds),receivedAt:row.received_at}))
 const inventory=rows(inventoryRaw).map(row=>({plantId:row.plant_id,lots:count(row.lots),observedKg:count(row.observed_kg),latestAt:row.latest_at}))
 const orders=rows(ordersRaw).map(row=>({orderId:row.id,orderNumber:count(row.order_number),plantId:row.plant_id,customer:row.customer,species:row.species,product:row.product,committedKg:count(row.committed_kg),allocatedKg:count(row.allocated_kg),deliveryDate:row.delivery_date,status:row.status}))
 const canonicalSources=rows(canonicalRaw).map(row=>({fileName:row.file_name,kind:row.source_kind,recordCount:count(row.record_count),periodStart:row.period_start,periodEnd:row.period_end,importedAt:row.imported_at}))
 const finance=financial?(rows(financeRaw)[0]??null):null
 const sources:CopilotSource[]=[
  {id:'receptions',label:'Recepciones vivas',path:'/recepciones',rows:receptions.length,freshness:latest(receptions as Record<string,unknown>[],'receivedAt')},
  {id:'production',label:'Producción observada',path:'/lineas',rows:production.length,freshness:latest(production as Record<string,unknown>[],'latestAt')},
  {id:'quality',label:'Calidad y holds',path:'/control-regulatorio',rows:quality.length,freshness:latest(quality as Record<string,unknown>[],'receivedAt')},
  {id:'inventory',label:'Inventario observado',path:'/inventario',rows:inventory.length,freshness:latest(inventory as Record<string,unknown>[],'latestAt')},
 ]
 if(commercial)sources.push({id:'orders',label:'Compromisos comerciales',path:'/ordenes-venta',rows:orders.length,freshness:latest(orders as Record<string,unknown>[],'deliveryDate')})
 if(corporateHistory)sources.push({id:'canonical_sources',label:'Fuentes canónicas',path:'/importaciones',rows:canonicalSources.length,freshness:latest(canonicalSources as Record<string,unknown>[],'importedAt')})
 if(financial)sources.push({id:'finance',label:'Cierre económico conocido',path:'/liquidaciones',rows:finance?1:0,freshness:finance?date(finance.latest_at):null})
 return {generatedAt:new Date().toISOString(),scope:{plantId,plantIds,role:operator.role,financial,corporateHistory},sources,data:{receptions,production,quality,inventory,...(commercial?{orders}:{}),...(corporateHistory?{canonical_sources:canonicalSources}:{}),...(financial?{finance:finance?{pendingSettlements:count(finance.pending_settlements),knownGrossClp:count(finance.known_gross_clp),latestAt:finance.latest_at}:null}:{})}}
}

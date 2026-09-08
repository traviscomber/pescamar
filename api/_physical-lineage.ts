import {getSql} from './_db.js'
import {seafoodEvent,type SeafoodEvent} from './_seafood-event.js'

type Row=Record<string,unknown>
type OrganizationRef={organizationId:string;sourceSystem:string}
const rows=(value:unknown)=>Array.isArray(value)?value as Row[]:[]
const text=(value:unknown)=>value==null?null:String(value)
const numberOrNull=(value:unknown)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:null}

export async function loadPhysicalLineageEvents(receptionId:string,siteId:string|null,organization:OrganizationRef):Promise<SeafoodEvent[]>{
  const sql=getSql()
  const [processRaw,packingRaw,palletRaw,coldRaw]=await Promise.all([
    sql`select u.id,u.status,u.grade,u.finger_class,u.color_code,u.color_status,u.xray_status,u.packing_format,u.output_kg,u.notes,u.created_by,u.created_at,u.updated_at from sea_urchin_process_runs u where u.reception_id=${receptionId}::uuid order by u.created_at`,
    sql`select pu.id,pu.packing_unit_code,pu.sea_urchin_run_id,pu.station_id,pu.packing_spec_id,pu.product,pu.species,pu.grade,pu.format,pu.gross_kg,pu.tare_kg,pu.net_kg,pu.status,pu.packed_by_operator_id,pu.packed_at,pu.created_at from packing_units pu where pu.reception_id=${receptionId}::uuid order by coalesce(pu.packed_at,pu.created_at)`,
    sql`select distinct p.id,p.pallet_code,p.status,p.product,p.species,p.grade,p.destination,p.box_count,p.net_kg,p.created_by_operator_id,p.closed_by_operator_id,p.created_at,p.closed_at,(select count(*) from pallet_packing_units x join packing_units ux on ux.id=x.packing_unit_id where x.pallet_id=p.id and x.removed_at is null and ux.reception_id=${receptionId}::uuid) linked_units from pallets p join pallet_packing_units ppu on ppu.pallet_id=p.id and ppu.removed_at is null join packing_units pu on pu.id=ppu.packing_unit_id where pu.reception_id=${receptionId}::uuid order by coalesce(p.closed_at,p.created_at)`,
    sql`select distinct cr.id,cr.run_code,cr.status,cr.min_allowed_c,cr.max_allowed_c,cr.observed_min_c,cr.observed_max_c,cr.last_observed_c,cr.observation_count,cr.deviation_count,cr.started_by_operator_id,cr.completed_by_operator_id,cr.started_at,cr.completed_at,cr.evidence_url,cr.notes,ca.id asset_id,ca.code asset_code,ca.name asset_name,cl.pallet_id,cl.reception_id load_reception_id,cl.added_at,cl.released_at from cold_run_loads cl join cold_runs cr on cr.id=cl.run_id left join cold_assets ca on ca.id=cr.asset_id where cl.reception_id=${receptionId}::uuid or cl.pallet_id in (select distinct ppu.pallet_id from pallet_packing_units ppu join packing_units pu on pu.id=ppu.packing_unit_id where ppu.removed_at is null and pu.reception_id=${receptionId}::uuid) order by coalesce(cr.completed_at,cr.started_at,cl.added_at)`,
  ])

  const events:SeafoodEvent[]=[]
  for(const row of rows(processRaw)){
    const id=String(row.id)
    events.push(seafoodEvent({id:`production_run:${id}`,siteId,lotId:receptionId,type:'production',occurredAt:text(row.updated_at)??text(row.created_at),title:'Producción · proceso erizo',detail:text(row.notes),actor:text(row.created_by),metrics:{processRunId:id,status:text(row.status),grade:text(row.grade),fingerClass:text(row.finger_class),colorCode:text(row.color_code),colorStatus:text(row.color_status),xrayStatus:text(row.xray_status),packingFormat:text(row.packing_format),outputKg:numberOrNull(row.output_kg),inputKg:null,inputEvidenceMissing:true},source:{entityType:'sea_urchin_process_run',entityId:id}},organization))
  }

  for(const row of rows(packingRaw)){
    const id=String(row.id)
    events.push(seafoodEvent({id:`packing:${id}`,siteId,lotId:receptionId,type:'packing',occurredAt:text(row.packed_at)??text(row.created_at),title:`Packing · ${text(row.packing_unit_code)??id.slice(0,8)}`,detail:text(row.product),actor:text(row.packed_by_operator_id),metrics:{packingUnitId:id,packingUnitCode:text(row.packing_unit_code),processRunId:text(row.sea_urchin_run_id),stationId:text(row.station_id),packingSpecId:text(row.packing_spec_id),product:text(row.product),species:text(row.species),grade:text(row.grade),format:text(row.format),grossKg:numberOrNull(row.gross_kg),tareKg:numberOrNull(row.tare_kg),netKg:numberOrNull(row.net_kg),status:text(row.status)},source:{entityType:'packing_unit',entityId:id}},organization))
  }

  for(const row of rows(palletRaw)){
    const id=String(row.id)
    events.push(seafoodEvent({id:`pallet:${id}`,siteId,lotId:receptionId,type:'pallet',occurredAt:text(row.closed_at)??text(row.created_at),title:`Pallet · ${text(row.pallet_code)??id.slice(0,8)}`,detail:text(row.destination),actor:text(row.closed_by_operator_id)??text(row.created_by_operator_id),metrics:{palletId:id,palletCode:text(row.pallet_code),status:text(row.status),product:text(row.product),species:text(row.species),grade:text(row.grade),destination:text(row.destination),boxCount:numberOrNull(row.box_count),netKg:numberOrNull(row.net_kg),linkedPackingUnits:numberOrNull(row.linked_units)},source:{entityType:'pallet',entityId:id}},organization))
  }

  for(const row of rows(coldRaw)){
    const id=String(row.id)
    events.push(seafoodEvent({id:`cold:${id}`,siteId,lotId:receptionId,type:'cold',occurredAt:text(row.completed_at)??text(row.started_at)??text(row.added_at),title:`Frío · ${text(row.run_code)??id.slice(0,8)}`,detail:text(row.asset_name)??text(row.notes),actor:text(row.completed_by_operator_id)??text(row.started_by_operator_id),metrics:{coldRunId:id,runCode:text(row.run_code),status:text(row.status),assetId:text(row.asset_id),assetCode:text(row.asset_code),assetName:text(row.asset_name),palletId:text(row.pallet_id),loadReceptionId:text(row.load_reception_id),minAllowedC:numberOrNull(row.min_allowed_c),maxAllowedC:numberOrNull(row.max_allowed_c),observedMinC:numberOrNull(row.observed_min_c),observedMaxC:numberOrNull(row.observed_max_c),lastObservedC:numberOrNull(row.last_observed_c),observationCount:numberOrNull(row.observation_count),deviationCount:numberOrNull(row.deviation_count),evidenceUrl:text(row.evidence_url),releasedAt:text(row.released_at)},source:{entityType:'cold_run',entityId:id}},organization))
  }

  return events
}

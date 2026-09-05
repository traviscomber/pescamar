import type {SessionOperator} from './_auth.js'
import {getSql} from './_db.js'
import {getJapanReleaseState} from './_japan-release.js'
import type {CopilotSource} from './_copilot-context.js'

type Row=Record<string,unknown>
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const rows=(value:unknown)=>Array.isArray(value)?value as Row[]:[]
const text=(value:unknown)=>value==null?null:String(value)
const num=(value:unknown)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:null}

export type SeaUrchinCopilotEvidence={source:CopilotSource;data:Record<string,unknown>}

export async function buildSeaUrchinCopilotEvidence(operator:SessionOperator,receptionId:unknown):Promise<SeaUrchinCopilotEvidence|null>{
 const id=typeof receptionId==='string'?receptionId.trim():''
 if(!uuid.test(id))return null
 const sql=getSql(),admin=operator.role==='admin'
 const receptionRaw=await sql`select r.id,r.reception_number,r.plant_id,r.species,r.extraction_zone,r.accepted_kg,r.received_at,p.legal_name supplier from receptions r join parties p on p.id=r.supplier_id where r.id=${id}::uuid and (${admin} or r.plant_id=any(${operator.plantIds}::text[])) limit 1`
 const reception=rows(receptionRaw)[0]
 if(!reception||!String(reception.species??'').toLowerCase().includes('eriz'))return null
 const [runRaw,checksRaw,visionRaw,packingRaw,palletRaw,coldRaw,holdsRaw]=await Promise.all([
  sql`select id,status,grade,finger_class,color_code,color_status,xray_status,packing_format,output_kg,created_at,updated_at from sea_urchin_process_runs where reception_id=${id}::uuid order by updated_at desc limit 1`,
  sql`select c.stage,c.sequence_no,c.target_temperature_c,c.actual_temperature_c,c.target_duration_seconds,c.actual_duration_seconds,c.status,c.note,c.checked_at from sea_urchin_stage_checks c join sea_urchin_process_runs u on u.id=c.run_id where u.reception_id=${id}::uuid order by c.sequence_no`,
  sql`select c.suggested_grade,c.operator_grade,c.decision,c.delta_e,c.l_mean,c.a_mean,c.b_mean,c.l_std,c.a_std,c.b_std,c.created_at,c.confirmed_at from sea_urchin_color_captures c join sea_urchin_process_runs u on u.id=c.run_id where u.reception_id=${id}::uuid order by c.created_at`,
  sql`select packing_unit_code,status,grade,format,net_kg,packed_at from packing_units where reception_id=${id}::uuid order by packed_at`,
  sql`select distinct p.pallet_code,p.status,p.grade,p.destination,p.box_count,p.net_kg,p.created_at,p.closed_at from pallets p join pallet_packing_units i on i.pallet_id=p.id join packing_units u on u.id=i.packing_unit_id where u.reception_id=${id}::uuid order by p.created_at`,
  sql`select distinct r.run_code,r.status,r.min_allowed_c,r.max_allowed_c,r.observed_min_c,r.observed_max_c,r.last_observed_c,r.observation_count,r.deviation_count,r.started_at,r.completed_at,a.name asset_name,a.asset_type from cold_runs r join cold_assets a on a.id=r.asset_id join cold_run_loads l on l.run_id=r.id left join pallet_packing_units pi on pi.pallet_id=l.pallet_id and pi.removed_at is null left join packing_units pu on pu.id=pi.packing_unit_id where l.reception_id=${id}::uuid or pu.reception_id=${id}::uuid order by r.started_at`,
  sql`select authority,status,reason,opened_at,resolved_at from regulatory_holds h where h.reception_id=${id}::uuid or exists(select 1 from packing_units u where u.id=h.packing_unit_id and u.reception_id=${id}::uuid) or exists(select 1 from pallet_packing_units i join packing_units u on u.id=i.packing_unit_id where i.pallet_id=h.pallet_id and u.reception_id=${id}::uuid) order by opened_at`,
 ])
 let japan:Awaited<ReturnType<typeof getJapanReleaseState>>|null=null
 try{japan=await getJapanReleaseState(id)}catch{japan=null}
 const run=rows(runRaw)[0]??null,checks=rows(checksRaw),captures=rows(visionRaw),packing=rows(packingRaw),pallets=rows(palletRaw),cold=rows(coldRaw),holds=rows(holdsRaw)
 const latestCapture=captures[captures.length-1]??null
 const blockingHolds=holds.filter(row=>['open','rejected'].includes(String(row.status??'')))
 const deviations=checks.filter(row=>['deviation','hold'].includes(String(row.status??'')))
 const packedKg=packing.reduce((sum,row)=>sum+(num(row.net_kg)??0),0)
 const data={
  reception:{id,receptionNumber:reception.reception_number,plantId:reception.plant_id,supplier:reception.supplier,species:reception.species,extractionZone:reception.extraction_zone,acceptedKg:num(reception.accepted_kg),receivedAt:reception.received_at},
  process:run?{status:run.status,grade:run.grade,fingerClass:run.finger_class,colorCode:run.color_code,colorStatus:run.color_status,xrayStatus:run.xray_status,packingFormat:run.packing_format,outputKg:num(run.output_kg),updatedAt:run.updated_at}:null,
  stages:checks.map(row=>({stage:row.stage,sequenceNo:num(row.sequence_no),status:row.status,targetTemperatureC:num(row.target_temperature_c),actualTemperatureC:num(row.actual_temperature_c),targetDurationSeconds:num(row.target_duration_seconds),actualDurationSeconds:num(row.actual_duration_seconds),note:text(row.note),checkedAt:row.checked_at})),
  vision:{captures:captures.length,latest:latestCapture?{suggestedGrade:latestCapture.suggested_grade,operatorGrade:latestCapture.operator_grade,decision:latestCapture.decision,deltaE:num(latestCapture.delta_e),lab:{l:num(latestCapture.l_mean),a:num(latestCapture.a_mean),b:num(latestCapture.b_mean)},dispersion:{l:num(latestCapture.l_std),a:num(latestCapture.a_std),b:num(latestCapture.b_std)},confirmedAt:latestCapture.confirmed_at,createdAt:latestCapture.created_at}:null},
  packing:{boxes:packing.length,netKg:Number(packedKg.toFixed(3)),held:packing.filter(row=>row.status==='held').length,voided:packing.filter(row=>row.status==='voided').length},
  pallets:pallets.map(row=>({code:row.pallet_code,status:row.status,grade:row.grade,destination:row.destination,boxCount:num(row.box_count),netKg:num(row.net_kg)})),
  cold:cold.map(row=>({runCode:row.run_code,status:row.status,asset:row.asset_name,assetType:row.asset_type,lastObservedC:num(row.last_observed_c),observedMinC:num(row.observed_min_c),observedMaxC:num(row.observed_max_c),deviationCount:num(row.deviation_count)})),
  regulatory:{blocking: blockingHolds.length,holds:holds.map(row=>({authority:row.authority,status:row.status,reason:row.reason,openedAt:row.opened_at,resolvedAt:row.resolved_at}))},
  japan:japan?{releasable:japan.releasable,failed:japan.failed,missing:japan.missing,gates:japan.gates.map(gate=>({code:gate.code,label:gate.label,status:gate.status,source:gate.source}))}:null,
  summary:{deviations:deviations.length,blockingHolds:blockingHolds.length,japanReleasable:japan?.releasable??null}
 }
 return {source:{id:'urchin_graph',label:`Digital Twin erizo · REC-${String(reception.reception_number??'')}`,path:`/proceso-erizo/grafo?receptionId=${encodeURIComponent(id)}`,rows:1,freshness:text(run?.updated_at)??text(reception.received_at)},data}
}

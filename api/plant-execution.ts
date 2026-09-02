import {requireOperator,type SessionOperator} from './_auth.js'
import {hasPlantAccess} from './_plants.js'
import {getSql} from './_db.js'

type Request={method?:string;body?:unknown;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type Input={action?:unknown;stationId?:unknown;receptionId?:unknown;packingSpecId?:unknown;seaUrchinRunId?:unknown;packingUnitCode?:unknown;idempotencyKey?:unknown;netKg?:unknown;grossKg?:unknown;tareKg?:unknown;product?:unknown;grade?:unknown;format?:unknown;occurredAt?:unknown}
type ScopeRow={station_id:string;plant_id:string;reception_id:string;species:string}
type EventRow={id:string;station_id:string;reception_id:string|null;event_type:string;raw_value:string|null;net_kg:string|number|null}
type PackingRow={id:string;packing_unit_code:string;source_device_event_id:string|null;net_kg:string|number;status:string;packed_at:string}

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const text=(value:unknown,max=240)=>String(value??'').trim().slice(0,max)
const numberOrNull=(value:unknown)=>{if(value==null||value==='')return null;const n=Number(value);return Number.isFinite(n)?n:null}
const writesEnabled=()=>process.env.PLANT_EXECUTION_WRITES_ENABLED==='true'
const canWrite=(operator:SessionOperator)=>['admin','operations','quality'].includes(operator.role)
const first=<T,>(rows:unknown)=>Array.isArray(rows)?rows[0] as T|undefined:undefined

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 if(req.method==='GET')return res.status(200).json({ok:true,writesEnabled:writesEnabled(),mode:writesEnabled()?'write-enabled':'safe-read-only'})
 if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).json({ok:false,error:'Método no permitido'})}
 if(!writesEnabled())return res.status(503).json({ok:false,code:'PLANT_EXECUTION_WRITES_DISABLED',error:'Escrituras Plant Execution deshabilitadas hasta verificar aislamiento Neon del entorno'})
 try{
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  if(!canWrite(operator))return res.status(403).json({ok:false,error:'Acción no autorizada'})
  return mutate(req,res,operator)
 }catch(error){
  const message=error instanceof Error?error.message:''
  const schemaMissing=['plant_stations','plant_devices','device_events','packing_specs','packing_units'].some(name=>message.includes(name))
  return res.status(schemaMissing?503:500).json({ok:false,error:schemaMissing?'Falta aplicar la migración Plant Execution 033':'No fue posible registrar operación de planta'})
 }
}

async function mutate(req:Request,res:Response,operator:SessionOperator){
 const input=(req.body??{}) as Input
 const action=text(input.action,40)
 if(action!=='createPackingUnit')return res.status(400).json({ok:false,error:'Acción inválida'})
 const stationId=text(input.stationId,40),receptionId=text(input.receptionId,40),packingSpecId=text(input.packingSpecId,40),seaUrchinRunId=text(input.seaUrchinRunId,40)
 const packingUnitCode=text(input.packingUnitCode,120),idempotencyKey=text(input.idempotencyKey,160),product=text(input.product,160)||null,grade=text(input.grade,8)||null,format=text(input.format,100)||null
 const netKg=numberOrNull(input.netKg),grossKg=numberOrNull(input.grossKg),tareKg=numberOrNull(input.tareKg)
 const occurredRaw=text(input.occurredAt,60),occurredAt=occurredRaw?new Date(occurredRaw):new Date()
 if(!uuid.test(stationId)||!uuid.test(receptionId)||packingSpecId&&!uuid.test(packingSpecId)||seaUrchinRunId&&!uuid.test(seaUrchinRunId))return res.status(400).json({ok:false,error:'Identidad de estación, lote o especificación inválida'})
 if(!packingUnitCode||packingUnitCode.length<3||!idempotencyKey||idempotencyKey.length<8)return res.status(400).json({ok:false,error:'Código de packing e idempotency key son obligatorios'})
 if(netKg==null||netKg<=0||grossKg!=null&&grossKg<=0||tareKg!=null&&tareKg<0)return res.status(400).json({ok:false,error:'Peso inválido'})
 if(grossKg!=null&&tareKg!=null&&(grossKg<tareKg||Math.abs((grossKg-tareKg)-netKg)>0.01))return res.status(400).json({ok:false,error:'Peso neto no concilia con bruto y tara'})
 if(grade&&!['A','B','C','D','E'].includes(grade))return res.status(400).json({ok:false,error:'Grade inválido'})
 if(Number.isNaN(occurredAt.getTime()))return res.status(400).json({ok:false,error:'Fecha de evento inválida'})

 const sql=getSql()
 const scope=first<ScopeRow>(await sql`select s.id station_id,s.plant_id,r.id reception_id,r.species from plant_stations s join receptions r on r.id=${receptionId}::uuid and r.plant_id=s.plant_id where s.id=${stationId}::uuid and s.active=true limit 1`)
 if(!scope||!hasPlantAccess(operator,scope.plant_id))return res.status(404).json({ok:false,error:'Estación o recepción fuera de alcance'})

 if(seaUrchinRunId){
  const run=first<{id:string}>(await sql`select id from sea_urchin_process_runs where id=${seaUrchinRunId}::uuid and reception_id=${receptionId}::uuid limit 1`)
  if(!run)return res.status(409).json({ok:false,error:'Proceso de erizo no corresponde al lote seleccionado'})
 }

 if(packingSpecId){
  const spec=first<{id:string;plant_id:string|null;species:string|null;grade:string|null;min_net_kg:string|number|null;max_net_kg:string|number|null}>(await sql`select id,plant_id,species,grade,min_net_kg,max_net_kg from packing_specs where id=${packingSpecId}::uuid and active=true limit 1`)
  if(!spec||spec.plant_id&&spec.plant_id!==scope.plant_id)return res.status(409).json({ok:false,error:'Especificación de packing no disponible para esta planta'})
  if(spec.species&&spec.species.toLowerCase()!==scope.species.toLowerCase())return res.status(409).json({ok:false,error:'Especificación no corresponde a la especie del lote'})
  if(spec.grade&&grade&&spec.grade!==grade)return res.status(409).json({ok:false,error:'Grade no cumple la especificación de packing'})
  const min=numberOrNull(spec.min_net_kg),max=numberOrNull(spec.max_net_kg)
  if(min!=null&&netKg<min||max!=null&&netKg>max)return res.status(409).json({ok:false,error:'Peso fuera del rango de la especificación de packing'})
 }

 const rawValue=String(netKg)
 let event=first<EventRow>(await sql`select id,station_id,reception_id,event_type,raw_value,normalized_value->>'netKg' net_kg from device_events where plant_id=${scope.plant_id} and idempotency_key=${idempotencyKey} limit 1`)
 if(event){
  const same=event.station_id===stationId&&event.reception_id===receptionId&&event.event_type==='manual_weight'&&Math.abs(Number(event.net_kg)-netKg)<=0.001
  if(!same)return res.status(409).json({ok:false,error:'Idempotency key ya fue utilizada para otro evento'})
 }else{
  event=first<EventRow>(await sql`insert into device_events(station_id,plant_id,operator_id,reception_id,event_type,raw_value,normalized_value,idempotency_key,occurred_at) values(${stationId}::uuid,${scope.plant_id},${operator.id}::uuid,${receptionId}::uuid,'manual_weight',${rawValue},jsonb_build_object('netKg',${netKg}::numeric,'grossKg',${grossKg}::numeric,'tareKg',${tareKg}::numeric),${idempotencyKey},${occurredAt.toISOString()}::timestamptz) on conflict(plant_id,idempotency_key) do nothing returning id,station_id,reception_id,event_type,raw_value,normalized_value->>'netKg' net_kg`)
  if(!event)event=first<EventRow>(await sql`select id,station_id,reception_id,event_type,raw_value,normalized_value->>'netKg' net_kg from device_events where plant_id=${scope.plant_id} and idempotency_key=${idempotencyKey} limit 1`)
  if(!event)return res.status(500).json({ok:false,error:'No fue posible registrar evento idempotente'})
 }

 let packing=first<PackingRow>(await sql`select id,packing_unit_code,source_device_event_id,net_kg,status,packed_at from packing_units where source_device_event_id=${event.id}::uuid limit 1`)
 if(packing)return res.status(200).json({ok:true,idempotent:true,eventId:event.id,packingUnit:packing})
 const codeOwner=first<{id:string;source_device_event_id:string|null}>(await sql`select id,source_device_event_id from packing_units where packing_unit_code=${packingUnitCode} limit 1`)
 if(codeOwner&&codeOwner.source_device_event_id!==event.id)return res.status(409).json({ok:false,error:'Código de packing ya pertenece a otra unidad'})

 packing=first<PackingRow>(await sql`insert into packing_units(packing_unit_code,plant_id,reception_id,sea_urchin_run_id,station_id,source_device_event_id,packing_spec_id,product,species,grade,format,gross_kg,tare_kg,net_kg,packed_by_operator_id,packed_at) values(${packingUnitCode},${scope.plant_id},${receptionId}::uuid,${seaUrchinRunId||null}::uuid,${stationId}::uuid,${event.id}::uuid,${packingSpecId||null}::uuid,${product},${scope.species},${grade},${format},${grossKg},${tareKg},${netKg},${operator.id}::uuid,${occurredAt.toISOString()}::timestamptz) on conflict do nothing returning id,packing_unit_code,source_device_event_id,net_kg,status,packed_at`)
 if(!packing)packing=first<PackingRow>(await sql`select id,packing_unit_code,source_device_event_id,net_kg,status,packed_at from packing_units where source_device_event_id=${event.id}::uuid limit 1`)
 if(!packing)return res.status(409).json({ok:false,error:'No fue posible materializar packing unit sin duplicar datos'})
 await sql`update device_events set processing_status='applied' where id=${event.id}::uuid and processing_status='received'`
 return res.status(201).json({ok:true,idempotent:false,eventId:event.id,packingUnit:packing})
}

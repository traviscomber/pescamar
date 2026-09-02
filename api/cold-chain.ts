import {requireOperator,type SessionOperator} from './_auth.js'
import {PLANT_IDS,hasPlantAccess} from './_plants.js'
import {getSql} from './_db.js'

declare const process:{env:Record<string,string|undefined>}

type Request={method?:string;body?:unknown;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type Input={action?:unknown;plantId?:unknown;stationId?:unknown;assetId?:unknown;code?:unknown;name?:unknown;assetType?:unknown;runId?:unknown;runCode?:unknown;minAllowedC?:unknown;maxAllowedC?:unknown;startedAt?:unknown;completedAt?:unknown;palletId?:unknown;receptionId?:unknown;loadId?:unknown;reason?:unknown;temperatureC?:unknown;source?:unknown;deviceId?:unknown;observedAt?:unknown;evidenceUrl?:unknown;note?:unknown;notes?:unknown;idempotencyKey?:unknown}
type AssetRow={id:string;plant_id:string;station_id:string|null;code:string;name:string;asset_type:string;active:boolean}
type RunRow={id:string;plant_id:string;asset_id:string;run_code:string;status:string;min_allowed_c:string|number|null;max_allowed_c:string|number|null}

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const codePattern=/^[A-Z0-9][A-Z0-9._/-]{1,79}$/
const text=(value:unknown,max=500)=>String(value??'').trim().slice(0,max)
const finiteOrNull=(value:unknown)=>{if(value==null||value==='')return null;const n=Number(value);return Number.isFinite(n)?n:null}
const iso=(value:unknown)=>{const raw=text(value,64);const d=raw?new Date(raw):new Date();return Number.isNaN(d.getTime())?null:d.toISOString()}
const writesEnabled=()=>process.env.PLANT_EXECUTION_WRITES_ENABLED==='true'
const allowedPlants=new Set<string>(PLANT_IDS)
const assetTypes=new Set(['tunnel','chamber','freezer','cold_room'])
const canOperate=(o:SessionOperator)=>['admin','operations','quality'].includes(o.role)
const canConfigure=(o:SessionOperator)=>o.role==='admin'
const first=<T,>(rows:unknown)=>Array.isArray(rows)?rows[0] as T|undefined:undefined

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 try{
  if(req.method==='POST'&&!writesEnabled())return res.status(503).json({ok:false,code:'PLANT_EXECUTION_WRITES_DISABLED',error:'Cadena de frío deshabilitada hasta verificar aislamiento Neon del entorno'})
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  if(req.method==='GET')return list(res,operator)
  if(req.method==='POST')return mutate(req,res,operator)
  res.setHeader('Allow','GET, POST')
  return res.status(405).json({ok:false,error:'Método no permitido'})
 }catch(error){
  const message=error instanceof Error?error.message:''
  const missing=['cold_assets','cold_runs','cold_run_loads','cold_observations','pallets'].some(name=>message.includes(name))
  return res.status(missing?503:500).json({ok:false,error:missing?'Falta aplicar las migraciones Plant Execution 033–036':'No fue posible operar cadena de frío'})
 }
}

async function list(res:Response,operator:SessionOperator){
 const sql=getSql(),admin=operator.role==='admin',plantIds=operator.plantIds
 const [assets,runs]=await Promise.all([
  sql`select id,plant_id,station_id,code,name,asset_type,active,config,created_at,updated_at from cold_assets where ${admin} or plant_id=any(${plantIds}::text[]) order by plant_id,code`,
  sql`select r.id,r.plant_id,r.asset_id,r.run_code,r.status,r.min_allowed_c,r.max_allowed_c,r.observed_min_c,r.observed_max_c,r.last_observed_c,r.observation_count,r.deviation_count,r.started_at,r.completed_at,r.evidence_url,r.notes,a.code asset_code,a.name asset_name,a.asset_type,coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'palletId',l.pallet_id,'receptionId',l.reception_id,'addedAt',l.added_at,'releasedAt',l.released_at) order by l.added_at) from cold_run_loads l where l.run_id=r.id and l.removed_at is null),'[]'::jsonb) loads from cold_runs r join cold_assets a on a.id=r.asset_id where ${admin} or r.plant_id=any(${plantIds}::text[]) order by r.started_at desc limit 500`
 ])
 return res.status(200).json({ok:true,writesEnabled:writesEnabled(),assets:Array.isArray(assets)?assets:[],runs:Array.isArray(runs)?runs:[]})
}

async function mutate(req:Request,res:Response,operator:SessionOperator){
 const input=(req.body??{}) as Input,action=text(input.action,40)
 if(action==='upsertAsset')return upsertAsset(input,res,operator)
 if(!canOperate(operator))return res.status(403).json({ok:false,error:'Acción no autorizada'})
 if(action==='startRun')return startRun(input,res,operator)
 if(action==='addLoad')return addLoad(input,res,operator)
 if(action==='removeLoad')return removeLoad(input,res,operator)
 if(action==='recordObservation')return recordObservation(input,res,operator)
 if(action==='completeRun')return completeRun(input,res,operator)
 if(action==='cancelRun')return cancelRun(input,res,operator)
 return res.status(400).json({ok:false,error:'Acción inválida'})
}

async function upsertAsset(input:Input,res:Response,operator:SessionOperator){
 if(!canConfigure(operator))return res.status(403).json({ok:false,error:'Sólo Administración puede configurar activos de frío'})
 const plantId=text(input.plantId,50).toLowerCase(),stationId=text(input.stationId,40),code=text(input.code,80).toUpperCase(),name=text(input.name,120),assetType=text(input.assetType,30).toLowerCase()
 if(!allowedPlants.has(plantId)||!hasPlantAccess(operator,plantId)||!codePattern.test(code)||name.length<2||!assetTypes.has(assetType)||stationId&&!uuid.test(stationId))return res.status(400).json({ok:false,error:'Activo de frío inválido'})
 const sql=getSql()
 if(stationId){const station=first<{plant_id:string;station_type:string}>(await sql`select plant_id,station_type from plant_stations where id=${stationId}::uuid and active=true limit 1`);if(!station||station.plant_id!==plantId||station.station_type!=='cold')return res.status(409).json({ok:false,error:'La estación no corresponde a un punto de frío activo de esta planta'})}
 const saved=first(await sql`insert into cold_assets(plant_id,station_id,code,name,asset_type,created_by_operator_id) values(${plantId},${stationId||null}::uuid,${code},${name},${assetType},${operator.id}::uuid) on conflict(plant_id,code) do update set station_id=excluded.station_id,name=excluded.name,asset_type=excluded.asset_type,active=true,updated_at=now() returning id,plant_id,station_id,code,name,asset_type,active,updated_at`)
 return res.status(200).json({ok:true,asset:saved})
}

async function startRun(input:Input,res:Response,operator:SessionOperator){
 const assetId=text(input.assetId,40),runCode=text(input.runCode,80).toUpperCase(),min=finiteOrNull(input.minAllowedC),max=finiteOrNull(input.maxAllowedC),startedAt=iso(input.startedAt),evidence=text(input.evidenceUrl,1000)||null,notes=text(input.notes,1000)||null
 if(!uuid.test(assetId)||!codePattern.test(runCode)||!startedAt||min==null&&max==null||min!=null&&max!=null&&min>max)return res.status(400).json({ok:false,error:'Ciclo de frío inválido'})
 const sql=getSql(),asset=first<AssetRow>(await sql`select id,plant_id,station_id,code,name,asset_type,active from cold_assets where id=${assetId}::uuid and active=true limit 1`)
 if(!asset||!hasPlantAccess(operator,asset.plant_id))return res.status(404).json({ok:false,error:'Activo de frío fuera de alcance'})
 const existing=first<RunRow>(await sql`select id,plant_id,asset_id,run_code,status,min_allowed_c,max_allowed_c from cold_runs where plant_id=${asset.plant_id} and run_code=${runCode} limit 1`)
 if(existing){if(existing.asset_id!==assetId)return res.status(409).json({ok:false,error:'Código de ciclo ya utilizado en otro activo'});return res.status(200).json({ok:true,idempotent:true,run:existing})}
 const created=first(await sql`insert into cold_runs(plant_id,asset_id,run_code,min_allowed_c,max_allowed_c,started_by_operator_id,started_at,evidence_url,notes) values(${asset.plant_id},${assetId}::uuid,${runCode},${min},${max},${operator.id}::uuid,${startedAt}::timestamptz,${evidence},${notes}) returning id,plant_id,asset_id,run_code,status,min_allowed_c,max_allowed_c,started_at`)
 return res.status(201).json({ok:true,idempotent:false,run:created})
}

async function addLoad(input:Input,res:Response,operator:SessionOperator){
 const runId=text(input.runId,40),palletId=text(input.palletId,40),receptionId=text(input.receptionId,40)
 if(!uuid.test(runId)||Boolean(palletId)===Boolean(receptionId)||palletId&&!uuid.test(palletId)||receptionId&&!uuid.test(receptionId))return res.status(400).json({ok:false,error:'Carga de frío inválida'})
 const sql=getSql(),run=first<RunRow>(await sql`select id,plant_id,asset_id,run_code,status,min_allowed_c,max_allowed_c from cold_runs where id=${runId}::uuid limit 1`)
 if(!run||!hasPlantAccess(operator,run.plant_id))return res.status(404).json({ok:false,error:'Ciclo fuera de alcance'})
 if(run.status!=='open')return res.status(409).json({ok:false,error:'Sólo un ciclo abierto puede recibir carga'})
 if(palletId){const pallet=first<{plant_id:string;status:string}>(await sql`select plant_id,status from pallets where id=${palletId}::uuid limit 1`);if(!pallet||pallet.plant_id!==run.plant_id||!['closed','released','held'].includes(pallet.status))return res.status(409).json({ok:false,error:'Pallet no disponible para este ciclo de frío'})}
 if(receptionId){const reception=first<{plant_id:string}>(await sql`select plant_id from receptions where id=${receptionId}::uuid limit 1`);if(!reception||reception.plant_id!==run.plant_id)return res.status(409).json({ok:false,error:'Lote no disponible para este ciclo de frío'})}
 const inserted=first<{id:string}>(await sql`with eligible_run as (select id from cold_runs where id=${runId}::uuid and status='open' for update) insert into cold_run_loads(run_id,pallet_id,reception_id,added_by_operator_id) select e.id,${palletId||null}::uuid,${receptionId||null}::uuid,${operator.id}::uuid from eligible_run e on conflict do nothing returning id`)
 if(inserted)return res.status(201).json({ok:true,idempotent:false,loadId:inserted.id})
 const owner=palletId?first<{run_id:string}>(await sql`select run_id from cold_run_loads where pallet_id=${palletId}::uuid and released_at is null and removed_at is null limit 1`):first<{run_id:string}>(await sql`select run_id from cold_run_loads where reception_id=${receptionId}::uuid and released_at is null and removed_at is null limit 1`)
 if(owner?.run_id===runId)return res.status(200).json({ok:true,idempotent:true,runId})
 if(owner)return res.status(409).json({ok:false,error:'La carga ya pertenece a otro ciclo de frío activo'})
 return res.status(409).json({ok:false,error:'El ciclo cambió de estado durante la carga'})
}

async function removeLoad(input:Input,res:Response,operator:SessionOperator){
 const runId=text(input.runId,40),loadId=text(input.loadId,40),reason=text(input.reason,500)
 if(!uuid.test(runId)||!uuid.test(loadId)||reason.length<4)return res.status(400).json({ok:false,error:'Ciclo, carga y motivo son obligatorios'})
 const sql=getSql(),run=first<RunRow>(await sql`select id,plant_id,asset_id,run_code,status,min_allowed_c,max_allowed_c from cold_runs where id=${runId}::uuid limit 1`)
 if(!run||!hasPlantAccess(operator,run.plant_id))return res.status(404).json({ok:false,error:'Ciclo fuera de alcance'})
 const removed=first(await sql`with eligible_run as (select id from cold_runs where id=${runId}::uuid and status='open' for update) update cold_run_loads l set removed_by_operator_id=${operator.id}::uuid,removed_at=now(),removal_reason=${reason} from eligible_run e where l.id=${loadId}::uuid and l.run_id=e.id and l.removed_at is null and l.released_at is null returning l.id,l.pallet_id,l.reception_id,l.removed_at`)
 if(!removed)return res.status(409).json({ok:false,error:'Carga no activa o ciclo ya cerrado'})
 return res.status(200).json({ok:true,load:removed})
}

async function recordObservation(input:Input,res:Response,operator:SessionOperator){
 const runId=text(input.runId,40),temperature=finiteOrNull(input.temperatureC),source=text(input.source,20).toLowerCase()||'manual',deviceId=text(input.deviceId,40),observedAt=iso(input.observedAt),evidence=text(input.evidenceUrl,1000)||null,note=text(input.note,1000)||null,key=text(input.idempotencyKey,160)
 if(!uuid.test(runId)||temperature==null||temperature<-100||temperature>100||!['manual','sensor'].includes(source)||source==='sensor'&&!uuid.test(deviceId)||!observedAt||key.length<8)return res.status(400).json({ok:false,error:'Observación de temperatura inválida'})
 const sql=getSql(),run=first<RunRow>(await sql`select id,plant_id,asset_id,run_code,status,min_allowed_c,max_allowed_c from cold_runs where id=${runId}::uuid limit 1`)
 if(!run||!hasPlantAccess(operator,run.plant_id))return res.status(404).json({ok:false,error:'Ciclo fuera de alcance'})
 if(source==='sensor'){const device=first<{plant_id:string;device_type:string}>(await sql`select s.plant_id,d.device_type from plant_devices d join plant_stations s on s.id=d.station_id where d.id=${deviceId}::uuid and d.active=true and s.active=true limit 1`);if(!device||device.plant_id!==run.plant_id||device.device_type!=='sensor')return res.status(409).json({ok:false,error:'Sensor no disponible para esta planta'})}
 const existing=first<{id:string;run_id:string;temperature_c:string|number;source:string}>(await sql`select id,run_id,temperature_c,source from cold_observations where plant_id=${run.plant_id} and idempotency_key=${key} limit 1`)
 if(existing){const same=existing.run_id===runId&&Math.abs(Number(existing.temperature_c)-temperature)<=0.001&&existing.source===source;if(!same)return res.status(409).json({ok:false,error:'Idempotency key ya utilizada para otra observación'});return res.status(200).json({ok:true,idempotent:true,observation:existing})}
 const saved=first(await sql`with eligible_run as (select id,plant_id from cold_runs where id=${runId}::uuid and status='open' for update) insert into cold_observations(run_id,plant_id,temperature_c,source,device_id,observed_by_operator_id,observed_at,evidence_url,note,idempotency_key) select e.id,e.plant_id,${temperature},${source},${source==='sensor'?deviceId:null}::uuid,${operator.id}::uuid,${observedAt}::timestamptz,${evidence},${note},${key} from eligible_run e returning id,run_id,temperature_c,source,device_id,observed_at`)
 if(!saved)return res.status(409).json({ok:false,error:'El ciclo ya no está abierto'})
 return res.status(201).json({ok:true,idempotent:false,observation:saved})
}

async function completeRun(input:Input,res:Response,operator:SessionOperator){
 const runId=text(input.runId,40),completedAt=iso(input.completedAt),notes=text(input.notes,1000)||null,evidence=text(input.evidenceUrl,1000)||null
 if(!uuid.test(runId)||!completedAt)return res.status(400).json({ok:false,error:'Cierre de ciclo inválido'})
 const sql=getSql(),run=first<RunRow>(await sql`select id,plant_id,asset_id,run_code,status,min_allowed_c,max_allowed_c from cold_runs where id=${runId}::uuid limit 1`)
 if(!run||!hasPlantAccess(operator,run.plant_id))return res.status(404).json({ok:false,error:'Ciclo fuera de alcance'})
 if(['completed','deviation'].includes(run.status))return res.status(200).json({ok:true,idempotent:true,run})
 if(run.status!=='open')return res.status(409).json({ok:false,error:'Estado de ciclo no permite cierre'})
 const result=first<Record<string,unknown>&{load_count?:number;observation_count?:number;finished_id?:string}>(await sql`with eligible_run as (select id,min_allowed_c,max_allowed_c from cold_runs where id=${runId}::uuid and status='open' for update), load_metrics as (select count(*)::int load_count from cold_run_loads l,eligible_run e where l.run_id=e.id and l.removed_at is null and l.released_at is null), observation_metrics as (select count(*)::int observation_count,min(o.temperature_c) observed_min_c,max(o.temperature_c) observed_max_c,(array_agg(o.temperature_c order by o.observed_at desc))[1] last_observed_c,count(*) filter(where (e.min_allowed_c is not null and o.temperature_c<e.min_allowed_c) or (e.max_allowed_c is not null and o.temperature_c>e.max_allowed_c))::int deviation_count from cold_observations o,eligible_run e where o.run_id=e.id), finished as (update cold_runs r set status=case when m.deviation_count>0 then 'deviation' else 'completed' end,observed_min_c=m.observed_min_c,observed_max_c=m.observed_max_c,last_observed_c=m.last_observed_c,observation_count=m.observation_count,deviation_count=m.deviation_count,completed_by_operator_id=${operator.id}::uuid,completed_at=${completedAt}::timestamptz,evidence_url=coalesce(${evidence},r.evidence_url),notes=coalesce(${notes},r.notes),updated_at=now() from eligible_run e,load_metrics l,observation_metrics m where r.id=e.id and l.load_count>0 and m.observation_count>0 returning r.id finished_id,r.run_code,r.status,r.observed_min_c,r.observed_max_c,r.last_observed_c,r.observation_count,r.deviation_count,r.completed_at), released as (update cold_run_loads l set released_at=${completedAt}::timestamptz from finished f where l.run_id=f.finished_id and l.removed_at is null and l.released_at is null returning l.id) select l.load_count,m.observation_count,m.observed_min_c,m.observed_max_c,m.last_observed_c,m.deviation_count,f.*,coalesce((select count(*) from released),0)::int released_loads from load_metrics l cross join observation_metrics m left join finished f on true`)
 if(!result)return res.status(409).json({ok:false,error:'Ciclo cambió de estado durante el cierre'})
 if(!Number(result.load_count??0))return res.status(409).json({ok:false,error:'No se puede cerrar un ciclo sin carga activa'})
 if(!Number(result.observation_count??0))return res.status(409).json({ok:false,error:'No se puede cerrar un ciclo sin observaciones de temperatura'})
 if(!result.finished_id)return res.status(409).json({ok:false,error:'Ciclo cambió de estado durante el cierre'})
 return res.status(200).json({ok:true,idempotent:false,run:result})
}

async function cancelRun(input:Input,res:Response,operator:SessionOperator){
 const runId=text(input.runId,40),reason=text(input.reason,1000),completedAt=iso(input.completedAt)
 if(!uuid.test(runId)||reason.length<4||!completedAt)return res.status(400).json({ok:false,error:'Ciclo y motivo de cancelación son obligatorios'})
 const sql=getSql(),run=first<RunRow>(await sql`select id,plant_id,asset_id,run_code,status,min_allowed_c,max_allowed_c from cold_runs where id=${runId}::uuid limit 1`)
 if(!run||!hasPlantAccess(operator,run.plant_id))return res.status(404).json({ok:false,error:'Ciclo fuera de alcance'})
 const cancelled=first(await sql`with eligible_run as (select id from cold_runs where id=${runId}::uuid and status='open' for update), cancelled as (update cold_runs r set status='cancelled',completed_by_operator_id=${operator.id}::uuid,completed_at=${completedAt}::timestamptz,notes=case when nullif(trim(coalesce(r.notes,'')),'') is null then ${reason} else r.notes||E'\nCANCELADO: '||${reason} end,updated_at=now() from eligible_run e where r.id=e.id returning r.id,r.run_code,r.status,r.completed_at), released as (update cold_run_loads l set released_at=${completedAt}::timestamptz from cancelled c where l.run_id=c.id and l.removed_at is null and l.released_at is null returning l.id) select c.*,coalesce((select count(*) from released),0)::int released_loads from cancelled c`)
 if(!cancelled)return res.status(409).json({ok:false,error:'Sólo un ciclo abierto puede cancelarse'})
 return res.status(200).json({ok:true,run:cancelled})
}

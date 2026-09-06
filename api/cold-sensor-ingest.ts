import {timingSafeEqual} from 'node:crypto'
import {getSql} from './_db.js'

declare const process:{env:Record<string,string|undefined>}

type Request={method?:string;body?:unknown;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type Input={runId?:unknown;deviceId?:unknown;temperatureC?:unknown;observedAt?:unknown;idempotencyKey?:unknown;evidenceUrl?:unknown;note?:unknown}
type RunRow={id:string;plant_id:string;asset_id:string;status:string;station_id:string|null}

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const text=(value:unknown,max=500)=>String(value??'').trim().slice(0,max)
const finite=(value:unknown)=>{const n=Number(value);return Number.isFinite(n)?n:null}
const iso=(value:unknown)=>{const raw=text(value,64),date=new Date(raw);return raw&&!Number.isNaN(date.getTime())?date.toISOString():null}
const first=<T,>(rows:unknown)=>Array.isArray(rows)?rows[0] as T|undefined:undefined
const writesEnabled=()=>process.env.PLANT_EXECUTION_WRITES_ENABLED==='true'
const configuredSecret=()=>process.env.COLD_SENSOR_INGEST_SECRET?.trim()??''
const header=(req:Request,name:string)=>{const value=req.headers?.[name]??req.headers?.[name.toLowerCase()];return Array.isArray(value)?value[0]??'':String(value??'')}
const authorized=(req:Request)=>{
 const expected=configuredSecret(),provided=header(req,'x-pescamar-sensor-key').trim()
 if(!expected||!provided)return false
 const a=Buffer.from(expected),b=Buffer.from(provided)
 return a.length===b.length&&timingSafeEqual(a,b)
}

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false,error:'Método no permitido'})}
 if(!writesEnabled())return res.status(503).json({ok:false,code:'PLANT_EXECUTION_WRITES_DISABLED',error:'Ingesta de sensores deshabilitada hasta verificar Plant Execution'})
 if(!configuredSecret())return res.status(503).json({ok:false,code:'COLD_SENSOR_INGEST_NOT_CONFIGURED',error:'Ingesta automática de sensores no configurada'})
 if(!authorized(req))return res.status(401).json({ok:false,error:'Credencial de sensor inválida'})
 try{
  const input=(req.body??{}) as Input
  const runId=text(input.runId,40),deviceId=text(input.deviceId,40),temperature=finite(input.temperatureC),observedAt=iso(input.observedAt),key=text(input.idempotencyKey,160),evidence=text(input.evidenceUrl,1000)||null,note=text(input.note,1000)||null
  if(!uuid.test(runId)||!uuid.test(deviceId)||temperature==null||temperature<-100||temperature>100||!observedAt||key.length<8)return res.status(400).json({ok:false,error:'Telemetría de frío inválida'})
  const sql=getSql()
  const run=first<RunRow>(await sql`select r.id,r.plant_id,r.asset_id,r.status,a.station_id from cold_runs r join cold_assets a on a.id=r.asset_id where r.id=${runId}::uuid limit 1`)
  if(!run)return res.status(404).json({ok:false,error:'Ciclo de frío no encontrado'})
  if(run.status!=='open')return res.status(409).json({ok:false,error:'El ciclo de frío no está abierto'})
  const device=first<{id:string;plant_id:string;station_id:string;device_type:string}>(await sql`select d.id,s.plant_id,d.station_id,d.device_type from plant_devices d join plant_stations s on s.id=d.station_id where d.id=${deviceId}::uuid and d.active=true and s.active=true limit 1`)
  if(!device||device.device_type!=='sensor'||device.plant_id!==run.plant_id||run.station_id&&device.station_id!==run.station_id)return res.status(409).json({ok:false,error:'Sensor no corresponde al ciclo de frío'})
  const existing=first<{id:string;run_id:string;device_id:string|null;temperature_c:string|number;observed_at:string}>(await sql`select id,run_id,device_id,temperature_c,observed_at from cold_observations where plant_id=${run.plant_id} and idempotency_key=${key} limit 1`)
  if(existing){const same=existing.run_id===runId&&existing.device_id===deviceId&&Math.abs(Number(existing.temperature_c)-temperature)<=0.001&&new Date(existing.observed_at).toISOString()===observedAt;if(!same)return res.status(409).json({ok:false,error:'Idempotency key ya utilizada para otra lectura'});return res.status(200).json({ok:true,idempotent:true,observation:existing})}
  const saved=first(await sql`with eligible_run as (select id,plant_id from cold_runs where id=${runId}::uuid and status='open' for update) insert into cold_observations(run_id,plant_id,temperature_c,source,device_id,observed_by_operator_id,observed_at,evidence_url,note,idempotency_key) select e.id,e.plant_id,${temperature},'sensor',${deviceId}::uuid,null,${observedAt}::timestamptz,${evidence},${note},${key} from eligible_run e returning id,run_id,plant_id,temperature_c,source,device_id,observed_at`)
  if(!saved)return res.status(409).json({ok:false,error:'El ciclo ya no está abierto'})
  return res.status(201).json({ok:true,idempotent:false,observation:saved})
 }catch(error){
  console.error('cold sensor ingest failed',error)
  return res.status(500).json({ok:false,error:'No fue posible registrar telemetría de frío'})
 }
}

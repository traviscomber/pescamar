import {requireOperator,type SessionOperator} from './_auth.js'
import {PLANT_IDS,hasPlantAccess} from './_plants.js'
import {getSql} from './_db.js'

declare const process:{env:Record<string,string|undefined>}

type Request={method?:string;body?:unknown;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type Input={action?:unknown;plantId?:unknown;stationId?:unknown;code?:unknown;name?:unknown;stationType?:unknown;active?:unknown;config?:unknown;deviceType?:unknown;manufacturer?:unknown;model?:unknown;protocol?:unknown;stableIdentifier?:unknown}

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const codePattern=/^[a-z0-9][a-z0-9-]{1,39}$/
const text=(value:unknown,max=240)=>String(value??'').trim().slice(0,max)
const writesEnabled=()=>process.env.PLANT_EXECUTION_WRITES_ENABLED==='true'
const allowedPlants=new Set<string>(PLANT_IDS)
const stationTypes=new Set(['floor','packing','cold','warehouse','quality'])
const deviceTypes=new Set(['scanner','scale','printer','terminal','sensor'])
const recordJson=(value:unknown)=>JSON.stringify(value&&typeof value==='object'&&!Array.isArray(value)?value:{})
const first=<T,>(rows:unknown)=>Array.isArray(rows)?rows[0] as T|undefined:undefined

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 try{
  if(req.method==='POST'&&!writesEnabled())return res.status(503).json({ok:false,code:'PLANT_EXECUTION_WRITES_DISABLED',error:'Configuración de estaciones deshabilitada hasta verificar aislamiento Neon del entorno'})
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  if(req.method==='GET')return list(res,operator)
  if(req.method==='POST')return mutate(req,res,operator)
  res.setHeader('Allow','GET, POST')
  return res.status(405).json({ok:false,error:'Método no permitido'})
 }catch(error){
  const message=error instanceof Error?error.message:''
  const schemaMissing=message.includes('plant_stations')||message.includes('plant_devices')
  return res.status(schemaMissing?503:500).json({ok:false,error:schemaMissing?'Falta aplicar la migración Plant Execution 033':'No fue posible administrar estaciones de planta'})
 }
}

async function list(res:Response,operator:SessionOperator){
 const sql=getSql(),admin=operator.role==='admin',plantIds=operator.plantIds
 const rows=await sql`select s.id,s.plant_id,s.code,s.name,s.station_type,s.active,s.config,s.created_at,s.updated_at,coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'deviceType',d.device_type,'manufacturer',d.manufacturer,'model',d.model,'protocol',d.protocol,'stableIdentifier',d.stable_identifier,'active',d.active,'config',d.config) order by d.created_at) from plant_devices d where d.station_id=s.id),'[]'::jsonb) devices from plant_stations s where ${admin} or s.plant_id=any(${plantIds}::text[]) order by s.plant_id,s.code`
 return res.status(200).json({ok:true,writesEnabled:writesEnabled(),stations:Array.isArray(rows)?rows:[]})
}

async function mutate(req:Request,res:Response,operator:SessionOperator){
 if(operator.role!=='admin')return res.status(403).json({ok:false,error:'Sólo administración puede configurar estaciones y dispositivos'})
 const input=(req.body??{}) as Input,action=text(input.action,40),sql=getSql()
 if(action==='upsertStation'){
  const plantId=text(input.plantId,50).toLowerCase(),code=text(input.code,40).toLowerCase(),name=text(input.name,120),stationType=text(input.stationType,30).toLowerCase(),active=input.active!==false,config=recordJson(input.config)
  if(!allowedPlants.has(plantId)||!codePattern.test(code)||name.length<2||!stationTypes.has(stationType))return res.status(400).json({ok:false,error:'Configuración de estación inválida'})
  const station=first(await sql`insert into plant_stations(plant_id,code,name,station_type,active,config,created_by_operator_id) values(${plantId},${code},${name},${stationType},${active},${config}::jsonb,${operator.id}::uuid) on conflict(plant_id,code) do update set name=excluded.name,station_type=excluded.station_type,active=excluded.active,config=excluded.config,updated_at=now() returning id,plant_id,code,name,station_type,active,config,updated_at`)
  return res.status(200).json({ok:true,station})
 }
 if(action==='upsertDevice'){
  const stationId=text(input.stationId,40),deviceType=text(input.deviceType,30).toLowerCase(),manufacturer=text(input.manufacturer,100)||null,model=text(input.model,100)||null,protocol=text(input.protocol,80)||null,stableIdentifier=text(input.stableIdentifier,160),active=input.active!==false,config=recordJson(input.config)
  if(!uuid.test(stationId)||!deviceTypes.has(deviceType)||stableIdentifier.length<2)return res.status(400).json({ok:false,error:'Configuración de dispositivo inválida'})
  const station=first<{id:string;plant_id:string}>(await sql`select id,plant_id from plant_stations where id=${stationId}::uuid limit 1`)
  if(!station||!hasPlantAccess(operator,station.plant_id))return res.status(404).json({ok:false,error:'Estación no disponible'})
  const device=first(await sql`insert into plant_devices(station_id,device_type,manufacturer,model,protocol,stable_identifier,active,config) values(${stationId}::uuid,${deviceType},${manufacturer},${model},${protocol},${stableIdentifier},${active},${config}::jsonb) on conflict(station_id,stable_identifier) do update set device_type=excluded.device_type,manufacturer=excluded.manufacturer,model=excluded.model,protocol=excluded.protocol,active=excluded.active,config=excluded.config,updated_at=now() returning id,station_id,device_type,manufacturer,model,protocol,stable_identifier,active,config,updated_at`)
  return res.status(200).json({ok:true,device})
 }
 return res.status(400).json({ok:false,error:'Acción inválida'})
}

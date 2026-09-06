import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

declare const process:{env:Record<string,string|undefined>}

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type CountRow={count:string|number|null}
type LatestRow={observed_at:string|Date|null}

const first=<T,>(rows:unknown)=>Array.isArray(rows)?rows[0] as T|undefined:undefined
const numeric=(value:unknown)=>{const number=Number(value);return Number.isFinite(number)?number:0}

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
 const operator=await requireOperator(req)
 if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
 try{
  const sql=getSql(),admin=operator.role==='admin',plantIds=operator.plantIds
  const [sensors,observations,latest]=await Promise.all([
   sql`select count(*)::int count from plant_devices d join plant_stations s on s.id=d.station_id where d.active=true and s.active=true and d.device_type='sensor' and (${admin} or s.plant_id=any(${plantIds}::text[]))`,
   sql`select count(*)::int count from cold_observations o where o.source='sensor' and (${admin} or o.plant_id=any(${plantIds}::text[]))`,
   sql`select o.observed_at from cold_observations o where o.source='sensor' and (${admin} or o.plant_id=any(${plantIds}::text[])) order by o.observed_at desc limit 1`,
  ])
  const activeSensors=numeric(first<CountRow>(sensors)?.count),sensorObservationCount=numeric(first<CountRow>(observations)?.count),lastObservedAt=first<LatestRow>(latest)?.observed_at??null
  const writesEnabled=process.env.PLANT_EXECUTION_WRITES_ENABLED==='true'
  const secretConfigured=Boolean(process.env.COLD_SENSOR_INGEST_SECRET?.trim())
  const endpointConfigured=writesEnabled&&secretConfigured
  const state=sensorObservationCount>0?'observed':endpointConfigured&&activeSensors>0?'ready_for_test':'not_configured'
  return res.status(200).json({ok:true,state,writesEnabled,secretConfigured,activeSensors,sensorObservationCount,lastObservedAt})
 }catch(error){
  console.error('cold sensor status failed',error)
  return res.status(500).json({ok:false,error:'No fue posible verificar el estado de telemetría de frío'})
 }
}

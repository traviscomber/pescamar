import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>;body?:unknown}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type BeaconEvent={event?:unknown;path?:unknown;locale?:unknown}

const ALLOWED_EVENTS=['route_visited','instrumentation_heartbeat'] as const
const MAX_BATCH=20
const PATH_MAX=200
const WINDOW_MS=60_000
const MAX_EVENTS_PER_WINDOW=120
const BUCKET_SWEEP=50

type Bucket={count:number;resetAt:number}
const buckets=new Map<string,Bucket>()

function allow(operatorId:string){
  const now=Date.now()
  if(buckets.size>BUCKET_SWEEP*4)for(const [key,bucket] of buckets)if(bucket.resetAt<=now)buckets.delete(key)
  const bucket=buckets.get(operatorId)
  if(!bucket||bucket.resetAt<=now){buckets.set(operatorId,{count:1,resetAt:now+WINDOW_MS});return true}
  if(bucket.count>=MAX_EVENTS_PER_WINDOW)return false
  bucket.count+=1
  return true
}

const pathPattern=/^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/

function sanitize(event:BeaconEvent){
  if(!event||typeof event!=='object')return null
  const kind=typeof event.event==='string'?event.event:''
  if(!(ALLOWED_EVENTS as readonly string[]).includes(kind))return null
  const path=typeof event.path==='string'?event.path.trim():''
  if(!path||path.length>PATH_MAX||path.includes('?')||path.includes('#')||!pathPattern.test(path))return null
  const locale=event.locale==='en'?'en':event.locale==='es'?'es':null
  return {event:kind,path,meta:JSON.stringify(locale?{locale}:{})}
}

export default async function handler(request:Request,response:Response){
 response.setHeader('Cache-Control','no-store')
 if(request.method!=='POST'){response.setHeader('Allow','POST');return response.status(405).json({ok:false,error:'Método no permitido'})}
 try{
  const operator=await requireOperator(request)
  if(!operator)return response.status(401).json({ok:false,error:'Sesión requerida'})
  if(!allow(operator.id))return response.status(429).json({ok:false,error:'Demasiados eventos de pilotaje por minuto'})
  const payload=(request.body&&typeof request.body==='object'?request.body:{}) as {events?:unknown}
  const list=Array.isArray(payload.events)?payload.events.slice(0,MAX_BATCH):[]
  const events=list.map(item=>sanitize(item as BeaconEvent)).filter((item):item is NonNullable<typeof item>=>Boolean(item))
  if(!events.length)return response.status(400).json({ok:false,error:'Lote de eventos vacío o inválido'})
  await Promise.all(events.map(event=>getSql()`insert into pilot_events(operator_id,role,event,path,meta)
   values(${operator.id}::uuid,${operator.role},${event.event},${event.path},${event.meta}::jsonb)`))
  return response.status(201).json({ok:true,received:events.length,boundary:{writesOperationalState:false,roleFromSession:true,queryStringsStored:false}})
 }catch(error){
  const message=error instanceof Error?error.message:''
  if(message.includes('pilot_events')||message.includes('42P01'))return response.status(503).json({ok:false,error:'Telemetría de pilotaje pendiente de migración canónica'})
  console.error('pilot_events_failed',message||'unknown')
  return response.status(500).json({ok:false,error:'No fue posible registrar los eventos de pilotaje'})
 }
}

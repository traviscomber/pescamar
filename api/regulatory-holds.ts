import {requireOperator,type SessionOperator} from './_auth.js'
import {hasPlantAccess} from './_plants.js'
import {getSql} from './_db.js'

declare const process:{env:Record<string,string|undefined>}

type Request={method?:string;body?:unknown;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type Input={action?:unknown;authority?:unknown;receptionId?:unknown;palletId?:unknown;packingUnitId?:unknown;holdId?:unknown;reason?:unknown;note?:unknown;documentRef?:unknown;evidenceUrl?:unknown}
type HoldRow={id:string;plant_id:string;authority:string;reception_id:string|null;pallet_id:string|null;packing_unit_id:string|null;status:string;reason:string;document_ref:string|null;evidence_url:string|null}
type Target={plantId:string;receptionId:string|null;palletId:string|null;packingUnitId:string|null}

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const authorityPattern=/^[a-z0-9][a-z0-9_-]{1,49}$/
const text=(value:unknown,max=1000)=>String(value??'').trim().slice(0,max)
const writesEnabled=()=>process.env.PLANT_EXECUTION_WRITES_ENABLED==='true'
const canResolve=(o:SessionOperator)=>['admin','quality'].includes(o.role)
const first=<T,>(rows:unknown)=>Array.isArray(rows)?rows[0] as T|undefined:undefined

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 try{
  if(req.method==='POST'&&!writesEnabled())return res.status(503).json({ok:false,code:'PLANT_EXECUTION_WRITES_DISABLED',error:'Control regulatorio deshabilitado hasta verificar aislamiento Neon del entorno'})
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  if(req.method==='GET')return list(res,operator)
  if(req.method==='POST')return mutate(req,res,operator)
  res.setHeader('Allow','GET, POST')
  return res.status(405).json({ok:false,error:'Método no permitido'})
 }catch(error){
  const message=error instanceof Error?error.message:''
  const missing=['regulatory_holds','regulatory_hold_events','pallets','packing_units'].some(name=>message.includes(name))
  return res.status(missing?503:500).json({ok:false,error:missing?'Falta aplicar las migraciones Plant Execution 033–037':'No fue posible operar control regulatorio'})
 }
}

async function list(res:Response,operator:SessionOperator){
 const sql=getSql(),admin=operator.role==='admin',plantIds=operator.plantIds
 const rows=await sql`select h.id,h.plant_id,h.authority,h.reception_id,h.pallet_id,h.packing_unit_id,h.status,h.reason,h.document_ref,h.evidence_url,h.opened_by_operator_id,h.opened_at,h.resolved_by_operator_id,h.resolved_at,h.resolution_note,h.updated_at,coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'eventType',e.event_type,'note',e.note,'documentRef',e.document_ref,'evidenceUrl',e.evidence_url,'actorOperatorId',e.actor_operator_id,'occurredAt',e.occurred_at) order by e.occurred_at) from regulatory_hold_events e where e.hold_id=h.id),'[]'::jsonb) events from regulatory_holds h where ${admin} or h.plant_id=any(${plantIds}::text[]) order by case h.status when 'open' then 0 when 'rejected' then 1 else 2 end,h.opened_at desc limit 1000`
 return res.status(200).json({ok:true,writesEnabled:writesEnabled(),holds:Array.isArray(rows)?rows:[]})
}

async function mutate(req:Request,res:Response,operator:SessionOperator){
 if(!canResolve(operator))return res.status(403).json({ok:false,error:'Sólo Calidad o Administración pueden operar holds regulatorios'})
 const input=(req.body??{}) as Input,action=text(input.action,40)
 if(action==='openHold')return openHold(input,res,operator)
 if(action==='releaseHold')return resolveHold(input,res,operator,'released')
 if(action==='rejectHold')return resolveHold(input,res,operator,'rejected')
 return res.status(400).json({ok:false,error:'Acción inválida'})
}

async function resolveTarget(input:Input,operator:SessionOperator):Promise<Target|null>{
 const receptionId=text(input.receptionId,40),palletId=text(input.palletId,40),packingUnitId=text(input.packingUnitId,40),ids=[receptionId,palletId,packingUnitId].filter(Boolean)
 if(ids.length!==1||ids.some(id=>!uuid.test(id)))return null
 const sql=getSql()
 if(receptionId){const row=first<{plant_id:string}>(await sql`select plant_id from receptions where id=${receptionId}::uuid limit 1`);if(!row||!hasPlantAccess(operator,row.plant_id))return null;return {plantId:row.plant_id,receptionId,palletId:null,packingUnitId:null}}
 if(palletId){const row=first<{plant_id:string;status:string}>(await sql`select plant_id,status from pallets where id=${palletId}::uuid limit 1`);if(!row||!hasPlantAccess(operator,row.plant_id)||row.status==='voided')return null;return {plantId:row.plant_id,receptionId:null,palletId,packingUnitId:null}}
 const row=first<{plant_id:string}>(await sql`select plant_id from packing_units where id=${packingUnitId}::uuid limit 1`)
 if(!row||!hasPlantAccess(operator,row.plant_id))return null
 return {plantId:row.plant_id,receptionId:null,palletId:null,packingUnitId}
}

async function openHold(input:Input,res:Response,operator:SessionOperator){
 const authority=text(input.authority,50).toLowerCase(),reason=text(input.reason,1000),documentRef=text(input.documentRef,240)||null,evidenceUrl=text(input.evidenceUrl,1000)||null
 if(!authorityPattern.test(authority)||reason.length<4)return res.status(400).json({ok:false,error:'Autoridad y motivo válidos son obligatorios'})
 const target=await resolveTarget(input,operator)
 if(!target)return res.status(404).json({ok:false,error:'Objetivo regulatorio inválido o fuera de alcance'})
 const sql=getSql()
 const existing=first<HoldRow>(await sql`select id,plant_id,authority,reception_id,pallet_id,packing_unit_id,status,reason,document_ref,evidence_url from regulatory_holds where status='open' and authority=${authority} and (reception_id is not distinct from ${target.receptionId}::uuid) and (pallet_id is not distinct from ${target.palletId}::uuid) and (packing_unit_id is not distinct from ${target.packingUnitId}::uuid) limit 1`)
 if(existing)return res.status(200).json({ok:true,idempotent:true,hold:existing})
 const created=first(await sql`with created as (insert into regulatory_holds(plant_id,authority,reception_id,pallet_id,packing_unit_id,reason,document_ref,evidence_url,opened_by_operator_id) values(${target.plantId},${authority},${target.receptionId}::uuid,${target.palletId}::uuid,${target.packingUnitId}::uuid,${reason},${documentRef},${evidenceUrl},${operator.id}::uuid) on conflict do nothing returning id,plant_id,authority,reception_id,pallet_id,packing_unit_id,status,reason,document_ref,evidence_url,opened_at), event as (insert into regulatory_hold_events(hold_id,event_type,note,document_ref,evidence_url,actor_operator_id) select c.id,'opened',c.reason,c.document_ref,c.evidence_url,${operator.id}::uuid from created c returning id) select c.* from created c cross join event e`)
 if(created)return res.status(201).json({ok:true,idempotent:false,hold:created})
 const concurrent=first<HoldRow>(await sql`select id,plant_id,authority,reception_id,pallet_id,packing_unit_id,status,reason,document_ref,evidence_url from regulatory_holds where status='open' and authority=${authority} and (reception_id is not distinct from ${target.receptionId}::uuid) and (pallet_id is not distinct from ${target.palletId}::uuid) and (packing_unit_id is not distinct from ${target.packingUnitId}::uuid) limit 1`)
 if(concurrent)return res.status(200).json({ok:true,idempotent:true,hold:concurrent})
 return res.status(409).json({ok:false,error:'No fue posible abrir hold sin duplicar control'})
}

async function resolveHold(input:Input,res:Response,operator:SessionOperator,status:'released'|'rejected'){
 const holdId=text(input.holdId,40),note=text(input.note,1000),documentRef=text(input.documentRef,240)||null,evidenceUrl=text(input.evidenceUrl,1000)||null
 if(!uuid.test(holdId)||note.length<4)return res.status(400).json({ok:false,error:'Hold y fundamento de resolución son obligatorios'})
 const sql=getSql(),hold=first<HoldRow>(await sql`select id,plant_id,authority,reception_id,pallet_id,packing_unit_id,status,reason,document_ref,evidence_url from regulatory_holds where id=${holdId}::uuid limit 1`)
 if(!hold||!hasPlantAccess(operator,hold.plant_id))return res.status(404).json({ok:false,error:'Hold fuera de alcance'})
 if(hold.status===status)return res.status(200).json({ok:true,idempotent:true,hold})
 if(hold.status!=='open')return res.status(409).json({ok:false,error:'Sólo un hold abierto puede resolverse'})
 const eventType=status==='released'?'released':'rejected'
 const resolved=first(await sql`with eligible as (select id from regulatory_holds where id=${holdId}::uuid and status='open' for update), changed as (update regulatory_holds h set status=${status},resolved_by_operator_id=${operator.id}::uuid,resolved_at=now(),resolution_note=${note},document_ref=coalesce(${documentRef},h.document_ref),evidence_url=coalesce(${evidenceUrl},h.evidence_url),updated_at=now() from eligible e where h.id=e.id returning h.id,h.plant_id,h.authority,h.reception_id,h.pallet_id,h.packing_unit_id,h.status,h.reason,h.document_ref,h.evidence_url,h.resolved_at,h.resolution_note), event as (insert into regulatory_hold_events(hold_id,event_type,note,document_ref,evidence_url,actor_operator_id) select c.id,${eventType},${note},${documentRef},${evidenceUrl},${operator.id}::uuid from changed c returning id) select c.* from changed c cross join event e`)
 if(!resolved)return res.status(409).json({ok:false,error:'Hold cambió de estado durante la resolución'})
 return res.status(200).json({ok:true,idempotent:false,hold:resolved})
}

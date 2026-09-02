import {requireOperator,type SessionOperator} from './_auth.js'
import {PLANT_IDS,hasPlantAccess} from './_plants.js'
import {getSql} from './_db.js'

declare const process:{env:Record<string,string|undefined>}

type Request={method?:string;body?:unknown;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type Input={action?:unknown;plantId?:unknown;palletId?:unknown;palletCode?:unknown;packingUnitId?:unknown;destination?:unknown;reason?:unknown}
type PalletRow={id:string;pallet_code:string;plant_id:string;status:string;product:string|null;species:string|null;grade:string|null;destination:string|null}
type PackingRow={id:string;packing_unit_code:string;plant_id:string;product:string|null;species:string;grade:string|null;net_kg:string|number;status:string}
type MembershipRow={id:string;pallet_id:string;packing_unit_id:string;previous_packing_status:string}
type CloseRow={box_count:number;net_kg:string|number;products:number;species_count:number;grades:number;product:string|null;species:string|null;grade:string|null;closed_id:string|null;pallet_code:string|null;plant_id:string|null;status:string|null;destination:string|null;closed_at:string|null}

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const palletCode=/^[A-Z0-9][A-Z0-9._/-]{2,79}$/
const text=(value:unknown,max=240)=>String(value??'').trim().slice(0,max)
const writesEnabled=()=>process.env.PLANT_EXECUTION_WRITES_ENABLED==='true'
const canOperate=(operator:SessionOperator)=>['admin','operations'].includes(operator.role)
const allowedPlants=new Set<string>(PLANT_IDS)
const first=<T,>(rows:unknown)=>Array.isArray(rows)?rows[0] as T|undefined:undefined

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 try{
  if(req.method==='POST'&&!writesEnabled())return res.status(503).json({ok:false,code:'PLANT_EXECUTION_WRITES_DISABLED',error:'Palletización deshabilitada hasta verificar aislamiento Neon del entorno'})
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  if(req.method==='GET')return list(res,operator)
  if(req.method==='POST')return mutate(req,res,operator)
  res.setHeader('Allow','GET, POST')
  return res.status(405).json({ok:false,error:'Método no permitido'})
 }catch(error){
  const message=error instanceof Error?error.message:''
  if(message.includes('Pallet bloqueado por control regulatorio'))return res.status(409).json({ok:false,error:'Pallet bloqueado por control regulatorio; su composición no puede cambiar'})
  const missing=['pallets','pallet_packing_units','packing_units'].some(name=>message.includes(name))
  return res.status(missing?503:500).json({ok:false,error:missing?'Falta aplicar las migraciones Plant Execution 033 y 035':'No fue posible operar pallets'})
 }
}

async function list(res:Response,operator:SessionOperator){
 const sql=getSql(),admin=operator.role==='admin',plantIds=operator.plantIds
 const rows=await sql`select p.id,p.pallet_code,p.plant_id,p.status,p.product,p.species,p.grade,p.destination,p.box_count,p.net_kg,p.created_at,p.closed_at,p.updated_at,coalesce((select jsonb_agg(jsonb_build_object('membershipId',i.id,'id',u.id,'code',u.packing_unit_code,'product',u.product,'species',u.species,'grade',u.grade,'netKg',u.net_kg,'status',u.status,'addedAt',i.added_at) order by i.added_at) from pallet_packing_units i join packing_units u on u.id=i.packing_unit_id where i.pallet_id=p.id and i.removed_at is null),'[]'::jsonb) items from pallets p where ${admin} or p.plant_id=any(${plantIds}::text[]) order by p.updated_at desc limit 500`
 return res.status(200).json({ok:true,writesEnabled:writesEnabled(),pallets:Array.isArray(rows)?rows:[]})
}

async function mutate(req:Request,res:Response,operator:SessionOperator){
 if(!canOperate(operator))return res.status(403).json({ok:false,error:'Sólo Operaciones o Administración pueden palletizar'})
 const input=(req.body??{}) as Input,action=text(input.action,40)
 if(action==='create')return createPallet(input,res,operator)
 if(action==='addUnit')return addUnit(input,res,operator)
 if(action==='removeUnit')return removeUnit(input,res,operator)
 if(action==='close')return closePallet(input,res,operator)
 return res.status(400).json({ok:false,error:'Acción inválida'})
}

async function createPallet(input:Input,res:Response,operator:SessionOperator){
 const plantId=text(input.plantId,50).toLowerCase(),code=text(input.palletCode,80).toUpperCase(),destination=text(input.destination,160)||null
 if(!allowedPlants.has(plantId)||!hasPlantAccess(operator,plantId))return res.status(403).json({ok:false,error:'Planta fuera de alcance'})
 if(!palletCode.test(code))return res.status(400).json({ok:false,error:'Código de pallet inválido'})
 const sql=getSql()
 const existing=first<PalletRow>(await sql`select id,pallet_code,plant_id,status,product,species,grade,destination from pallets where pallet_code=${code} limit 1`)
 if(existing){
  if(existing.plant_id!==plantId)return res.status(409).json({ok:false,error:'Código de pallet ya utilizado'})
  return res.status(200).json({ok:true,idempotent:true,pallet:existing})
 }
 const saved=first(await sql`insert into pallets(pallet_code,plant_id,destination,created_by_operator_id) values(${code},${plantId},${destination},${operator.id}::uuid) returning id,pallet_code,plant_id,status,product,species,grade,destination,box_count,net_kg,created_at`)
 return res.status(201).json({ok:true,idempotent:false,pallet:saved})
}

async function addUnit(input:Input,res:Response,operator:SessionOperator){
 const palletId=text(input.palletId,40),packingUnitId=text(input.packingUnitId,40)
 if(!uuid.test(palletId)||!uuid.test(packingUnitId))return res.status(400).json({ok:false,error:'Pallet o packing unit inválido'})
 const sql=getSql()
 const pallet=first<PalletRow>(await sql`select id,pallet_code,plant_id,status,product,species,grade,destination from pallets where id=${palletId}::uuid limit 1`)
 if(!pallet||!hasPlantAccess(operator,pallet.plant_id))return res.status(404).json({ok:false,error:'Pallet fuera de alcance'})
 if(pallet.status!=='building')return res.status(409).json({ok:false,error:'Sólo se pueden agregar cajas a un pallet en construcción'})
 const packing=first<PackingRow>(await sql`select id,packing_unit_code,plant_id,product,species,grade,net_kg,status from packing_units where id=${packingUnitId}::uuid limit 1`)
 if(!packing||packing.plant_id!==pallet.plant_id)return res.status(409).json({ok:false,error:'Packing unit no pertenece a la planta del pallet'})
 const owner=first<{pallet_id:string}>(await sql`select pallet_id from pallet_packing_units where packing_unit_id=${packingUnitId}::uuid and removed_at is null limit 1`)
 if(owner){
  if(owner.pallet_id===palletId)return res.status(200).json({ok:true,idempotent:true,palletId,packingUnitId})
  return res.status(409).json({ok:false,error:'Packing unit ya pertenece a otro pallet'})
 }
 if(!['packed','released'].includes(packing.status))return res.status(409).json({ok:false,error:'Estado de packing unit no permite palletización'})
 const composition=first<{products:number;species_count:number;grades:number;product:string|null;species:string|null;grade:string|null}>(await sql`select count(distinct coalesce(u.product,''))::int products,count(distinct u.species)::int species_count,count(distinct coalesce(u.grade,''))::int grades,min(u.product) product,min(u.species) species,min(u.grade) grade from pallet_packing_units i join packing_units u on u.id=i.packing_unit_id where i.pallet_id=${palletId}::uuid and i.removed_at is null`)
 if(composition&&(composition.products>0||composition.species_count>0||composition.grades>0)){
  if(composition.product!==packing.product||composition.species!==packing.species||composition.grade!==packing.grade)return res.status(409).json({ok:false,error:'Packing unit no coincide con la composición del pallet'})
 }
 const updated=first<{id:string;packing_unit_code:string;status:string;net_kg:string|number}>(await sql`with eligible_pallet as (select id from pallets where id=${palletId}::uuid and status='building' for update), claimed as (update packing_units u set status='palletized',updated_at=now() where u.id=${packingUnitId}::uuid and u.status=${packing.status} and exists(select 1 from eligible_pallet) and not exists(select 1 from pallet_packing_units i where i.packing_unit_id=u.id and i.removed_at is null) returning u.id,u.packing_unit_code,u.status,u.net_kg), added as (insert into pallet_packing_units(pallet_id,packing_unit_id,previous_packing_status,added_by_operator_id) select ${palletId}::uuid,c.id,${packing.status},${operator.id}::uuid from claimed c returning packing_unit_id), touched as (update pallets p set updated_at=now() from eligible_pallet e where p.id=e.id and exists(select 1 from added) returning p.id) select c.id,c.packing_unit_code,c.status,c.net_kg from claimed c join added a on a.packing_unit_id=c.id cross join touched t`)
 if(!updated){
  const concurrent=first<{pallet_id:string}>(await sql`select pallet_id from pallet_packing_units where packing_unit_id=${packingUnitId}::uuid and removed_at is null limit 1`)
  if(concurrent?.pallet_id===palletId)return res.status(200).json({ok:true,idempotent:true,palletId,packingUnitId})
  if(concurrent)return res.status(409).json({ok:false,error:'Packing unit fue palletizada concurrentemente en otro pallet'})
  return res.status(409).json({ok:false,error:'Pallet o packing unit cambió de estado durante la palletización'})
 }
 return res.status(201).json({ok:true,idempotent:false,palletId,packingUnit:updated})
}

async function removeUnit(input:Input,res:Response,operator:SessionOperator){
 const palletId=text(input.palletId,40),packingUnitId=text(input.packingUnitId,40),reason=text(input.reason,500)
 if(!uuid.test(palletId)||!uuid.test(packingUnitId)||reason.length<4)return res.status(400).json({ok:false,error:'Pallet, packing unit y motivo son obligatorios'})
 const sql=getSql()
 const pallet=first<PalletRow>(await sql`select id,pallet_code,plant_id,status,product,species,grade,destination from pallets where id=${palletId}::uuid limit 1`)
 if(!pallet||!hasPlantAccess(operator,pallet.plant_id))return res.status(404).json({ok:false,error:'Pallet fuera de alcance'})
 if(pallet.status!=='building')return res.status(409).json({ok:false,error:'Sólo se pueden retirar cajas de un pallet en construcción'})
 const membership=first<MembershipRow>(await sql`select id,pallet_id,packing_unit_id,previous_packing_status from pallet_packing_units where pallet_id=${palletId}::uuid and packing_unit_id=${packingUnitId}::uuid and removed_at is null limit 1`)
 if(!membership)return res.status(404).json({ok:false,error:'Packing unit no pertenece activamente a este pallet'})
 const restored=first<{id:string;packing_unit_code:string;status:string;net_kg:string|number}>(await sql`with eligible_pallet as (select id from pallets where id=${palletId}::uuid and status='building' for update), active_membership as (select i.id,i.previous_packing_status from pallet_packing_units i,eligible_pallet e where i.id=${membership.id}::uuid and i.pallet_id=e.id and i.packing_unit_id=${packingUnitId}::uuid and i.removed_at is null for update), restored as (update packing_units u set status=m.previous_packing_status,updated_at=now() from active_membership m where u.id=${packingUnitId}::uuid and u.status='palletized' returning u.id,u.packing_unit_code,u.status,u.net_kg), removed as (update pallet_packing_units i set removed_by_operator_id=${operator.id}::uuid,removed_at=now(),removal_reason=${reason} from active_membership m where i.id=m.id and i.removed_at is null and exists(select 1 from restored) returning i.id), touched as (update pallets p set updated_at=now() from eligible_pallet e where p.id=e.id and exists(select 1 from removed) returning p.id) select r.id,r.packing_unit_code,r.status,r.net_kg from restored r cross join removed x cross join touched t`)
 if(!restored)return res.status(409).json({ok:false,error:'Pallet, membresía o packing unit cambió de estado durante el retiro'})
 return res.status(200).json({ok:true,palletId,packingUnit:restored,reason})
}

async function closePallet(input:Input,res:Response,operator:SessionOperator){
 const palletId=text(input.palletId,40)
 if(!uuid.test(palletId))return res.status(400).json({ok:false,error:'Pallet inválido'})
 const sql=getSql()
 const pallet=first<PalletRow>(await sql`select id,pallet_code,plant_id,status,product,species,grade,destination from pallets where id=${palletId}::uuid limit 1`)
 if(!pallet||!hasPlantAccess(operator,pallet.plant_id))return res.status(404).json({ok:false,error:'Pallet fuera de alcance'})
 if(pallet.status==='closed')return res.status(200).json({ok:true,idempotent:true,pallet})
 if(pallet.status!=='building')return res.status(409).json({ok:false,error:'Estado de pallet no permite cierre'})
 const result=first<CloseRow>(await sql`with eligible_pallet as (select id from pallets where id=${palletId}::uuid and status='building' for update), summary as (select count(*)::int box_count,coalesce(sum(u.net_kg),0) net_kg,count(distinct coalesce(u.product,''))::int products,count(distinct u.species)::int species_count,count(distinct coalesce(u.grade,''))::int grades,min(u.product) product,min(u.species) species,min(u.grade) grade from eligible_pallet e left join pallet_packing_units i on i.pallet_id=e.id and i.removed_at is null left join packing_units u on u.id=i.packing_unit_id), closed as (update pallets p set status='closed',product=s.product,species=s.species,grade=s.grade,box_count=s.box_count,net_kg=s.net_kg,closed_by_operator_id=${operator.id}::uuid,closed_at=now(),updated_at=now() from eligible_pallet e,summary s where p.id=e.id and s.box_count>0 and s.products<=1 and s.species_count<=1 and s.grades<=1 returning p.id closed_id,p.pallet_code,p.plant_id,p.status,p.destination,p.closed_at) select s.box_count,s.net_kg,s.products,s.species_count,s.grades,s.product,s.species,s.grade,c.closed_id,c.pallet_code,c.plant_id,c.status,c.destination,c.closed_at from summary s left join closed c on true`)
 if(!result)return res.status(409).json({ok:false,error:'Pallet cambió de estado durante el cierre'})
 if(!result.box_count)return res.status(409).json({ok:false,error:'No se puede cerrar un pallet vacío'})
 if(result.products>1||result.species_count>1||result.grades>1)return res.status(409).json({ok:false,error:'Pallet contiene una mezcla no autorizada'})
 if(!result.closed_id)return res.status(409).json({ok:false,error:'Pallet cambió de estado durante el cierre'})
 return res.status(200).json({ok:true,idempotent:false,pallet:{id:result.closed_id,pallet_code:result.pallet_code,plant_id:result.plant_id,status:result.status,product:result.product,species:result.species,grade:result.grade,destination:result.destination,box_count:result.box_count,net_kg:result.net_kg,closed_at:result.closed_at}})
}

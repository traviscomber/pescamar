import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
 try{
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  const sql=getSql(),admin=operator.role==='admin',plantIds=operator.plantIds
  const rows=await sql`select u.id,u.packing_unit_code,u.plant_id,u.reception_id,u.product,u.species,u.grade,u.format,u.net_kg,u.status,u.packed_at,u.updated_at from packing_units u where (${admin} or u.plant_id=any(${plantIds}::text[])) and u.status in ('packed','released') and not exists(select 1 from pallet_packing_units i where i.packing_unit_id=u.id and i.removed_at is null) order by u.packed_at desc limit 1000`
  return res.status(200).json({ok:true,units:Array.isArray(rows)?rows:[]})
 }catch(error){
  const message=error instanceof Error?error.message:''
  const missing=['packing_units','pallet_packing_units'].some(name=>message.includes(name))
  return res.status(missing?503:500).json({ok:false,error:missing?'Falta aplicar las migraciones Plant Execution 033 y 035':'No fue posible cargar packing units'})
 }
}

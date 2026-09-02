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
  const [receptions,units]=await Promise.all([
   sql`select r.id,r.reception_number,r.plant_id,r.supplier,r.species,r.quality_status,r.received_at from receptions r where ${admin} or r.plant_id=any(${plantIds}::text[]) order by r.received_at desc limit 1000`,
   sql`select u.id,u.packing_unit_code,u.plant_id,u.reception_id,u.product,u.species,u.grade,u.format,u.net_kg,u.status,u.packed_at,m.pallet_id active_pallet_id,p.pallet_code active_pallet_code from packing_units u left join lateral(select i.pallet_id from pallet_packing_units i where i.packing_unit_id=u.id and i.removed_at is null limit 1) m on true left join pallets p on p.id=m.pallet_id where (${admin} or u.plant_id=any(${plantIds}::text[])) and u.status in ('packed','released','held') order by u.packed_at desc limit 1000`
  ])
  return res.status(200).json({ok:true,receptions:Array.isArray(receptions)?receptions:[],units:Array.isArray(units)?units:[]})
 }catch(error){
  const message=error instanceof Error?error.message:''
  const missing=['receptions','packing_units','pallet_packing_units','pallets'].some(name=>message.includes(name))
  return res.status(missing?503:500).json({ok:false,error:missing?'Falta aplicar el esquema operativo requerido para control regulatorio':'No fue posible cargar objetivos regulatorios'})
 }
}

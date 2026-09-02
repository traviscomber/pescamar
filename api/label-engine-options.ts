import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 try{
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
  const sql=getSql(),admin=operator.role==='admin',plantIds=operator.plantIds
  const [packingUnits,labels,printers]=await Promise.all([
   sql`select id,plant_id,reception_id,packing_unit_code,product,species,grade,format,net_kg,status,packed_at from packing_units where status<>'voided' and (${admin} or plant_id=any(${plantIds}::text[])) order by packed_at desc limit 500`,
   sql`select l.id,l.reception_id,l.label_code,l.product,l.grade,l.net_kg,l.status,l.species,l.packing_format,r.plant_id from product_labels l join receptions r on r.id=l.reception_id where l.status='validated' and (${admin} or r.plant_id=any(${plantIds}::text[])) order by l.updated_at desc nulls last,l.created_at desc limit 500`,
   sql`select d.id,s.plant_id,d.station_id,s.code station_code,s.name station_name,d.stable_identifier,d.manufacturer,d.model,d.protocol from plant_devices d join plant_stations s on s.id=d.station_id where d.device_type='printer' and d.active=true and s.active=true and (${admin} or s.plant_id=any(${plantIds}::text[])) order by s.plant_id,s.code,d.stable_identifier nulls last limit 200`
  ])
  return res.status(200).json({ok:true,packingUnits:Array.isArray(packingUnits)?packingUnits:[],labels:Array.isArray(labels)?labels:[],printers:Array.isArray(printers)?printers:[]})
 }catch(error){
  const message=error instanceof Error?error.message:''
  const missing=['packing_units','label_templates','plant_devices'].some(name=>message.includes(name))
  return res.status(missing?503:500).json({ok:false,error:missing?'Falta aplicar las migraciones Plant Execution':'No fue posible cargar opciones de impresión'})
 }
}

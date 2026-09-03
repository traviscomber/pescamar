import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>;query?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type RunRow={id:string;reception_id:string;reception_number:string|number;plant_id:string|null;species:string;supplier:string;grade:string|null;color_status:string;status:string}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const value=(entry:string|string[]|undefined)=>Array.isArray(entry)?entry[0]:entry
const header=(request:Request,name:string)=>value(Object.entries(request.headers??{}).find(([key])=>key.toLowerCase()===name.toLowerCase())?.[1])
const visible=(role:string,plantIds:string[],plantId:string|null)=>role==='admin'||!plantId||plantIds.includes(plantId)

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 const operator=await requireOperator(req)
 if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
 const runId=String(value(req.query?.runId)??'').trim()
 const receptionId=String(value(req.query?.receptionId)??'').trim()
 if(runId&&!uuid.test(runId)||receptionId&&!uuid.test(receptionId)||!runId&&!receptionId)return res.status(400).json({ok:false,error:'Indica un runId o receptionId válido'})
 const sql=getSql()
 const rows=runId
  ?await sql`select u.id,u.reception_id,r.reception_number,r.plant_id,r.species,p.legal_name supplier,u.grade,u.color_status,u.status from sea_urchin_process_runs u join receptions r on r.id=u.reception_id join parties p on p.id=r.supplier_id where u.id=${runId}::uuid limit 1`
  :await sql`select u.id,u.reception_id,r.reception_number,r.plant_id,r.species,p.legal_name supplier,u.grade,u.color_status,u.status from sea_urchin_process_runs u join receptions r on r.id=u.reception_id join parties p on p.id=r.supplier_id where u.reception_id=${receptionId}::uuid limit 1`
 const run=Array.isArray(rows)?rows[0] as RunRow|undefined:undefined
 if(!run||!String(run.species??'').toLowerCase().includes('eriz')||!visible(operator.role,operator.plantIds,run.plant_id))return res.status(404).json({ok:false,error:'Proceso de erizo no disponible'})
 const host=header(req,'x-forwarded-host')||header(req,'host')||'pescamar-three.vercel.app'
 const protocol=header(req,'x-forwarded-proto')||'https'
 const path=`/erizo/camara?runId=${encodeURIComponent(run.id)}`
 return res.status(200).json({ok:true,run:{runId:run.id,receptionId:run.reception_id,receptionNumber:run.reception_number,plantId:run.plant_id,species:run.species,supplier:run.supplier,grade:run.grade,colorStatus:run.color_status,status:run.status},capture:{path,url:`${protocol}://${host}${path}`,api:'/api/sea-urchin-color',requiresLogin:true,camera:'rear-preferred'},permissions:{canCapture:['admin','operations','quality'].includes(operator.role)}})
}

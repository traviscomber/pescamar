import {requireOperator,type SessionOperator} from './_auth.js'
import {PLANT_IDS,hasPlantAccess} from './_plants.js'
import {getSql} from './_db.js'

declare const process:{env:Record<string,string|undefined>}

type Request={method?:string;body?:unknown;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type Input={action?:unknown;plantId?:unknown;code?:unknown;version?:unknown;product?:unknown;species?:unknown;grade?:unknown;format?:unknown;destination?:unknown;minNetKg?:unknown;maxNetKg?:unknown;labelTemplateCode?:unknown;unitsPerBox?:unknown;boxesPerPallet?:unknown;rules?:unknown}

const codePattern=/^[a-z0-9][a-z0-9-]{1,59}$/
const text=(value:unknown,max=240)=>String(value??'').trim().slice(0,max)
const numberOrNull=(value:unknown)=>{if(value==null||value==='')return null;const n=Number(value);return Number.isFinite(n)?n:null}
const positiveIntOrNull=(value:unknown)=>{const n=numberOrNull(value);return n!=null&&Number.isInteger(n)&&n>0?n:null}
const writesEnabled=()=>process.env.PLANT_EXECUTION_WRITES_ENABLED==='true'
const canWrite=(operator:SessionOperator)=>['admin','operations','quality'].includes(operator.role)
const allowedPlants=new Set<string>(PLANT_IDS)
const recordJson=(value:unknown)=>JSON.stringify(value&&typeof value==='object'&&!Array.isArray(value)?value:{})
const first=<T,>(rows:unknown)=>Array.isArray(rows)?rows[0] as T|undefined:undefined

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 try{
  if(req.method==='POST'&&!writesEnabled())return res.status(503).json({ok:false,code:'PLANT_EXECUTION_WRITES_DISABLED',error:'Escrituras de packing deshabilitadas hasta verificar aislamiento Neon del entorno'})
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  if(req.method==='GET')return list(res,operator)
  if(req.method==='POST')return createVersion(req,res,operator)
  res.setHeader('Allow','GET, POST')
  return res.status(405).json({ok:false,error:'Método no permitido'})
 }catch(error){
  const message=error instanceof Error?error.message:''
  return res.status(message.includes('packing_specs')?503:500).json({ok:false,error:message.includes('packing_specs')?'Falta aplicar la migración Plant Execution 033':'No fue posible administrar especificaciones de packing'})
 }
}

async function list(res:Response,operator:SessionOperator){
 const sql=getSql(),admin=operator.role==='admin',plantIds=operator.plantIds
 const rows=await sql`select id,plant_id,code,version,product,species,grade,format,destination,min_net_kg,max_net_kg,label_template_code,units_per_box,boxes_per_pallet,rules,active,created_by_operator_id,created_at from packing_specs where ${admin} or plant_id is null or plant_id=any(${plantIds}::text[]) order by code,version desc,plant_id nulls first`
 return res.status(200).json({ok:true,writesEnabled:writesEnabled(),specs:Array.isArray(rows)?rows:[]})
}

async function createVersion(req:Request,res:Response,operator:SessionOperator){
 if(!canWrite(operator))return res.status(403).json({ok:false,error:'Acción no autorizada'})
 const input=(req.body??{}) as Input,action=text(input.action,40)
 if(action!=='createVersion')return res.status(400).json({ok:false,error:'Acción inválida'})
 const rawPlant=text(input.plantId,50).toLowerCase(),plantId=rawPlant||null,code=text(input.code,60).toLowerCase(),product=text(input.product,160),species=text(input.species,100)||null,grade=text(input.grade,8).toUpperCase()||null,format=text(input.format,120),destination=text(input.destination,160)||null,labelTemplateCode=text(input.labelTemplateCode,80)||null
 const version=positiveIntOrNull(input.version),minNetKg=numberOrNull(input.minNetKg),maxNetKg=numberOrNull(input.maxNetKg),unitsPerBox=positiveIntOrNull(input.unitsPerBox),boxesPerPallet=positiveIntOrNull(input.boxesPerPallet),rules=recordJson(input.rules)
 if(plantId&&(!allowedPlants.has(plantId)||!hasPlantAccess(operator,plantId)))return res.status(403).json({ok:false,error:'Planta fuera de alcance'})
 if(!plantId&&operator.role!=='admin')return res.status(403).json({ok:false,error:'Sólo administración puede crear especificaciones globales'})
 if(!codePattern.test(code)||!version||product.length<2||format.length<1||grade&&!['A','B','C','D','E'].includes(grade))return res.status(400).json({ok:false,error:'Especificación de packing inválida'})
 if(minNetKg!=null&&minNetKg<=0||maxNetKg!=null&&maxNetKg<=0||minNetKg!=null&&maxNetKg!=null&&minNetKg>maxNetKg)return res.status(400).json({ok:false,error:'Rango de peso inválido'})
 const sql=getSql()
 const spec=first(await sql`insert into packing_specs(plant_id,code,version,product,species,grade,format,destination,min_net_kg,max_net_kg,label_template_code,units_per_box,boxes_per_pallet,rules,active,created_by_operator_id) values(${plantId},${code},${version},${product},${species},${grade},${format},${destination},${minNetKg},${maxNetKg},${labelTemplateCode},${unitsPerBox},${boxesPerPallet},${rules}::jsonb,true,${operator.id}::uuid) on conflict do nothing returning id,plant_id,code,version,product,species,grade,format,destination,min_net_kg,max_net_kg,label_template_code,units_per_box,boxes_per_pallet,rules,active,created_at`)
 if(!spec)return res.status(409).json({ok:false,error:'Esta versión de especificación ya existe'})
 return res.status(201).json({ok:true,spec})
}

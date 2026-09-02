import {requireOperator,type SessionOperator} from './_auth.js'
import {PLANT_IDS,hasPlantAccess} from './_plants.js'
import {getSql} from './_db.js'

declare const process:{env:Record<string,string|undefined>}

type Request={method?:string;body?:unknown;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type Input={action?:unknown;plantId?:unknown;code?:unknown;version?:unknown;name?:unknown;widthMm?:unknown;heightMm?:unknown;barcodeFormat?:unknown;definition?:unknown;packingUnitId?:unknown;productLabelId?:unknown;labelTemplateId?:unknown;printerDeviceId?:unknown;copies?:unknown;idempotencyKey?:unknown;sourceJobId?:unknown}

type PackingRow={id:string;plant_id:string;reception_id:string;packing_unit_code:string;product:string|null;species:string;grade:string|null;format:string|null;gross_kg:string|number|null;tare_kg:string|number|null;net_kg:string|number;packed_at:string}
type TemplateRow={id:string;plant_id:string|null;code:string;version:number;name:string;width_mm:string|number|null;height_mm:string|number|null;barcode_format:string;definition:unknown}
type PrinterRow={id:string;plant_id:string;station_id:string;stable_identifier:string|null;manufacturer:string|null;model:string|null;protocol:string|null}
type LabelRow={id:string;reception_id:string;label_code:string;product:string|null;grade:string|null;lot_code:string|null;net_kg:string|number|null;destination:string|null;packing_format:string|null;process_type:string|null;species:string|null;status:string}

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const codePattern=/^[a-z0-9][a-z0-9-]{1,59}$/
const text=(value:unknown,max=240)=>String(value??'').trim().slice(0,max)
const finite=(value:unknown)=>{if(value==null||value==='')return null;const n=Number(value);return Number.isFinite(n)?n:null}
const positiveInt=(value:unknown,defaultValue=1)=>{const n=Number(value??defaultValue);return Number.isInteger(n)&&n>0?n:null}
const writesEnabled=()=>process.env.PLANT_EXECUTION_WRITES_ENABLED==='true'
const canWrite=(operator:SessionOperator)=>['admin','operations','quality'].includes(operator.role)
const allowedPlants=new Set<string>(PLANT_IDS)
const barcodeFormats=new Set(['none','code128','gs1_128','ean13','qrcode','data_matrix'])
const record=(value:unknown)=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{}
const first=<T,>(rows:unknown)=>Array.isArray(rows)?rows[0] as T|undefined:undefined

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 try{
  if(req.method==='POST'&&!writesEnabled())return res.status(503).json({ok:false,code:'PLANT_EXECUTION_WRITES_DISABLED',error:'Label Engine deshabilitado hasta verificar aislamiento Neon del entorno'})
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  if(req.method==='GET')return list(res,operator)
  if(req.method==='POST')return mutate(req,res,operator)
  res.setHeader('Allow','GET, POST')
  return res.status(405).json({ok:false,error:'Método no permitido'})
 }catch(error){
  const message=error instanceof Error?error.message:''
  const missing=['label_templates','label_print_jobs','packing_units','plant_devices'].some(name=>message.includes(name))
  return res.status(missing?503:500).json({ok:false,error:missing?'Falta aplicar las migraciones Plant Execution 033–034':'No fue posible operar Label Engine'})
 }
}

async function list(res:Response,operator:SessionOperator){
 const sql=getSql(),admin=operator.role==='admin',plantIds=operator.plantIds
 const [templates,jobs]=await Promise.all([
  sql`select id,plant_id,code,version,name,width_mm,height_mm,barcode_format,definition,active,created_at from label_templates where ${admin} or plant_id is null or plant_id=any(${plantIds}::text[]) order by code,version desc`,
  sql`select j.id,j.plant_id,j.packing_unit_id,j.product_label_id,j.label_template_id,j.printer_device_id,j.copies,j.status,j.payload_snapshot,j.idempotency_key,j.source_job_id,j.error_message,j.requested_at,j.sent_at,j.printed_at,j.updated_at,p.packing_unit_code,t.code template_code,t.version template_version,d.stable_identifier printer_identifier from label_print_jobs j join packing_units p on p.id=j.packing_unit_id join label_templates t on t.id=j.label_template_id join plant_devices d on d.id=j.printer_device_id where ${admin} or j.plant_id=any(${plantIds}::text[]) order by j.requested_at desc limit 500`
 ])
 return res.status(200).json({ok:true,writesEnabled:writesEnabled(),templates:Array.isArray(templates)?templates:[],jobs:Array.isArray(jobs)?jobs:[]})
}

async function mutate(req:Request,res:Response,operator:SessionOperator){
 if(!canWrite(operator))return res.status(403).json({ok:false,error:'Acción no autorizada'})
 const input=(req.body??{}) as Input,action=text(input.action,40)
 if(action==='createTemplateVersion')return createTemplateVersion(input,res,operator)
 if(action==='queuePrint')return queuePrint(input,res,operator)
 return res.status(400).json({ok:false,error:'Acción inválida'})
}

async function createTemplateVersion(input:Input,res:Response,operator:SessionOperator){
 const rawPlant=text(input.plantId,50).toLowerCase(),plantId=rawPlant||null,code=text(input.code,60).toLowerCase(),version=positiveInt(input.version,0),name=text(input.name,120),widthMm=finite(input.widthMm),heightMm=finite(input.heightMm),barcodeFormat=text(input.barcodeFormat,30).toLowerCase(),definition=record(input.definition)
 if(plantId&&(!allowedPlants.has(plantId)||!hasPlantAccess(operator,plantId)))return res.status(403).json({ok:false,error:'Planta fuera de alcance'})
 if(!plantId&&operator.role!=='admin')return res.status(403).json({ok:false,error:'Sólo administración puede crear plantillas globales'})
 if(!codePattern.test(code)||!version||name.length<2||!barcodeFormats.has(barcodeFormat))return res.status(400).json({ok:false,error:'Plantilla inválida'})
 if(widthMm!=null&&widthMm<=0||heightMm!=null&&heightMm<=0)return res.status(400).json({ok:false,error:'Dimensiones inválidas'})
 if(Object.keys(definition).length===0)return res.status(400).json({ok:false,error:'La plantilla requiere una definición estructurada'})
 const sql=getSql()
 const saved=first(await sql`insert into label_templates(plant_id,code,version,name,width_mm,height_mm,barcode_format,definition,active,created_by_operator_id) values(${plantId},${code},${version},${name},${widthMm},${heightMm},${barcodeFormat},${JSON.stringify(definition)}::jsonb,true,${operator.id}::uuid) on conflict do nothing returning id,plant_id,code,version,name,width_mm,height_mm,barcode_format,definition,active,created_at`)
 if(!saved)return res.status(409).json({ok:false,error:'Esta versión de plantilla ya existe'})
 return res.status(201).json({ok:true,template:saved})
}

async function queuePrint(input:Input,res:Response,operator:SessionOperator){
 const packingUnitId=text(input.packingUnitId,40),productLabelId=text(input.productLabelId,40),labelTemplateId=text(input.labelTemplateId,40),printerDeviceId=text(input.printerDeviceId,40),sourceJobId=text(input.sourceJobId,40),idempotencyKey=text(input.idempotencyKey,160),copies=positiveInt(input.copies)
 if(!uuid.test(packingUnitId)||!uuid.test(productLabelId)||!uuid.test(labelTemplateId)||!uuid.test(printerDeviceId)||sourceJobId&&!uuid.test(sourceJobId)||!copies||copies>20||idempotencyKey.length<8)return res.status(400).json({ok:false,error:'Solicitud de impresión inválida'})
 const sql=getSql()
 const packing=first<PackingRow>(await sql`select id,plant_id,reception_id,packing_unit_code,product,species,grade,format,gross_kg,tare_kg,net_kg,packed_at from packing_units where id=${packingUnitId}::uuid limit 1`)
 if(!packing||!hasPlantAccess(operator,packing.plant_id))return res.status(404).json({ok:false,error:'Packing unit fuera de alcance'})
 const template=first<TemplateRow>(await sql`select id,plant_id,code,version,name,width_mm,height_mm,barcode_format,definition from label_templates where id=${labelTemplateId}::uuid and active=true limit 1`)
 if(!template||template.plant_id&&template.plant_id!==packing.plant_id)return res.status(409).json({ok:false,error:'Plantilla no disponible para esta planta'})
 const printer=first<PrinterRow>(await sql`select d.id,s.plant_id,d.station_id,d.stable_identifier,d.manufacturer,d.model,d.protocol from plant_devices d join plant_stations s on s.id=d.station_id where d.id=${printerDeviceId}::uuid and d.device_type='printer' and d.active=true and s.active=true limit 1`)
 if(!printer||printer.plant_id!==packing.plant_id)return res.status(409).json({ok:false,error:'Impresora no disponible para esta planta'})
 const label=first<LabelRow>(await sql`select id,reception_id,label_code,product,grade,lot_code,net_kg,destination,packing_format,process_type,species,status from product_labels where id=${productLabelId}::uuid limit 1`)
 if(!label||label.reception_id!==packing.reception_id)return res.status(409).json({ok:false,error:'Etiqueta no corresponde al lote de esta unidad'})
 if(label.status!=='validated')return res.status(409).json({ok:false,error:'Sólo una etiqueta validada puede enviarse a impresión'})
 if(label.species&&label.species.toLowerCase()!==packing.species.toLowerCase())return res.status(409).json({ok:false,error:'Especie de etiqueta no coincide con packing unit'})
 if(label.grade&&packing.grade&&label.grade!==packing.grade)return res.status(409).json({ok:false,error:'Grade de etiqueta no coincide con packing unit'})
 const labelNet=finite(label.net_kg)
 if(labelNet!=null&&Math.abs(labelNet-Number(packing.net_kg))>0.01)return res.status(409).json({ok:false,error:'Peso de etiqueta no coincide con packing unit'})
 if(sourceJobId){
  const source=first<{id:string;plant_id:string;packing_unit_id:string;status:string}>(await sql`select id,plant_id,packing_unit_id,status from label_print_jobs where id=${sourceJobId}::uuid limit 1`)
  if(!source||source.plant_id!==packing.plant_id||source.packing_unit_id!==packing.id||!['printed','reprinted'].includes(source.status))return res.status(409).json({ok:false,error:'Trabajo fuente de reimpresión no corresponde a una impresión confirmada'})
 }
 const payload={packingUnit:{id:packing.id,code:packing.packing_unit_code,product:packing.product,species:packing.species,grade:packing.grade,format:packing.format,grossKg:packing.gross_kg,tareKg:packing.tare_kg,netKg:packing.net_kg,packedAt:packing.packed_at},label,template:{id:template.id,code:template.code,version:template.version,name:template.name,widthMm:template.width_mm,heightMm:template.height_mm,barcodeFormat:template.barcode_format,definition:template.definition},printer:{id:printer.id,identifier:printer.stable_identifier,manufacturer:printer.manufacturer,model:printer.model,protocol:printer.protocol}}
 const existing=first<{id:string;packing_unit_id:string;product_label_id:string|null;label_template_id:string;printer_device_id:string;copies:number;status:string;source_job_id:string|null}>(await sql`select id,packing_unit_id,product_label_id,label_template_id,printer_device_id,copies,status,source_job_id from label_print_jobs where plant_id=${packing.plant_id} and idempotency_key=${idempotencyKey} limit 1`)
 if(existing){
  const same=existing.packing_unit_id===packingUnitId&&existing.product_label_id===productLabelId&&existing.label_template_id===labelTemplateId&&existing.printer_device_id===printerDeviceId&&Number(existing.copies)===copies&&existing.source_job_id===(sourceJobId||null)
  if(!same)return res.status(409).json({ok:false,error:'Idempotency key ya utilizada para otra impresión'})
  return res.status(200).json({ok:true,idempotent:true,job:existing})
 }
 const job=first(await sql`insert into label_print_jobs(plant_id,packing_unit_id,product_label_id,label_template_id,printer_device_id,requested_by_operator_id,copies,status,payload_snapshot,idempotency_key,source_job_id) values(${packing.plant_id},${packingUnitId}::uuid,${productLabelId}::uuid,${labelTemplateId}::uuid,${printerDeviceId}::uuid,${operator.id}::uuid,${copies},'queued',${JSON.stringify(payload)}::jsonb,${idempotencyKey},${sourceJobId||null}::uuid) returning id,plant_id,packing_unit_id,product_label_id,label_template_id,printer_device_id,copies,status,idempotency_key,source_job_id,requested_at`)
 return res.status(201).json({ok:true,idempotent:false,job})
}

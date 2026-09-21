import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'
import {allowClientIp} from './_rate-limit.js'
import {PLANT_IDS} from './_plants.js'
import {EDGE_VISION_BASELINE_CAPABILITIES} from './_edgevision-baseline.js'

type Request={method?:string;body?:unknown;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type Input={plantId?:unknown;capability?:unknown;sourceLabel?:unknown;capturedFrom?:unknown;capturedTo?:unknown;imageCount?:unknown;operatorConfirmedLabels?:unknown;storageRef?:unknown;qaStatus?:unknown;qaNotes?:unknown;id?:unknown}
type BatchRow={id:number;plant_id:string;capability:string;source_label:string;captured_from:string;captured_to:string;image_count:number;operator_confirmed_labels:number;storage_ref:string;qa_status:string;qa_notes:string|null;promoted_at:string|null;created_by:string;created_at:string}
const qaStatuses=['pending_review','validated','rejected'] as const
type QaStatus=(typeof qaStatuses)[number]
const text=(value:unknown,max=500)=>String(value??'').trim().slice(0,max)
const integer=(value:unknown)=>{const raw=Number(value);return Number.isInteger(raw)&&raw>=0?raw:null}
const iso=(value:unknown)=>{const raw=text(value,64),date=new Date(raw);return raw&&!Number.isNaN(date.getTime())?date.toISOString():null}
const capability=(value:unknown)=>{const raw=text(value,40);return (EDGE_VISION_BASELINE_CAPABILITIES as readonly string[]).includes(raw)?raw:null}
const qaStatus=(value:unknown)=>{const raw=text(value,40);return (qaStatuses as readonly string[]).includes(raw as QaStatus)?raw as QaStatus:null}
const first=<T,>(rows:unknown)=>Array.isArray(rows)?rows[0] as T|undefined:undefined
const isMissingTable=(error:unknown)=>error instanceof Error&&error.message.includes('edgevision_dataset_batches')

export default async function handler(req:Request,res:Response){
  res.setHeader('Cache-Control','no-store')
  try{
    const operator=await requireOperator(req,['admin'])
    if(!operator)return res.status(401).json({ok:false,error:'Sesión de administrador requerida'})
    if(!allowClientIp(req,60_000,10))return res.status(429).json({ok:false,error:'Demasiadas solicitudes de datasets EdgeVision por minuto'})
    const sql=getSql()
    if(req.method==='GET'){
      const rows=await sql`select b.id,b.plant_id,b.capability,b.source_label,b.captured_from,b.captured_to,b.image_count,b.operator_confirmed_labels,b.storage_ref,b.qa_status,b.qa_notes,b.promoted_at,b.created_by,b.created_at,o.full_name created_by_name from edgevision_dataset_batches b left join operators o on o.id=b.created_by order by b.id desc limit 200`
      return res.status(200).json({ok:true,items:Array.isArray(rows)?rows:[],plants:[...PLANT_IDS],capabilities:[...EDGE_VISION_BASELINE_CAPABILITIES],qaStatuses:[...qaStatuses]})
    }
    if(req.method==='POST'){
      const input=(req.body??{}) as Input
      const plantId=text(input.plantId,80)
      if(!(PLANT_IDS as readonly string[]).includes(plantId))return res.status(400).json({ok:false,error:'Planta inválida'})
      const cap=capability(input.capability)
      if(!cap)return res.status(400).json({ok:false,error:'Capacidad inválida'})
      const sourceLabel=text(input.sourceLabel,200)
      if(!sourceLabel)return res.status(400).json({ok:false,error:'source_label es requerido'})
      const capturedFrom=iso(input.capturedFrom),capturedTo=iso(input.capturedTo)
      if(!capturedFrom||!capturedTo)return res.status(400).json({ok:false,error:'Ventana de captura inválida'})
      if(capturedTo<capturedFrom)return res.status(400).json({ok:false,error:'La fecha de fin es anterior al inicio'})
      const imageCount=integer(input.imageCount)
      if(imageCount==null)return res.status(400).json({ok:false,error:'image_count debe ser un entero >= 0'})
      const confirmedLabels=integer(input.operatorConfirmedLabels)
      if(confirmedLabels==null)return res.status(400).json({ok:false,error:'operator_confirmed_labels debe ser un entero >= 0'})
      if(confirmedLabels>imageCount)return res.status(400).json({ok:false,error:'Las etiquetas confirmadas no pueden superar el número de imágenes'})
      const storageRef=text(input.storageRef,500)
      if(!storageRef)return res.status(400).json({ok:false,error:'storage_ref es requerido (referencia externa, nunca binario)'})
      const saved=first<BatchRow>(await sql`insert into edgevision_dataset_batches(plant_id,capability,source_label,captured_from,captured_to,image_count,operator_confirmed_labels,storage_ref,created_by) values(${plantId},${cap},${sourceLabel},${capturedFrom}::timestamptz,${capturedTo}::timestamptz,${imageCount},${confirmedLabels},${storageRef},${operator.id}::uuid) returning *`)
      if(!saved)return res.status(500).json({ok:false,error:'No fue posible registrar el lote'})
      return res.status(201).json({ok:true,batch:saved})
    }
    if(req.method==='PATCH'){
      const input=(req.body??{}) as Input
      const id=Number(input.id)
      if(!Number.isInteger(id)||id<=0)return res.status(400).json({ok:false,error:'Lote inválido'})
      const status=qaStatus(input.qaStatus)
      if(!status)return res.status(400).json({ok:false,error:'qa_status inválido'})
      const notes=text(input.qaNotes,2000)
      if(status==='validated'&&notes.length<10)return res.status(400).json({ok:false,error:'Validar un lote exige qa_notes con al menos 10 caracteres'})
      const updated=first<BatchRow>(await sql`update edgevision_dataset_batches set qa_status=${status},qa_notes=${notes||null} where id=${id} returning *`)
      if(!updated)return res.status(404).json({ok:false,error:'Lote no encontrado'})
      return res.status(200).json({ok:true,batch:updated})
    }
    res.setHeader('Allow','GET, POST, PATCH')
    return res.status(405).json({ok:false,error:'Método no permitido'})
  }catch(error){
    console.error('edgevision datasets failed',error)
    if(isMissingTable(error))return res.status(503).json({ok:false,error:'Esquema EdgeVision pendiente de migración (059_edgevision_dataset_batches)'})
    return res.status(500).json({ok:false,error:'No fue posible procesar datasets EdgeVision'})
  }
}

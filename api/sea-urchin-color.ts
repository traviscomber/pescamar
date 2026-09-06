import {createHash} from 'node:crypto'
import {requireOperator,type SessionOperator} from './_auth.js'
import {hasPlantAccess} from './_plants.js'
import {getSql} from './_db.js'
import {findSeaUrchinSeedSample} from './_sea-urchin-seed-set.js'

type Request={method?:string;body?:unknown;headers?:Record<string,string|string[]|undefined>;query?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type Metrics={pixelCount:unknown;rMean:unknown;gMean:unknown;bMean:unknown;lMean:unknown;aMean:unknown;labBMean:unknown;lStd:unknown;aStd:unknown;bStd:unknown;chroma:unknown;hueDeg:unknown}
type Input={action?:unknown;runId?:unknown;captureId?:unknown;fileName?:unknown;mimeType?:unknown;dataBase64?:unknown;captureSource?:unknown;deviceLabel?:unknown;sourceImageSha256?:unknown;metrics?:unknown;grade?:unknown;decision?:unknown;label?:unknown}
type RunScope={id:string;reception_id:string;plant_id:string|null;species:string;grade:string|null;xray_status:string;status:string}
type ReferenceRow={id:string;grade:string;l_mean:number|string;a_mean:number|string;b_mean:number|string}

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const sha256=/^[0-9a-f]{64}$/
const allowedMime=new Set(['image/jpeg','image/png','image/webp'])
const text=(value:unknown,max=500)=>String(value??'').trim().replace(/\s+/g,' ').slice(0,max)
const num=(value:unknown,min:number,max:number)=>{const parsed=Number(value);return Number.isFinite(parsed)&&parsed>=min&&parsed<=max?parsed:null}
const int=(value:unknown,min:number,max:number)=>{const parsed=Number(value);return Number.isInteger(parsed)&&parsed>=min&&parsed<=max?parsed:null}
const canCapture=(operator:SessionOperator)=>['admin','operations','quality'].includes(operator.role)
const canConfirm=(operator:SessionOperator)=>['admin','quality'].includes(operator.role)
const canManageReferences=(operator:SessionOperator)=>['admin','quality'].includes(operator.role)
const visible=(operator:SessionOperator,plantId:unknown)=>operator.role==='admin'||typeof plantId!=='string'||!plantId||hasPlantAccess(operator,plantId)

async function accessibleRun(runId:string,operator:SessionOperator){
 const sql=getSql()
 const rows=await sql`select u.id,u.reception_id,u.grade,u.xray_status,u.status,r.plant_id,r.species from sea_urchin_process_runs u join receptions r on r.id=u.reception_id where u.id=${runId}::uuid limit 1`
 const row=Array.isArray(rows)?rows[0] as RunScope|undefined:undefined
 return row&&visible(operator,row.plant_id)?row:null
}

function parseMetrics(value:unknown){
 const raw=(value??{}) as Partial<Metrics>
 const metrics={
  pixelCount:int(raw.pixelCount,1,5000000),
  rMean:num(raw.rMean,0,255),gMean:num(raw.gMean,0,255),bMean:num(raw.bMean,0,255),
  lMean:num(raw.lMean,0,100),aMean:num(raw.aMean,-150,150),labBMean:num(raw.labBMean,-150,150),
  lStd:num(raw.lStd,0,150),aStd:num(raw.aStd,0,300),bStd:num(raw.bStd,0,300),
  chroma:num(raw.chroma,0,300),hueDeg:num(raw.hueDeg,0,360)
 }
 return Object.values(metrics).some(item=>item==null)?null:metrics as Record<keyof typeof metrics,number>
}

function distance(metrics:{lMean:number;aMean:number;labBMean:number},reference:ReferenceRow){
 return Math.sqrt((metrics.lMean-Number(reference.l_mean))**2+(metrics.aMean-Number(reference.a_mean))**2+(metrics.labBMean-Number(reference.b_mean))**2)
}

function seedSummary(hash:unknown){
 const sample=findSeaUrchinSeedSample(String(hash??''))
 return sample?{photo:sample.photo,cluster:sample.cluster,recommendedUse:sample.recommendedUse,intakeStatus:sample.intakeStatus,officialGrade:sample.officialGrade,sourceLab:sample.lab,sourceDispersion:sample.dispersion,notes:sample.notes}:null
}

async function referencesForPlant(plantId:string){
 const sql=getSql()
 const rows=await sql`select id,plant_id,grade,label,l_mean,a_mean,b_mean,created_by,created_at from sea_urchin_color_references where plant_id=${plantId} and is_active order by grade,created_at desc`
 return Array.isArray(rows)?rows:[]
}

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 try{
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  if(req.method==='GET')return list(req,res,operator)
  if(req.method==='POST')return mutate(req,res,operator)
  res.setHeader('Allow','GET, POST')
  return res.status(405).json({ok:false,error:'Método no permitido'})
 }catch(error){
  const message=error instanceof Error?error.message:''
  const missing=message.includes('sea_urchin_color_')||message.includes('created_by_operator_id')||message.includes('source_image_sha256')
  return res.status(missing?503:500).json({ok:false,error:missing?'Falta aplicar la migración Uni Vision Station':'No fue posible procesar control de color'})
 }
}

async function list(req:Request,res:Response,operator:SessionOperator){
 const raw=Array.isArray(req.query?.runId)?req.query?.runId[0]:req.query?.runId
 const runId=text(raw,40)
 if(!uuid.test(runId))return res.status(400).json({ok:false,error:'Proceso inválido'})
 const run=await accessibleRun(runId,operator)
 if(!run)return res.status(404).json({ok:false,error:'Proceso no disponible'})
 const sql=getSql()
 const [capturesRaw,references]=await Promise.all([
  sql`select c.id,c.run_id,c.evidence_file_id,c.capture_source,c.device_label,c.image_sha256,c.source_image_sha256,c.pixel_count,c.r_mean,c.g_mean,c.b_rgb_mean,c.l_mean,c.a_mean,c.b_mean,c.l_std,c.a_std,c.b_std,c.chroma,c.hue_deg,c.suggested_grade,c.nearest_reference_id,c.delta_e,c.operator_grade,c.decision,c.confirmed_by,c.confirmed_at,c.created_by,c.created_at from sea_urchin_color_captures c where c.run_id=${runId}::uuid order by c.created_at desc limit 30`,
  run.plant_id?referencesForPlant(run.plant_id):Promise.resolve([])
 ])
 const captures=Array.isArray(capturesRaw)?capturesRaw.map(item=>({...item,seedMatch:seedSummary((item as {source_image_sha256?:unknown;image_sha256?:unknown}).source_image_sha256??(item as {image_sha256?:unknown}).image_sha256)})):[]
 const capture=canCapture(operator),confirm=canConfirm(operator)
 return res.status(200).json({ok:true,run:{id:run.id,plantId:run.plant_id,grade:run.grade},captures,references,permissions:{canWrite:capture,canCapture:capture,canConfirm:confirm,canManageReferences:canManageReferences(operator)}})
}

async function mutate(req:Request,res:Response,operator:SessionOperator){
 const input=(req.body??{}) as Input
 const action=text(input.action,40)
 if(action==='capture'){
  if(!canCapture(operator))return res.status(403).json({ok:false,error:'Tu rol no puede registrar evidencia de color'})
  return capture(input,res,operator)
 }
 if(action==='reference'){
  if(!canManageReferences(operator))return res.status(403).json({ok:false,error:'Sólo Calidad o Administración puede fijar referencias'})
  return createReference(input,res,operator)
 }
 if(action==='confirm'){
  if(!canConfirm(operator))return res.status(403).json({ok:false,error:'Sólo Calidad o Administración puede confirmar Color / Grade'})
  return confirmCapture(input,res,operator)
 }
 return res.status(400).json({ok:false,error:'Acción inválida'})
}

async function capture(input:Input,res:Response,operator:SessionOperator){
 const runId=text(input.runId,40),run=uuid.test(runId)?await accessibleRun(runId,operator):null
 if(!run)return res.status(404).json({ok:false,error:'Proceso no disponible'})
 const mimeType=text(input.mimeType,80).toLowerCase(),fileName=text(input.fileName,180)||`erizo-${Date.now()}.jpg`,source=text(input.captureSource,20),deviceLabel=text(input.deviceLabel,180)||null
 const metrics=parseMetrics(input.metrics)
 const sourceImageHash=text(input.sourceImageSha256,64).toLowerCase()||null
 const base64=String(input.dataBase64??'').replace(/^data:[^;]+;base64,/,'').trim()
 if(!metrics||!allowedMime.has(mimeType)||!['camera','upload'].includes(source)||!base64||sourceImageHash&&!sha256.test(sourceImageHash))return res.status(400).json({ok:false,error:'Captura o métricas inválidas'})
 const bytes=Buffer.from(base64,'base64')
 if(bytes.length<100||bytes.length>3*1024*1024)return res.status(400).json({ok:false,error:'La imagen debe pesar entre 100 bytes y 3 MB'})
 const hash=createHash('sha256').update(bytes).digest('hex')
 if(!sha256.test(hash))return res.status(400).json({ok:false,error:'No fue posible validar la imagen'})
 const canonicalSourceHash=sourceImageHash??hash
 const seedMatch=seedSummary(canonicalSourceHash)
 const sql=getSql()
 const duplicate=sourceImageHash
  ?await sql`select id from sea_urchin_color_captures where run_id=${runId}::uuid and (image_sha256=${hash} or source_image_sha256=${sourceImageHash}) limit 1`
  :await sql`select id from sea_urchin_color_captures where run_id=${runId}::uuid and image_sha256=${hash} limit 1`
 if(Array.isArray(duplicate)&&duplicate[0])return res.status(409).json({ok:false,error:'Esta captura ya fue registrada en el lote'})
 const references=run.plant_id?await referencesForPlant(run.plant_id):[]
 let nearest:ReferenceRow|null=null,delta:number|null=null
 for(const item of references as ReferenceRow[]){const candidate=distance(metrics,item);if(delta==null||candidate<delta){delta=candidate;nearest=item}}
 const files=await sql`insert into reception_evidence_files(file_name,mime_type,data_base64,byte_size,created_by,created_by_operator_id) values(${fileName},${mimeType},${base64},${bytes.length},${operator.fullName},${operator.id}::uuid) returning id`
 const file=Array.isArray(files)?files[0] as {id?:string}|undefined:undefined
 if(!file?.id)return res.status(500).json({ok:false,error:'No fue posible guardar evidencia'})
 const saved=await sql`insert into sea_urchin_color_captures(run_id,evidence_file_id,capture_source,device_label,image_sha256,source_image_sha256,pixel_count,r_mean,g_mean,b_rgb_mean,l_mean,a_mean,b_mean,l_std,a_std,b_std,chroma,hue_deg,suggested_grade,nearest_reference_id,delta_e,created_by,created_by_operator_id) values(${runId}::uuid,${file.id}::uuid,${source},${deviceLabel},${hash},${canonicalSourceHash},${metrics.pixelCount},${metrics.rMean},${metrics.gMean},${metrics.bMean},${metrics.lMean},${metrics.aMean},${metrics.labBMean},${metrics.lStd},${metrics.aStd},${metrics.bStd},${metrics.chroma},${metrics.hueDeg},${nearest?.grade??null},${nearest?.id??null}::uuid,${delta},${operator.fullName},${operator.id}::uuid) returning id,evidence_file_id,l_mean,a_mean,b_mean,l_std,a_std,b_std,chroma,hue_deg,suggested_grade,delta_e,decision,created_at`
 const row=Array.isArray(saved)?saved[0]:null
 return res.status(201).json({ok:true,capture:row,evidenceUrl:`/api/reception-evidence-file?id=${encodeURIComponent(file.id)}`,referenceCount:references.length,seedMatch,evidenceSha256:hash,sourceImageSha256:canonicalSourceHash})
}

async function createReference(input:Input,res:Response,operator:SessionOperator){
 if(!canManageReferences(operator))return res.status(403).json({ok:false,error:'Sólo Calidad o Administración puede fijar referencias'})
 const captureId=text(input.captureId,40),grade=text(input.grade,2),label=text(input.label,180)||null
 if(!uuid.test(captureId)||!['A','B','C','D','E'].includes(grade))return res.status(400).json({ok:false,error:'Referencia inválida'})
 const sql=getSql()
 const rows=await sql`select c.id,c.l_mean,c.a_mean,c.b_mean,r.plant_id from sea_urchin_color_captures c join sea_urchin_process_runs u on u.id=c.run_id join receptions r on r.id=u.reception_id where c.id=${captureId}::uuid limit 1`
 const row=Array.isArray(rows)?rows[0] as {id?:string;l_mean?:number|string;a_mean?:number|string;b_mean?:number|string;plant_id?:string|null}|undefined:undefined
 if(!row?.id||!row.plant_id||!visible(operator,row.plant_id))return res.status(404).json({ok:false,error:'Captura no disponible o sin planta'})
 await sql`update sea_urchin_color_references set is_active=false where plant_id=${row.plant_id} and grade=${grade} and is_active`
 const saved=await sql`insert into sea_urchin_color_references(plant_id,grade,label,l_mean,a_mean,b_mean,created_by,created_by_operator_id) values(${row.plant_id},${grade},${label},${Number(row.l_mean)},${Number(row.a_mean)},${Number(row.b_mean)},${operator.fullName},${operator.id}::uuid) returning id,plant_id,grade,label,l_mean,a_mean,b_mean,created_at`
 return res.status(201).json({ok:true,reference:Array.isArray(saved)?saved[0]:null})
}

async function confirmCapture(input:Input,res:Response,operator:SessionOperator){
 if(!canConfirm(operator))return res.status(403).json({ok:false,error:'Sólo Calidad o Administración puede confirmar Color / Grade'})
 const captureId=text(input.captureId,40),decision=text(input.decision,20),grade=text(input.grade,2)||null
 if(!uuid.test(captureId)||!['accepted','review','ng'].includes(decision)||grade&&!['A','B','C','D','E'].includes(grade))return res.status(400).json({ok:false,error:'Confirmación inválida'})
 const sql=getSql()
 const rows=await sql`select c.id,c.run_id,c.l_mean,c.a_mean,c.b_mean,c.suggested_grade,c.delta_e,r.plant_id from sea_urchin_color_captures c join sea_urchin_process_runs u on u.id=c.run_id join receptions r on r.id=u.reception_id where c.id=${captureId}::uuid limit 1`
 const row=Array.isArray(rows)?rows[0] as {id?:string;run_id?:string;l_mean?:number|string;a_mean?:number|string;b_mean?:number|string;suggested_grade?:string|null;delta_e?:number|string|null;plant_id?:string|null}|undefined:undefined
 if(!row?.id||!row.run_id||!visible(operator,row.plant_id))return res.status(404).json({ok:false,error:'Captura no disponible'})
 const colorStatus=decision==='accepted'?'accepted':decision==='ng'?'ng':'review'
 const code=`LAB ${Number(row.l_mean).toFixed(1)}/${Number(row.a_mean).toFixed(1)}/${Number(row.b_mean).toFixed(1)}`
 await sql`update sea_urchin_color_captures set operator_grade=${grade},decision=${decision},confirmed_by=${operator.fullName},confirmed_by_operator_id=${operator.id}::uuid,confirmed_at=now() where id=${captureId}::uuid`
 await sql`update sea_urchin_stage_checks set status=${decision==='accepted'?'ok':decision==='ng'?'hold':'pending'},note=${`Uni Vision ${code}${row.delta_e!=null?` · ΔE ${Number(row.delta_e).toFixed(2)}`:''}${row.suggested_grade?` · sugerido ${row.suggested_grade}`:''}`},checked_by=${operator.fullName},checked_by_operator_id=${operator.id}::uuid,checked_at=now() where run_id=${row.run_id}::uuid and stage='color'`
 await sql`update sea_urchin_process_runs set grade=coalesce(${grade},grade),color_code=${code},color_status=${colorStatus},updated_at=now() where id=${row.run_id}::uuid`
 await sql`update sea_urchin_process_runs u set status=case when u.color_status='ng' or u.xray_status='failed' or exists(select 1 from sea_urchin_stage_checks s where s.run_id=u.id and s.status in ('deviation','hold')) or exists(select 1 from product_labels l where l.reception_id=u.reception_id and l.status in ('mismatch','blocked')) then 'hold' when u.color_status='accepted' and u.xray_status='passed' and u.grade is not null then 'ready_for_packing' else 'in_process' end,updated_at=now() where u.id=${row.run_id}::uuid`
 return res.status(200).json({ok:true,runId:row.run_id,colorCode:code,colorStatus,grade})
}

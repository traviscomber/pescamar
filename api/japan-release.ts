import {requireOperator,type SessionOperator} from './_auth.js'
import {getSql} from './_db.js'
import {JAPAN_MANUAL_GATES,getJapanReleaseState,type JapanManualGateCode} from './_japan-release.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>;query?:Record<string,string|string[]|undefined>;body?:unknown}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type Input={receptionId?:unknown;gateCode?:unknown;status?:unknown;documentRef?:unknown;evidenceUrl?:unknown;note?:unknown;validUntil?:unknown}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const text=(value:unknown,max=1000)=>String(value??'').trim().slice(0,max)
const one=(value:string|string[]|undefined)=>Array.isArray(value)?value[0]:value
const canVerify=(operator:SessionOperator)=>['admin','quality'].includes(operator.role)

async function accessible(receptionId:string,operator:SessionOperator){const admin=operator.role==='admin';const rows=await getSql()`select id,reception_number,plant_id,species from receptions where id=${receptionId}::uuid and (${admin} or plant_id=any(${operator.plantIds}::text[])) limit 1`;return Array.isArray(rows)?rows[0] as Record<string,unknown>|undefined:undefined}

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 try{
  const operator=await requireOperator(req);if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  const receptionId=req.method==='GET'?text(one(req.query?.receptionId),40):text((req.body as Input|undefined)?.receptionId,40)
  if(!uuid.test(receptionId))return res.status(400).json({ok:false,error:'Lote inválido'})
  const reception=await accessible(receptionId,operator);if(!reception)return res.status(404).json({ok:false,error:'Lote fuera de alcance'})
  if(req.method==='GET'){const release=await getJapanReleaseState(receptionId);return res.status(200).json({ok:true,reception,release,permissions:{canVerify:canVerify(operator)}})}
  if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).json({ok:false,error:'Método no permitido'})}
  if(!canVerify(operator))return res.status(403).json({ok:false,error:'Sólo Calidad o Administración pueden verificar requisitos Japón'})
  const input=(req.body??{}) as Input,gateCode=text(input.gateCode,64) as JapanManualGateCode,status=text(input.status,16),documentRef=text(input.documentRef,240)||null,evidenceUrl=text(input.evidenceUrl,1000)||null,note=text(input.note,1000)||null,validUntil=text(input.validUntil,20)||null
  if(!JAPAN_MANUAL_GATES.includes(gateCode)||!['approved','rejected','expired'].includes(status))return res.status(400).json({ok:false,error:'Gate o estado inválido'})
  if(status==='approved'&&!documentRef&&!evidenceUrl)return res.status(400).json({ok:false,error:'Una aprobación requiere documento o evidencia'})
  const sql=getSql()
  if(status==='approved')await sql`update japan_export_release_evidence set status='expired',updated_at=now() where reception_id=${receptionId}::uuid and gate_code=${gateCode} and status='approved'`
  const rows=await sql`insert into japan_export_release_evidence(reception_id,gate_code,status,document_ref,evidence_url,note,valid_until,verified_by_operator_id) values(${receptionId}::uuid,${gateCode},${status},${documentRef},${evidenceUrl},${note},${validUntil}::date,${operator.id}::uuid) returning id,gate_code,status,document_ref,evidence_url,note,valid_until,verified_at`
  const release=await getJapanReleaseState(receptionId)
  return res.status(200).json({ok:true,evidence:Array.isArray(rows)?rows[0]:null,release})
 }catch(error){const message=error instanceof Error?error.message:'';const missing=message.includes('japan_export_release_evidence');return res.status(missing?503:500).json({ok:false,error:missing?'Falta aplicar migración 042 Japan export release gate':'No fue posible evaluar liberación Japón'})}
}

import type {SessionOperator} from './_auth.js'
import {getSql} from './_db.js'

type Row=Record<string,unknown>
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const rows=(value:unknown)=>Array.isArray(value)?value as Row[]:[]
const num=(value:unknown)=>{if(value==null||value==='')return null;const parsed=Number(value);return Number.isFinite(parsed)?parsed:null}
const record=(value:unknown)=>value&&typeof value==='object'&&!Array.isArray(value)?value as Row:null
const text=(value:unknown)=>value==null?null:String(value)

export type LotLifecycleState='open'|'closed'
export type LotLifecycle={
 schemaVersion:'lot.lifecycle.v1'
 available:boolean
 reception:{id:string;receptionNumber:string|number;plantId:string|null;species:string;status:string;qualityStatus:string;acceptedKg:number|null}
 state:LotLifecycleState
 latest:{action:'close'|'reopen';reason:string;occurredAt:string|null;createdBy:string}|null
 gate:{canClose:boolean;blockers:string[];unknowns:string[];rule:'deterministic_operational_close'}
 permissions:{canClose:boolean;canReopen:boolean}
 snapshot:Record<string,unknown>
}

async function lifecycleTableAvailable(){
 const result=await getSql()`select to_regclass('public.lot_lifecycle_events')::text lifecycle_table`
 return Boolean(rows(result)[0]?.lifecycle_table)
}

export async function getLotLifecycle(operator:SessionOperator,receptionId:unknown):Promise<LotLifecycle|null>{
 const id=typeof receptionId==='string'?receptionId.trim():''
 if(!uuid.test(id))return null
 const sql=getSql(),admin=operator.role==='admin'
 const receptionRaw=await sql`select r.id,r.reception_number,r.plant_id,r.species,r.status,r.quality_status,r.accepted_kg,r.received_at,coalesce((select count(*) from reception_evidence e where e.reception_id=r.id),0)::int evidence_count from receptions r where r.id=${id}::uuid and (${admin} or r.plant_id=any(${operator.plantIds}::text[])) limit 1`
 const reception=rows(receptionRaw)[0]
 if(!reception)return null
 const available=await lifecycleTableAvailable()
 const [holdRaw,productionRaw,runRaw]=await Promise.all([
  sql`select count(*)::int count from regulatory_holds where reception_id=${id}::uuid and status in ('open','rejected')`,
  sql`select metrics,occurred_at from lot_events where reception_id=${id}::uuid and event_type='production' order by occurred_at desc limit 1`,
  /eriz|urchin/i.test(String(reception.species??''))?sql`select id,status,grade,color_status,xray_status,output_kg,updated_at from sea_urchin_process_runs where reception_id=${id}::uuid order by updated_at desc limit 1`:Promise.resolve([]),
 ])
 let latest:LotLifecycle['latest']=null
 if(available){
  const latestRaw=await sql`select action,reason,occurred_at,created_by from lot_lifecycle_events where reception_id=${id}::uuid order by occurred_at desc,id desc limit 1`
  const row=rows(latestRaw)[0]
  if(row&&(row.action==='close'||row.action==='reopen'))latest={action:row.action,reason:String(row.reason??''),occurredAt:text(row.occurred_at),createdBy:String(row.created_by??'')}
 }
 const species=String(reception.species??''),isUrchin=/eriz|urchin/i.test(species),qualityStatus=String(reception.quality_status??''),workflowStatus=String(reception.status??''),acceptedKg=num(reception.accepted_kg),activeHolds=Number(rows(holdRaw)[0]?.count??0),production=rows(productionRaw)[0],productionOutput=num(record(production?.metrics)?.outputKg),run=rows(runRaw)[0],evidenceCount=Number(reception.evidence_count??0)
 const blockers:string[]=[],unknowns:string[]=[]
 if(['rejected','cancelled'].includes(workflowStatus))blockers.push(`Workflow terminal: ${workflowStatus}`)
 if(acceptedKg==null||acceptedKg<=0)blockers.push('Faltan kg aceptados confirmados')
 if(activeHolds>0)blockers.push(`${activeHolds} hold${activeHolds===1?'':'s'} regulatorio${activeHolds===1?'':'s'} vigente${activeHolds===1?'':'s'}`)
 if(isUrchin){
  if(!run)blockers.push('Falta proceso de erizo')
  else if(String(run.status??'')!=='closed')blockers.push('Proceso de erizo aún no está cerrado')
 }else{
  if(qualityStatus!=='Clasificado')blockers.push('Calidad aún no está clasificada')
  if(productionOutput==null)blockers.push('Falta salida de producción registrada')
 }
 if(evidenceCount===0)unknowns.push('Sin evidencia adjunta')
 const state:LotLifecycleState=latest?.action==='close'?'closed':'open'
 const roleCanClose=['admin','operations'].includes(operator.role),roleCanReopen=operator.role==='admin'
 const snapshot={workflowStatus,qualityStatus,acceptedKg,activeHolds,evidenceCount,isUrchin,productionOutputKg:productionOutput,urchinRunStatus:run?String(run.status??''):null,urchinGrade:run?.grade??null,urchinColorStatus:run?.color_status??null,urchinXrayStatus:run?.xray_status??null}
 return {schemaVersion:'lot.lifecycle.v1',available,reception:{id,receptionNumber:reception.reception_number as string|number,plantId:text(reception.plant_id),species,status:workflowStatus,qualityStatus,acceptedKg},state,latest,gate:{canClose:available&&state==='open'&&roleCanClose&&blockers.length===0,blockers,unknowns,rule:'deterministic_operational_close'},permissions:{canClose:available&&state==='open'&&roleCanClose,canReopen:available&&state==='closed'&&roleCanReopen},snapshot}
}

export async function recordLotLifecycleAction(operator:SessionOperator,receptionId:unknown,action:unknown,reason:unknown){
 const lifecycle=await getLotLifecycle(operator,receptionId)
 if(!lifecycle)return {status:404 as const,error:'Lote no disponible'}
 if(!lifecycle.available)return {status:503 as const,error:'Falta migración de ciclo de vida del lote'}
 const normalizedAction=action==='close'||action==='reopen'?action:null,normalizedReason=typeof reason==='string'?reason.trim().slice(0,500):''
 if(!normalizedAction||normalizedReason.length<5)return {status:400 as const,error:'Acción o fundamento inválido'}
 if(normalizedAction==='close'){
  if(lifecycle.state==='closed')return {status:200 as const,lifecycle}
  if(!lifecycle.permissions.canClose)return {status:403 as const,error:'Sin permiso para cerrar el lote'}
  if(lifecycle.gate.blockers.length)return {status:409 as const,error:'El lote aún no puede cerrarse',blockers:lifecycle.gate.blockers}
 }else{
  if(lifecycle.state==='open')return {status:200 as const,lifecycle}
  if(!lifecycle.permissions.canReopen)return {status:403 as const,error:'Sólo Admin puede reabrir un lote'}
 }
 const sql=getSql(),snapshot=JSON.stringify({...lifecycle.snapshot,action:normalizedAction,reason:normalizedReason})
 await sql`insert into lot_lifecycle_events(reception_id,action,reason,snapshot,created_by,created_by_operator_id) values (${lifecycle.reception.id}::uuid,${normalizedAction},${normalizedReason},${snapshot}::jsonb,${operator.fullName},${operator.id}::uuid)`
 const updated=await getLotLifecycle(operator,lifecycle.reception.id)
 return {status:201 as const,lifecycle:updated}
}

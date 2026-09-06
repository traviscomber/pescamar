import type {SessionOperator} from './_auth.js'
import {getSql} from './_db.js'
import {buildSeaUrchinCopilotEvidence} from './_copilot-sea-urchin.js'
import type {CopilotSource} from './_copilot-context.js'

type Row=Record<string,unknown>
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const rows=(value:unknown)=>Array.isArray(value)?value as Row[]:[]
const num=(value:unknown)=>{if(value==null||value==='')return null;const parsed=Number(value);return Number.isFinite(parsed)?parsed:null}
const text=(value:unknown)=>value==null?null:String(value)
const record=(value:unknown)=>value&&typeof value==='object'&&!Array.isArray(value)?value as Row:null
const strings=(value:unknown)=>Array.isArray(value)?value.flatMap(item=>typeof item==='string'&&item.trim()?[item.trim()]:[]):[] as string[]

export type LotControlTone='ready'|'attention'|'pending'|'info'
export type LotControlCard={
 schemaVersion:'lot.control.v1'
 reception:{id:string;receptionNumber:string|number;plantId:string|null;species:string;supplier:string;qualityStatus:string;status:string;receivedAt:string|null}
 state:{code:string;label:string;tone:LotControlTone}
 blocker:string|null
 blockers:string[]
 nextAction:string
 nextRoute:string
 signals:{quality:{label:string;detail:string|null;tone:LotControlTone};balance:{inputKg:number|null;outputKg:number|null;yieldPct:number|null;lossKg:number|null;tone:LotControlTone};release:{label:string;tone:LotControlTone;kind:'japan'|'evidence'}}
 evidence:{count:number}
 diagnosis:{state:'attention'|'clear';blockers:string[];nextAction:string;unknowns:string[];rule:'deterministic_read_only'}
 source:CopilotSource
}

function routeForNext(nextAction:string,isUrchin:boolean,receptionId:string){
 const value=nextAction.toLocaleLowerCase('es-CL'),query=`?receptionId=${encodeURIComponent(receptionId)}`
 if(/fr[ií]o|temperat/.test(value))return `/frio${query}`
 if(/etiquet/.test(value))return `/etiquetas${query}`
 if(/pallet/.test(value))return `/pallets${query}`
 if(/packing|empaque|caja/.test(value))return `/floor${query}`
 if(/regulator|sernapesca|jap[oó]n|export|hold/.test(value))return `/control-regulatorio${query}`
 if(/despach/.test(value))return `/despachos-ventas${query}`
 if(isUrchin&&/color|grade|xray|rayos|proceso|calidad|process run|digital twin/.test(value))return `/proceso-erizo/detalle${query}`
 return `/recepciones${query}&action=1`
}

export async function buildLotControlCard(operator:SessionOperator,receptionId:unknown):Promise<LotControlCard|null>{
 const id=typeof receptionId==='string'?receptionId.trim():''
 if(!uuid.test(id))return null
 const sql=getSql(),admin=operator.role==='admin'
 const receptionRaw=await sql`select r.id,r.reception_number,r.plant_id,r.species,r.status,r.quality_status,r.accepted_kg,r.received_at,p.legal_name supplier,coalesce((select count(*) from reception_evidence e where e.reception_id=r.id),0)::int evidence_count from receptions r join parties p on p.id=r.supplier_id where r.id=${id}::uuid and (${admin} or r.plant_id=any(${operator.plantIds}::text[])) limit 1`
 const reception=rows(receptionRaw)[0]
 if(!reception)return null
 const [eventRaw,holdRaw,dispatchRaw]=await Promise.all([
  sql`select event_type,metrics,occurred_at from lot_events where reception_id=${id}::uuid order by occurred_at desc`,
  sql`select status,authority,reason,opened_at,resolved_at from regulatory_holds where reception_id=${id}::uuid order by opened_at desc`,
  sql`select status,dispatched_kg,dispatched_at from lot_dispatches where reception_id=${id}::uuid order by dispatched_at desc`,
 ])
 const events=rows(eventRaw),holds=rows(holdRaw),dispatches=rows(dispatchRaw),qualityStatus=String(reception.quality_status??''),species=String(reception.species??''),isUrchin=/eriz|urchin/i.test(species)
 const latestProduction=events.find(event=>event.event_type==='production'&&num(record(event.metrics)?.outputKg)!=null),inputKg=num(reception.accepted_kg),outputKg=latestProduction?num(record(latestProduction.metrics)?.outputKg):null,yieldPct=inputKg!=null&&inputKg>0&&outputKg!=null?Number((outputKg/inputKg*100).toFixed(2)):null,lossKg=inputKg!=null&&outputKg!=null?Math.max(0,inputKg-outputKg):null
 const activeHolds=holds.filter(row=>['open','rejected'].includes(String(row.status??''))),confirmedDispatches=dispatches.filter(row=>String(row.status)==='confirmed')
 let blockers:string[]=[],unknowns:string[]=[],nextAction='',state:{code:string;label:string;tone:LotControlTone},release:{label:string;tone:LotControlTone;kind:'japan'|'evidence'}
 let erizo:Awaited<ReturnType<typeof buildSeaUrchinCopilotEvidence>>|null=null
 if(isUrchin){try{erizo=await buildSeaUrchinCopilotEvidence(operator,id)}catch{erizo=null}}
 const erizoData=record(erizo?.data),erizoDiagnosis=record(erizoData?.diagnosis),erizoJapan=record(erizoData?.japan),erizoProcess=record(erizoData?.process)
 if(isUrchin&&erizoData&&erizoDiagnosis){
  blockers=strings(erizoDiagnosis.blockers)
  unknowns=strings(erizoDiagnosis.unknowns)
  nextAction=typeof erizoDiagnosis.nextAction==='string'?erizoDiagnosis.nextAction:'Revisar Digital Twin del lote.'
  const japanReleasable=erizoJapan?.releasable===true
  const japanKnown=erizoJapan!=null
  state=japanReleasable?{code:'japan_ready',label:'APTO JAPÓN',tone:'ready'}:japanKnown?{code:'japan_hold',label:'NO LIBERADO JAPÓN',tone:'attention'}:blockers.length?{code:'attention',label:'REQUIERE ATENCIÓN',tone:'attention'}:{code:'in_process',label:'LOTE EN CURSO',tone:'info'}
  release={label:japanReleasable?'PASS':japanKnown?'HOLD':'—',tone:japanReleasable?'ready':japanKnown?'attention':'pending',kind:'japan'}
 }else if(isUrchin){
  blockers=['Digital Twin de erizo no disponible']
  unknowns=['Estado especializado de proceso y Japan Release no disponible']
  state={code:'urchin_control_unavailable',label:'NO LIBERADO JAPÓN',tone:'attention'}
  nextAction='Revisar proceso de erizo y evidencia antes de continuar.'
  release={label:'HOLD',tone:'attention',kind:'japan'}
 }else{
  if(activeHolds.length)blockers.push(`${activeHolds.length} hold${activeHolds.length===1?'':'s'} regulatorio${activeHolds.length===1?'':'s'} vigente${activeHolds.length===1?'':'s'}`)
  if(qualityStatus==='Revisión'||qualityStatus==='Alerta calibre')blockers.push(`Calidad: ${qualityStatus}`)
  else if(qualityStatus!=='Clasificado')blockers.push('Falta clasificación de Calidad')
  if(inputKg==null)unknowns.push('Kg aceptados no confirmados')
  if(outputKg==null)unknowns.push('Sin salida de producción registrada')
  if(Number(reception.evidence_count??0)===0)unknowns.push('Sin evidencia adjunta')
  if(activeHolds.length){state={code:'regulatory_hold',label:'REQUIERE CONTROL',tone:'attention'};nextAction='Resolver hold regulatorio con fundamento y evidencia.'}
  else if(qualityStatus==='Revisión'||qualityStatus==='Alerta calibre'){state={code:'quality_attention',label:'REQUIERE CALIDAD',tone:'attention'};nextAction='Resolver criterio de Calidad y registrar la decisión.'}
  else if(qualityStatus!=='Clasificado'){state={code:'quality_pending',label:'PENDIENTE DE CALIDAD',tone:'pending'};nextAction='Completar clasificación de Calidad.'}
  else if(outputKg==null){state={code:'production_ready',label:'LISTO PARA PRODUCCIÓN',tone:'ready'};nextAction='Registrar producción del lote.'}
  else if(confirmedDispatches.length){state={code:'dispatch_recorded',label:'DESPACHO REGISTRADO',tone:'info'};nextAction='Revisar saldo físico y cierre comercial del lote.'}
  else{state={code:'in_process',label:'LOTE EN CURSO',tone:'info'};nextAction='Continuar packing, inventario o despacho según el plan.'}
  release={label:`${Number(reception.evidence_count??0)}`,tone:Number(reception.evidence_count??0)>0?'info':'pending',kind:'evidence'}
 }
 const blocker=blockers[0]??null,qualityTone:LotControlTone=qualityStatus==='Clasificado'?'ready':qualityStatus==='Revisión'||qualityStatus==='Alerta calibre'?'attention':'pending',balanceTone:LotControlTone=yieldPct==null?'pending':'info',grade=text(erizoProcess?.grade),colorStatus=text(erizoProcess?.colorStatus)
 const qualityLabel=grade?`Grade ${grade}`:qualityStatus||'—',qualityDetail=grade?(colorStatus?`Color ${colorStatus}`:qualityStatus):qualityStatus||null
 return {
  schemaVersion:'lot.control.v1',
  reception:{id,receptionNumber:reception.reception_number as string|number,plantId:text(reception.plant_id),species,supplier:String(reception.supplier??''),qualityStatus,status:String(reception.status??''),receivedAt:text(reception.received_at)},
  state,
  blocker,
  blockers,
  nextAction,
  nextRoute:routeForNext(nextAction,isUrchin,id),
  signals:{quality:{label:qualityLabel,detail:qualityDetail,tone:qualityTone},balance:{inputKg,outputKg,yieldPct,lossKg,tone:balanceTone},release},
  evidence:{count:Number(reception.evidence_count??0)},
  diagnosis:{state:blockers.length?'attention':'clear',blockers,nextAction,unknowns,rule:'deterministic_read_only'},
  source:{id:'lot_control',label:`Lot Control · REC-${String(reception.reception_number??'')}`,path:`/lotes/${encodeURIComponent(id)}`,rows:1,freshness:text(latestProduction?.occurred_at)??text(reception.received_at)},
 }
}

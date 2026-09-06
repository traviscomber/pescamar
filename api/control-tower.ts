import {requireOperator,type SessionOperator} from './_auth.js'
import {getSql} from './_db.js'
import {buildLotControlCard,type LotControlCard,type LotControlTone} from './_lot-control-card.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>;query?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type Row={id?:unknown;received_at?:unknown}
type Priority='critical'|'today'|'follow_up'

const MAX_EVALUATED=40
const rows=(value:unknown)=>Array.isArray(value)?value as Row[]:[]
const text=(value:unknown)=>value==null?null:String(value)

function baseScore(card:LotControlCard){
 const code=card.state.code
 const byCode:Record<string,number>={
  urchin_control_unavailable:1000,
  regulatory_hold:960,
  japan_hold:930,
  quality_attention:860,
  attention:830,
  quality_pending:720,
  production_ready:620,
  in_process:430,
  dispatch_recorded:320,
  japan_ready:240,
 }
 const byTone:Record<LotControlTone,number>={attention:800,pending:650,info:350,ready:250}
 return byCode[code]??byTone[card.state.tone]
}

function priorityFor(score:number):Priority{return score>=800?'critical':score>=600?'today':'follow_up'}
function score(card:LotControlCard){return baseScore(card)+Math.min(card.blockers.length,5)*18+Math.min(card.diagnosis.unknowns.length,5)*6}

async function accessibleLiveReceptionIds(operator:SessionOperator,plantId:string|null){
 const sql=getSql(),admin=operator.role==='admin'
 const scopePlant=plantId&&((admin)||operator.plantIds.includes(plantId))?plantId:null
 if(plantId&&!scopePlant)return []
 const result=scopePlant
  ?await sql`select id,received_at from receptions where status not in ('rejected','cancelled') and plant_id=${scopePlant} order by received_at desc nulls last limit ${MAX_EVALUATED}`
  :await sql`select id,received_at from receptions where status not in ('rejected','cancelled') and (${admin} or plant_id=any(${operator.plantIds}::text[])) order by received_at desc nulls last limit ${MAX_EVALUATED}`
 return rows(result).flatMap(row=>typeof row.id==='string'?[row.id]:[])
}

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
 try{
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  const rawPlant=Array.isArray(req.query?.plantId)?req.query?.plantId[0]:req.query?.plantId
  const plantId=typeof rawPlant==='string'&&rawPlant.trim()?rawPlant.trim():null
  const ids=await accessibleLiveReceptionIds(operator,plantId)
  const settled=await Promise.allSettled(ids.map(id=>buildLotControlCard(operator,id)))
  const cards=settled.flatMap(result=>result.status==='fulfilled'&&result.value?[result.value]:[])
  const ranked=cards.map(card=>{const value=score(card);return {card,score:value,priority:priorityFor(value)}}).sort((a,b)=>b.score-a.score||String(b.card.reception.receivedAt??'').localeCompare(String(a.card.reception.receivedAt??'')))
  const attention=cards.filter(card=>card.state.tone==='attention'||card.blockers.length>0).length
  const pending=cards.filter(card=>card.state.tone==='pending'&&card.blockers.length===0).length
  const items=ranked.slice(0,3).map(({card,score:rankScore,priority})=>({
   receptionId:card.reception.id,
   receptionNumber:card.reception.receptionNumber,
   plantId:card.reception.plantId,
   supplier:card.reception.supplier,
   species:card.reception.species,
   state:card.state,
   priority,
   score:rankScore,
   problem:card.state.label,
   why:card.blocker??card.diagnosis.unknowns[0]??'Sin bloqueo visible; corresponde continuar el siguiente paso operacional.',
   nextAction:card.nextAction,
   nextRoute:card.nextRoute,
   quality:card.signals.quality,
   balance:card.signals.balance,
   release:card.signals.release,
  }))
  return res.status(200).json({ok:true,schemaVersion:'control.tower.v1',scope:{plantId,role:operator.role},summary:{live:cards.length,attention,pending,clear:Math.max(0,cards.length-attention-pending),evaluated:ids.length,failed:ids.length-cards.length,limit:MAX_EVALUATED},items,generatedAt:new Date().toISOString()})
 }catch(error){
  console.error('control_tower_error',error instanceof Error?error.message:'unknown')
  return res.status(500).json({ok:false,error:'No fue posible construir el Control Tower'})
 }
}

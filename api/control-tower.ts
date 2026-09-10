import {requireOperator,type SessionOperator} from './_auth.js'
import {getSql} from './_db.js'
import {buildLotControlCard,type LotControlCard,type LotControlTone} from './_lot-control-card.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>;query?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type Row={id?:unknown;received_at?:unknown}
type Priority='critical'|'today'|'follow_up'
type GradeARow={open_orders?:unknown;committed_kg?:unknown;allocated_kg?:unknown;order_shortfall_kg?:unknown;sold_lots?:unknown;economic_complete_lots?:unknown;known_contribution_clp?:unknown;top_supplier?:unknown;top_supplier_contribution_per_kg?:unknown}

const MAX_EVALUATED=40
const rows=(value:unknown)=>Array.isArray(value)?value as Row[]:[]
const n=(value:unknown)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:0}
const nullable=(value:unknown)=>{if(value==null||value==='')return null;const parsed=Number(value);return Number.isFinite(parsed)?parsed:null}
const round=(value:number,digits=1)=>Number(value.toFixed(digits))

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
  closed:0,
 }
 const byTone:Record<LotControlTone,number>={attention:800,pending:650,info:350,ready:250}
 return byCode[code]??byTone[card.state.tone]
}

function priorityFor(score:number):Priority{return score>=800?'critical':score>=600?'today':'follow_up'}
function score(card:LotControlCard){return baseScore(card)+Math.min(card.blockers.length,5)*18+Math.min(card.diagnosis.unknowns.length,5)*6}

async function accessibleReceptionIds(operator:SessionOperator,plantId:string|null){
 const sql=getSql(),admin=operator.role==='admin'
 const scopePlant=plantId&&((admin)||operator.plantIds.includes(plantId))?plantId:null
 if(plantId&&!scopePlant)return []
 const result=scopePlant
  ?await sql`select id,received_at from receptions where status not in ('rejected','cancelled') and plant_id=${scopePlant} order by received_at desc nulls last limit ${MAX_EVALUATED}`
  :await sql`select id,received_at from receptions where status not in ('rejected','cancelled') and (${admin} or plant_id=any(${operator.plantIds}::text[])) order by received_at desc nulls last limit ${MAX_EVALUATED}`
 return rows(result).flatMap(row=>typeof row.id==='string'?[row.id]:[])
}

async function buildGradeADecisionSummary(operator:SessionOperator,plantId:string|null){
 const sql=getSql(),admin=operator.role==='admin',plantIds=operator.plantIds
 const raw=await sql`with scoped_receptions as (
    select r.id,r.supplier_id,r.plant_id
    from receptions r
    where (${admin} or r.plant_id=any(${plantIds}::text[])) and (${plantId}::text is null or r.plant_id=${plantId})
   ),order_base as (
    select o.id,o.committed_kg,coalesce((select sum(a.allocated_kg) from sales_order_allocations a where a.order_id=o.id),0) allocated_kg
    from sales_orders o
    where o.status in ('pending','prepared') and (${admin} or o.plant_id=any(${plantIds}::text[])) and (${plantId}::text is null or o.plant_id=${plantId})
   ),order_stats as (
    select count(*)::int open_orders,coalesce(sum(committed_kg),0) committed_kg,coalesce(sum(allocated_kg),0) allocated_kg,
     coalesce(sum(greatest(committed_kg-allocated_kg,0)),0) order_shortfall_kg
    from order_base
   ),sold as (
    select sr.id reception_id,sr.supplier_id,sum(s.sold_kg) sold_kg,sum(s.sold_kg*s.price_per_kg_clp) revenue_clp
    from scoped_receptions sr join lot_sales s on s.reception_id=sr.id and s.status='confirmed'
    group by sr.id,sr.supplier_id
   ),economic as (
    select s.*,st.gross_amount_clp purchase_cost_clp,tc.transformation_cost_clp,
     st.gross_amount_clp is not null and tc.transformation_cost_clp is not null economic_complete,
     case when st.gross_amount_clp is not null and tc.transformation_cost_clp is not null then s.revenue_clp-st.gross_amount_clp-tc.transformation_cost_clp end contribution_clp
    from sold s
    left join lateral(select gross_amount_clp from settlements x where x.reception_id=s.reception_id and x.status in ('approved','pending','draft') order by x.created_at desc limit 1)st on true
    left join lateral(select sum(amount_clp) transformation_cost_clp from transformation_costs x where x.reception_id=s.reception_id having count(*)>0)tc on true
   ),economic_stats as (
    select count(*)::int sold_lots,count(*) filter(where economic_complete)::int economic_complete_lots,
     sum(contribution_clp) filter(where economic_complete) known_contribution_clp
    from economic
   ),supplier_rank as (
    select e.supplier_id,p.legal_name supplier,sum(e.contribution_clp)/nullif(sum(e.sold_kg),0) contribution_per_kg
    from economic e join parties p on p.id=e.supplier_id
    where e.economic_complete
    group by e.supplier_id,p.legal_name
    having sum(e.sold_kg)>0
    order by contribution_per_kg desc nulls last
    limit 1
   )
   select os.*,es.*,sr.supplier top_supplier,sr.contribution_per_kg top_supplier_contribution_per_kg
   from order_stats os cross join economic_stats es left join supplier_rank sr on true`
 const row=((Array.isArray(raw)?raw:[]) as GradeARow[])[0]??{}
 const openOrders=n(row.open_orders),committedKg=n(row.committed_kg),allocatedKg=n(row.allocated_kg),shortfallKg=n(row.order_shortfall_kg)
 const soldLots=n(row.sold_lots),completeLots=n(row.economic_complete_lots),knownContributionClp=nullable(row.known_contribution_clp)
 const orderCoveragePct=committedKg>0?round(Math.min(100,allocatedKg/committedKg*100)):openOrders===0?100:null
 const economicCoveragePct=soldLots>0?round(completeLots/soldLots*100):null
 const economicComplete=soldLots>0&&completeLots===soldLots
 return {
  schemaVersion:'seafood.grade-a.decision.v1',
  orderCoverage:{openOrders,committedKg:round(committedKg,2),allocatedKg:round(allocatedKg,2),shortfallKg:round(shortfallKg,2),coveragePct:orderCoveragePct,confidence:committedKg>0?'observed':openOrders===0?'observed':'needs-human-validation'},
  economics:{soldLots,economicCompleteLots:completeLots,coveragePct:economicCoveragePct,knownContributionClp,economicComplete,confidence:soldLots===0?'needs-human-validation':economicComplete?'observed':'derived',rule:'unknown_is_not_zero'},
  supplierSignal:row.top_supplier?{supplier:String(row.top_supplier),contributionPerSoldKgClp:nullable(row.top_supplier_contribution_per_kg),confidence:'derived' as const,rule:'Sólo lotes live con venta confirmada, liquidación y costo de transformación conocidos.'}:null,
  boundary:{predictive:false,rule:'Control Tower resume evidencia live y métricas derivadas. No proyecta demanda, capacidad, margen futuro ni rendimiento sin baseline y capacidad validados.'},
 }
}

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
 try{
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  const rawPlant=Array.isArray(req.query?.plantId)?req.query?.plantId[0]:req.query?.plantId
  const plantId=typeof rawPlant==='string'&&rawPlant.trim()?rawPlant.trim():null
  const [ids,gradeA]=await Promise.all([accessibleReceptionIds(operator,plantId),buildGradeADecisionSummary(operator,plantId)])
  const settled=await Promise.allSettled(ids.map(id=>buildLotControlCard(operator,id)))
  const evaluatedCards=settled.flatMap(result=>result.status==='fulfilled'&&result.value?[result.value]:[])
  const closed=evaluatedCards.filter(card=>card.lifecycle.state==='closed').length
  const cards=evaluatedCards.filter(card=>card.lifecycle.state!=='closed')
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
  return res.status(200).json({ok:true,schemaVersion:'control.tower.v3',scope:{plantId,role:operator.role},summary:{live:cards.length,closed,attention,pending,clear:Math.max(0,cards.length-attention-pending),evaluated:ids.length,failed:ids.length-evaluatedCards.length,limit:MAX_EVALUATED},gradeA,items,generatedAt:new Date().toISOString()})
 }catch(error){
  console.error('control_tower_error',error instanceof Error?error.message:'unknown')
  return res.status(500).json({ok:false,error:'No fue posible construir el Control Tower'})
 }
}

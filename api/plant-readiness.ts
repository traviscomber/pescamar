import {requireOperator,type SessionOperator} from './_auth.js'
import {allowedPlantIds} from './_plants.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type MetricRow={plant_id:string|null;count:string|number;last_at?:string|null}
type OperatorRow={plant_id:string;role:string;count:string|number;credentials:string|number}
type InventoryRow={plant_id:string|null;kg:string|number}
type CloseDayRow={plant_id:string|null;operating_date:string|Date}
type UatState='blocked'|'in_progress'|'ready_for_human_uat'
type LiveReadinessState='uat_incomplete'|'continuity_pending'|'ready_for_human_live_review'
const ids=['ancud','quellon','iquique','piedra-azul','aqua-austral','natales'] as const
const n=(value:unknown)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:0}
const byPlant=(rows:MetricRow[])=>new Map(rows.filter(row=>row.plant_id).map(row=>[row.plant_id as string,{count:n(row.count),lastAt:row.last_at??null}]))
const inventoryMap=(rows:InventoryRow[])=>new Map(rows.filter(row=>row.plant_id).map(row=>[row.plant_id as string,n(row.kg)]))
function visible(operator:SessionOperator,id:string){return operator.role==='admin'||allowedPlantIds(operator).includes(id as never)}
function roleMap(rows:OperatorRow[]){const map=new Map<string,Map<string,{active:number;credentials:number}>>();for(const row of rows){const plant=map.get(row.plant_id)??new Map();plant.set(row.role,{active:n(row.count),credentials:n(row.credentials)});map.set(row.plant_id,plant)}return map}
function closeDayMap(rows:CloseDayRow[]){const map=new Map<string,string[]>();for(const row of rows){if(!row.plant_id)continue;const date=String(row.operating_date).slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(date))continue;const dates=map.get(row.plant_id)??[];if(!dates.includes(date))dates.push(date);map.set(row.plant_id,dates)}for(const dates of map.values())dates.sort((a,b)=>b.localeCompare(a));return map}
function consecutiveDays(dates:string[]){if(!dates.length)return 0;let streak=1;for(let index=1;index<dates.length;index++){const previous=Date.parse(`${dates[index-1]}T00:00:00Z`),current=Date.parse(`${dates[index]}T00:00:00Z`);if(previous-current!==86400000)break;streak++}return streak}

export default async function handler(req:Request,res:Response){
  res.setHeader('Cache-Control','no-store')
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
  try{
    const operator=await requireOperator(req)
    if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
    const sql=getSql()
    const [operatorsRaw,receptionsRaw,evidenceRaw,qualityRaw,productionRaw,inventoryRaw,ordersRaw,dispatchesRaw,salesRaw,closesRaw,closeDaysRaw,endToEndRaw]=await Promise.all([
      sql`select plant_id,o.role,count(distinct o.id)::int count,count(distinct o.id) filter(where o.password_hash is not null)::int credentials from operators o cross join lateral unnest(o.plant_ids) plant_id where o.active=true group by plant_id,o.role`,
      sql`select plant_id,count(*) count,max(received_at) last_at from receptions group by plant_id`,
      sql`select r.plant_id,count(distinct e.reception_id) count,max(e.created_at) last_at from reception_evidence e join receptions r on r.id=e.reception_id group by r.plant_id`,
      sql`select r.plant_id,count(distinct le.reception_id) count,max(le.occurred_at) last_at from lot_events le join receptions r on r.id=le.reception_id where le.event_type='quality' group by r.plant_id`,
      sql`select r.plant_id,count(distinct le.reception_id) count,max(le.occurred_at) last_at from lot_events le join receptions r on r.id=le.reception_id where le.event_type='production' group by r.plant_id`,
      sql`select r.plant_id,coalesce(sum(case when im.to_location_id is not null then im.moved_kg else 0 end)-sum(case when im.from_location_id is not null then im.moved_kg else 0 end),0) kg from receptions r left join inventory_movements im on im.reception_id=r.id group by r.plant_id`,
      sql`select plant_id,count(*) count,max(created_at) last_at from sales_orders group by plant_id`,
      sql`select r.plant_id,count(*) count,max(d.dispatched_at) last_at from lot_dispatches d join receptions r on r.id=d.reception_id where d.status='confirmed' group by r.plant_id`,
      sql`select r.plant_id,count(*) count,max(s.sold_at) last_at from lot_sales s join receptions r on r.id=s.reception_id where s.status='confirmed' group by r.plant_id`,
      sql`select plant_id,count(*) count,max(generated_at) last_at from daily_closes where plant_id is not null group by plant_id`,
      sql`select plant_id,generated_at::date operating_date from daily_closes where plant_id is not null group by plant_id,generated_at::date order by plant_id,operating_date desc`,
      sql`select r.plant_id,count(*)::int count,max(r.received_at) last_at from receptions r where
        exists(select 1 from reception_evidence e where e.reception_id=r.id)
        and exists(select 1 from lot_events q where q.reception_id=r.id and q.event_type='quality')
        and exists(select 1 from lot_events p where p.reception_id=r.id and p.event_type='production')
        and exists(select 1 from inventory_movements im where im.reception_id=r.id and im.to_location_id is not null and im.moved_kg>0)
        and (
          exists(select 1 from sales_order_allocations a join sales_orders o on o.id=a.order_id where a.reception_id=r.id and o.status<>'cancelled')
          or exists(select 1 from lot_dispatches d where d.reception_id=r.id and d.status='confirmed')
          or exists(select 1 from lot_sales s where s.reception_id=r.id and s.status='confirmed')
        )
        group by r.plant_id`
    ])
    const roles=roleMap((Array.isArray(operatorsRaw)?operatorsRaw:[]) as OperatorRow[]),receptions=byPlant((Array.isArray(receptionsRaw)?receptionsRaw:[]) as MetricRow[]),evidence=byPlant((Array.isArray(evidenceRaw)?evidenceRaw:[]) as MetricRow[]),quality=byPlant((Array.isArray(qualityRaw)?qualityRaw:[]) as MetricRow[]),production=byPlant((Array.isArray(productionRaw)?productionRaw:[]) as MetricRow[]),inventory=inventoryMap((Array.isArray(inventoryRaw)?inventoryRaw:[]) as InventoryRow[]),orders=byPlant((Array.isArray(ordersRaw)?ordersRaw:[]) as MetricRow[]),dispatches=byPlant((Array.isArray(dispatchesRaw)?dispatchesRaw:[]) as MetricRow[]),sales=byPlant((Array.isArray(salesRaw)?salesRaw:[]) as MetricRow[]),closes=byPlant((Array.isArray(closesRaw)?closesRaw:[]) as MetricRow[]),closeDays=closeDayMap((Array.isArray(closeDaysRaw)?closeDaysRaw:[]) as CloseDayRow[]),endToEnd=byPlant((Array.isArray(endToEndRaw)?endToEndRaw:[]) as MetricRow[])
    const plants=ids.filter(id=>visible(operator,id)).map(id=>{
      const role=roles.get(id)??new Map<string,{active:number;credentials:number}>(),ops=role.get('operations')??{active:0,credentials:0},qa=role.get('quality')??{active:0,credentials:0},viewer=role.get('viewer')??{active:0,credentials:0}
      const users=[...role.values()].reduce((sum,item)=>sum+item.active,0),rec=receptions.get(id)?.count??0,ev=evidence.get(id)?.count??0,q=quality.get(id)?.count??0,p=production.get(id)?.count??0,inv=inventory.get(id)??0,commercial=(orders.get(id)?.count??0)+(dispatches.get(id)?.count??0)+(sales.get(id)?.count??0),linked=endToEnd.get(id)?.count??0,close=closes.get(id)?.count??0,distinctCloseDays=closeDays.get(id)?.length??0,consecutiveCloseDays=consecutiveDays(closeDays.get(id)??[])
      const checks=[
        {key:'operations-role',label:'Operaciones con credenciales',complete:ops.credentials>0,detail:ops.credentials?`${ops.credentials} usuario(s) Operaciones listo(s)`:'Falta usuario Operaciones activo con credenciales'},
        {key:'quality-role',label:'Calidad con credenciales',complete:qa.credentials>0,detail:qa.credentials?`${qa.credentials} usuario(s) Calidad listo(s)`:'Falta usuario Calidad activo con credenciales'},
        {key:'receptions',label:'Recepción real',complete:rec>0,detail:rec?`${rec} recepciones`:'Sin recepciones vivas'},
        {key:'evidence',label:'Evidencia documental',complete:rec>0&&ev>0,detail:ev?`${ev} lotes con evidencia`:'Sin evidencia viva'},
        {key:'quality',label:'Control de calidad',complete:rec>0&&q>0,detail:q?`${q} lotes controlados`:'Sin controles vivos'},
        {key:'production',label:'Producción trazada',complete:rec>0&&p>0,detail:p?`${p} lotes producidos`:'Sin producción viva'},
        {key:'inventory',label:'Inventario ubicado',complete:inv>0,detail:inv?`${inv.toLocaleString('es-CL',{maximumFractionDigits:1})} kg`:'Sin posición física ubicada'},
        {key:'commercial',label:'Flujo comercial',complete:commercial>0,detail:commercial?`${commercial} eventos/órdenes`:'Sin orden, despacho ni venta'},
        {key:'linked-e2e',label:'Flujo E2E en un mismo lote',complete:linked>0,detail:linked?`${linked} lote(s) conectan evidencia → calidad → producción → inventario → comercial`:'Hay que completar toda la cadena sobre al menos un mismo lote; no basta sumar evidencia de lotes distintos'},
        {key:'close',label:'Cierre diario',complete:close>0,detail:close?`${close} cierres guardados`:'Sin cierre por planta'}
      ]
      const completed=checks.filter(item=>item.complete).length,technicalComplete=checks.slice(2).every(item=>item.complete),roleComplete=checks.slice(0,2).every(item=>item.complete)
      const uatState:UatState=!roleComplete||rec===0?'blocked':technicalComplete?'ready_for_human_uat':'in_progress'
      const blockers=checks.filter(item=>!item.complete).map(item=>({key:item.key,label:item.label,detail:item.detail}))
      const continuityEvidenceComplete=consecutiveCloseDays>=3
      const liveState:LiveReadinessState=uatState!=='ready_for_human_uat'?'uat_incomplete':continuityEvidenceComplete?'ready_for_human_live_review':'continuity_pending'
      const latest=[receptions.get(id)?.lastAt,evidence.get(id)?.lastAt,quality.get(id)?.lastAt,production.get(id)?.lastAt,orders.get(id)?.lastAt,dispatches.get(id)?.lastAt,sales.get(id)?.lastAt,closes.get(id)?.lastAt,endToEnd.get(id)?.lastAt].filter(Boolean).sort().at(-1)??null
      return {plantId:id,score:Math.round(completed/checks.length*100),completed,total:checks.length,latestActivityAt:latest,uat:{state:uatState,humanAcceptanceRequired:true,blockers},liveReadiness:{state:liveState,requiredConsecutiveCloseDays:3,consecutiveCloseDays,continuityEvidenceComplete,humanAcceptanceRequired:true,supportIndependenceRequiresHumanConfirmation:true,autoLive:false},metrics:{users,operationsUsers:ops.active,operationsCredentials:ops.credentials,qualityUsers:qa.active,qualityCredentials:qa.credentials,viewerUsers:viewer.active,receptions:rec,receptionsWithEvidence:ev,qualityLots:q,productionLots:p,locatedKg:inv,salesOrders:orders.get(id)?.count??0,dispatches:dispatches.get(id)?.count??0,sales:sales.get(id)?.count??0,endToEndReceptions:linked,dailyCloses:close,distinctCloseDays},checks}
    })
    const summary={blocked:plants.filter(item=>item.uat.state==='blocked').length,inProgress:plants.filter(item=>item.uat.state==='in_progress').length,readyForHumanUat:plants.filter(item=>item.uat.state==='ready_for_human_uat').length,readyForHumanLiveReview:plants.filter(item=>item.liveReadiness.state==='ready_for_human_live_review').length,live:0}
    return res.status(200).json({ok:true,plants,summary,gate:{version:'plant-uat-v3-linked-e2e',rule:'UAT exige roles y evidencia viva end-to-end enlazada sobre al menos un mismo lote: evidencia documental, Calidad, Producción, ubicación física y señal comercial deben compartir reception_id. La revisión LIVE exige además al menos 3 fechas consecutivas con cierre operacional. LIVE nunca se infiere: requiere confirmación humana, cero P0/P1 y aceptación del responsable.'},disclaimer:'Gate basado en evidencia operacional enlazada. La presencia agregada de eventos en una planta no prueba un flujo E2E. Los cierres consecutivos son evidencia de continuidad, no prueba automática de independencia del equipo técnico ni autorización LIVE.'})
  }catch(error){const message=error instanceof Error?error.message:'';return res.status(message.includes('DATABASE_URL')?503:500).json({ok:false,error:message.includes('DATABASE_URL')?'Base de datos no conectada':'No fue posible calcular readiness UAT de plantas'})}
}

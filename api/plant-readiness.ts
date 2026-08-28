import {requireOperator,type SessionOperator} from './_auth.js'
import {allowedPlantIds} from './_plants.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type MetricRow={plant_id:string|null;count:string|number;last_at?:string|null}
type OperatorRow={plant_id:string;role:string;count:string|number;credentials:string|number}
type InventoryRow={plant_id:string|null;kg:string|number}
type UatState='blocked'|'in_progress'|'ready_for_human_uat'
const ids=['ancud','quellon','iquique','piedra-azul','aqua-austral','natales'] as const
const n=(value:unknown)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:0}
const byPlant=(rows:MetricRow[])=>new Map(rows.filter(row=>row.plant_id).map(row=>[row.plant_id as string,{count:n(row.count),lastAt:row.last_at??null}]))
const inventoryMap=(rows:InventoryRow[])=>new Map(rows.filter(row=>row.plant_id).map(row=>[row.plant_id as string,n(row.kg)]))
function visible(operator:SessionOperator,id:string){return operator.role==='admin'||allowedPlantIds(operator).includes(id as never)}
function roleMap(rows:OperatorRow[]){const map=new Map<string,Map<string,{active:number;credentials:number}>>();for(const row of rows){const plant=map.get(row.plant_id)??new Map();plant.set(row.role,{active:n(row.count),credentials:n(row.credentials)});map.set(row.plant_id,plant)}return map}

export default async function handler(req:Request,res:Response){
  res.setHeader('Cache-Control','no-store')
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
  try{
    const operator=await requireOperator(req)
    if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
    const sql=getSql()
    const [operatorsRaw,receptionsRaw,evidenceRaw,qualityRaw,productionRaw,inventoryRaw,ordersRaw,dispatchesRaw,salesRaw,closesRaw]=await Promise.all([
      sql`select plant_id,o.role,count(distinct o.id)::int count,count(distinct o.id) filter(where o.password_hash is not null)::int credentials from operators o cross join lateral unnest(o.plant_ids) plant_id where o.active=true group by plant_id,o.role`,
      sql`select plant_id,count(*) count,max(received_at) last_at from receptions group by plant_id`,
      sql`select r.plant_id,count(distinct e.reception_id) count,max(e.created_at) last_at from reception_evidence e join receptions r on r.id=e.reception_id group by r.plant_id`,
      sql`select r.plant_id,count(distinct le.reception_id) count,max(le.occurred_at) last_at from lot_events le join receptions r on r.id=le.reception_id where le.event_type='quality' group by r.plant_id`,
      sql`select r.plant_id,count(distinct le.reception_id) count,max(le.occurred_at) last_at from lot_events le join receptions r on r.id=le.reception_id where le.event_type='production' group by r.plant_id`,
      sql`select r.plant_id,coalesce(sum(case when im.to_location_id is not null then im.moved_kg else 0 end)-sum(case when im.from_location_id is not null then im.moved_kg else 0 end),0) kg from receptions r left join inventory_movements im on im.reception_id=r.id group by r.plant_id`,
      sql`select plant_id,count(*) count,max(created_at) last_at from sales_orders group by plant_id`,
      sql`select r.plant_id,count(*) count,max(d.dispatched_at) last_at from lot_dispatches d join receptions r on r.id=d.reception_id where d.status='confirmed' group by r.plant_id`,
      sql`select r.plant_id,count(*) count,max(s.sold_at) last_at from lot_sales s join receptions r on r.id=s.reception_id where s.status='confirmed' group by r.plant_id`,
      sql`select plant_id,count(*) count,max(generated_at) last_at from daily_closes where plant_id is not null group by plant_id`
    ])
    const roles=roleMap((Array.isArray(operatorsRaw)?operatorsRaw:[]) as OperatorRow[]),receptions=byPlant((Array.isArray(receptionsRaw)?receptionsRaw:[]) as MetricRow[]),evidence=byPlant((Array.isArray(evidenceRaw)?evidenceRaw:[]) as MetricRow[]),quality=byPlant((Array.isArray(qualityRaw)?qualityRaw:[]) as MetricRow[]),production=byPlant((Array.isArray(productionRaw)?productionRaw:[]) as MetricRow[]),inventory=inventoryMap((Array.isArray(inventoryRaw)?inventoryRaw:[]) as InventoryRow[]),orders=byPlant((Array.isArray(ordersRaw)?ordersRaw:[]) as MetricRow[]),dispatches=byPlant((Array.isArray(dispatchesRaw)?dispatchesRaw:[]) as MetricRow[]),sales=byPlant((Array.isArray(salesRaw)?salesRaw:[]) as MetricRow[]),closes=byPlant((Array.isArray(closesRaw)?closesRaw:[]) as MetricRow[])
    const plants=ids.filter(id=>visible(operator,id)).map(id=>{
      const role=roles.get(id)??new Map<string,{active:number;credentials:number}>(),ops=role.get('operations')??{active:0,credentials:0},qa=role.get('quality')??{active:0,credentials:0},viewer=role.get('viewer')??{active:0,credentials:0}
      const users=[...role.values()].reduce((sum,item)=>sum+item.active,0),rec=receptions.get(id)?.count??0,ev=evidence.get(id)?.count??0,q=quality.get(id)?.count??0,p=production.get(id)?.count??0,inv=inventory.get(id)??0,commercial=(orders.get(id)?.count??0)+(dispatches.get(id)?.count??0)+(sales.get(id)?.count??0),close=closes.get(id)?.count??0
      const checks=[
        {key:'operations-role',label:'Operaciones con credenciales',complete:ops.credentials>0,detail:ops.credentials?`${ops.credentials} usuario(s) Operaciones listo(s)`:'Falta usuario Operaciones activo con credenciales'},
        {key:'quality-role',label:'Calidad con credenciales',complete:qa.credentials>0,detail:qa.credentials?`${qa.credentials} usuario(s) Calidad listo(s)`:'Falta usuario Calidad activo con credenciales'},
        {key:'receptions',label:'Recepción real',complete:rec>0,detail:rec?`${rec} recepciones`:'Sin recepciones vivas'},
        {key:'evidence',label:'Evidencia documental',complete:rec>0&&ev>0,detail:ev?`${ev} lotes con evidencia`:'Sin evidencia viva'},
        {key:'quality',label:'Control de calidad',complete:rec>0&&q>0,detail:q?`${q} lotes controlados`:'Sin controles vivos'},
        {key:'production',label:'Producción trazada',complete:rec>0&&p>0,detail:p?`${p} lotes producidos`:'Sin producción viva'},
        {key:'inventory',label:'Inventario ubicado',complete:inv>0,detail:inv?`${inv.toLocaleString('es-CL',{maximumFractionDigits:1})} kg`:'Sin posición física ubicada'},
        {key:'commercial',label:'Flujo comercial',complete:commercial>0,detail:commercial?`${commercial} eventos/órdenes`:'Sin orden, despacho ni venta'},
        {key:'close',label:'Cierre diario',complete:close>0,detail:close?`${close} cierres guardados`:'Sin cierre por planta'}
      ]
      const completed=checks.filter(item=>item.complete).length,technicalComplete=checks.slice(2).every(item=>item.complete),roleComplete=checks.slice(0,2).every(item=>item.complete)
      const uatState:UatState=!roleComplete||rec===0?'blocked':technicalComplete?'ready_for_human_uat':'in_progress'
      const blockers=checks.filter(item=>!item.complete).map(item=>({key:item.key,label:item.label,detail:item.detail}))
      const latest=[receptions.get(id)?.lastAt,evidence.get(id)?.lastAt,quality.get(id)?.lastAt,production.get(id)?.lastAt,orders.get(id)?.lastAt,dispatches.get(id)?.lastAt,sales.get(id)?.lastAt,closes.get(id)?.lastAt].filter(Boolean).sort().at(-1)??null
      return {plantId:id,score:Math.round(completed/checks.length*100),completed,total:checks.length,latestActivityAt:latest,uat:{state:uatState,humanAcceptanceRequired:true,blockers},metrics:{users,operationsUsers:ops.active,operationsCredentials:ops.credentials,qualityUsers:qa.active,qualityCredentials:qa.credentials,viewerUsers:viewer.active,receptions:rec,receptionsWithEvidence:ev,qualityLots:q,productionLots:p,locatedKg:inv,salesOrders:orders.get(id)?.count??0,dispatches:dispatches.get(id)?.count??0,sales:sales.get(id)?.count??0,dailyCloses:close},checks}
    })
    const summary={blocked:plants.filter(item=>item.uat.state==='blocked').length,inProgress:plants.filter(item=>item.uat.state==='in_progress').length,readyForHumanUat:plants.filter(item=>item.uat.state==='ready_for_human_uat').length,live:0}
    return res.status(200).json({ok:true,plants,summary,gate:{version:'plant-uat-v1-evidence-gate',rule:'Una planta sólo llega a ready_for_human_uat cuando Operaciones y Calidad tienen credenciales y existe evidencia viva de recepción, documento, calidad, producción, inventario, comercial y cierre. LIVE nunca se infiere: requiere aceptación humana explícita y operación sostenida.'},disclaimer:'Gate UAT basado en evidencia operacional. Ninguna planta se declara LIVE automáticamente.'})
  }catch(error){const message=error instanceof Error?error.message:'';return res.status(message.includes('DATABASE_URL')?503:500).json({ok:false,error:message.includes('DATABASE_URL')?'Base de datos no conectada':'No fue posible calcular readiness UAT de plantas'})}
}

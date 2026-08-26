import {requireOperator,type SessionOperator} from './_auth.js'
import {allowedPlantIds} from './_plants.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type MetricRow={plant_id:string|null;count:string|number;last_at?:string|null}
type OperatorRow={plant_id:string;count:string|number}
type InventoryRow={plant_id:string|null;kg:string|number}
const ids=['ancud','quellon','iquique','piedra-azul','aqua-austral','natales'] as const
const n=(value:unknown)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:0}
const byPlant=(rows:MetricRow[])=>new Map(rows.filter(row=>row.plant_id).map(row=>[row.plant_id as string,{count:n(row.count),lastAt:row.last_at??null}]))
const operatorMap=(rows:OperatorRow[])=>new Map(rows.map(row=>[row.plant_id,n(row.count)]))
const inventoryMap=(rows:InventoryRow[])=>new Map(rows.filter(row=>row.plant_id).map(row=>[row.plant_id as string,n(row.kg)]))
function visible(operator:SessionOperator,id:string){return operator.role==='admin'||allowedPlantIds(operator).includes(id as never)}

export default async function handler(req:Request,res:Response){
  res.setHeader('Cache-Control','no-store')
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
  try{
    const operator=await requireOperator(req)
    if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
    const sql=getSql()
    const [operatorsRaw,receptionsRaw,evidenceRaw,qualityRaw,productionRaw,inventoryRaw,ordersRaw,dispatchesRaw,salesRaw,closesRaw]=await Promise.all([
      sql`select plant_id,count(distinct o.id) count from operators o cross join lateral unnest(o.plant_ids) plant_id where o.active=true group by plant_id`,
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
    const operators=operatorMap((Array.isArray(operatorsRaw)?operatorsRaw:[]) as OperatorRow[]),receptions=byPlant((Array.isArray(receptionsRaw)?receptionsRaw:[]) as MetricRow[]),evidence=byPlant((Array.isArray(evidenceRaw)?evidenceRaw:[]) as MetricRow[]),quality=byPlant((Array.isArray(qualityRaw)?qualityRaw:[]) as MetricRow[]),production=byPlant((Array.isArray(productionRaw)?productionRaw:[]) as MetricRow[]),inventory=inventoryMap((Array.isArray(inventoryRaw)?inventoryRaw:[]) as InventoryRow[]),orders=byPlant((Array.isArray(ordersRaw)?ordersRaw:[]) as MetricRow[]),dispatches=byPlant((Array.isArray(dispatchesRaw)?dispatchesRaw:[]) as MetricRow[]),sales=byPlant((Array.isArray(salesRaw)?salesRaw:[]) as MetricRow[]),closes=byPlant((Array.isArray(closesRaw)?closesRaw:[]) as MetricRow[])
    const plants=ids.filter(id=>visible(operator,id)).map(id=>{
      const rec=receptions.get(id)?.count??0,ev=evidence.get(id)?.count??0,q=quality.get(id)?.count??0,p=production.get(id)?.count??0,inv=inventory.get(id)??0,commercial=(orders.get(id)?.count??0)+(dispatches.get(id)?.count??0)+(sales.get(id)?.count??0),close=closes.get(id)?.count??0,users=operators.get(id)??0
      const checks=[users>0,rec>0,rec>0&&ev>0,rec>0&&q>0,rec>0&&p>0,inv>0,commercial>0,close>0]
      const completed=checks.filter(Boolean).length
      const latest=[receptions.get(id)?.lastAt,evidence.get(id)?.lastAt,quality.get(id)?.lastAt,production.get(id)?.lastAt,orders.get(id)?.lastAt,dispatches.get(id)?.lastAt,sales.get(id)?.lastAt,closes.get(id)?.lastAt].filter(Boolean).sort().at(-1)??null
      return {plantId:id,score:Math.round(completed/checks.length*100),completed,total:checks.length,latestActivityAt:latest,metrics:{users,receptions:rec,receptionsWithEvidence:ev,qualityLots:q,productionLots:p,locatedKg:inv,salesOrders:orders.get(id)?.count??0,dispatches:dispatches.get(id)?.count??0,sales:sales.get(id)?.count??0,dailyCloses:close},checks:[{key:'users',label:'Usuarios asignados',complete:checks[0],detail:users?`${users} activos`:'Sin usuarios asignados'},{key:'receptions',label:'Recepción real',complete:checks[1],detail:rec?`${rec} recepciones`:'Sin recepciones vivas'},{key:'evidence',label:'Evidencia documental',complete:checks[2],detail:ev?`${ev} lotes con evidencia`:'Sin evidencia viva'},{key:'quality',label:'Control de calidad',complete:checks[3],detail:q?`${q} lotes controlados`:'Sin controles vivos'},{key:'production',label:'Producción trazada',complete:checks[4],detail:p?`${p} lotes producidos`:'Sin producción viva'},{key:'inventory',label:'Inventario ubicado',complete:checks[5],detail:inv?`${inv.toLocaleString('es-CL',{maximumFractionDigits:1})} kg`:'Sin posición física ubicada'},{key:'commercial',label:'Flujo comercial',complete:checks[6],detail:commercial?`${commercial} eventos/órdenes`:'Sin orden, despacho ni venta'},{key:'close',label:'Cierre diario',complete:checks[7],detail:close?`${close} cierres guardados`:'Sin cierre por planta'}]}
    })
    return res.status(200).json({ok:true,plants,disclaimer:'Readiness técnico basado en evidencia operacional. LIVE requiere además aceptación humana y operación sostenida según roadmap.'})
  }catch(error){const message=error instanceof Error?error.message:'';return res.status(message.includes('DATABASE_URL')?503:500).json({ok:false,error:message.includes('DATABASE_URL')?'Base de datos no conectada':'No fue posible calcular readiness de plantas'})}
}

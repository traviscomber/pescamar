import {requireOperator,type SessionOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;query?:Record<string,string|string[]|undefined>;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
const one=(v:string|string[]|undefined)=>Array.isArray(v)?v[0]:v
const text=(v:unknown,max=120)=>String(v??'').trim().slice(0,max)
const validDate=(v:string)=>!v||/^\d{4}-\d{2}-\d{2}$/.test(v)
const canAudit=(o:SessionOperator)=>['admin','operations'].includes(o.role)

export default async function handler(req:Request,res:Response){
  res.setHeader('Cache-Control','no-store')
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
  try{
    const operator=await requireOperator(req)
    if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
    if(!canAudit(operator))return res.status(403).json({ok:false,error:'Tu rol no puede acceder a auditoría operacional'})
    const from=text(one(req.query?.from),10),to=text(one(req.query?.to),10),plantId=text(one(req.query?.plantId),80),operatorId=text(one(req.query?.operatorId),40),module=text(one(req.query?.module),40)
    if(!validDate(from)||!validDate(to)||operatorId&&!/^[0-9a-f-]{36}$/i.test(operatorId))return res.status(400).json({ok:false,error:'Filtros inválidos'})
    const sql=getSql(),admin=operator.role==='admin',financial=operator.role==='admin',plantIds=operator.plantIds
    const rows=await sql`
      with audit as (
        select r.id::text id,r.created_at occurred_at,'recepciones' module,'Recepción registrada' action,p.legal_name||' · '||r.species detail,r.plant_id,r.created_by_operator_id operator_id,r.source operator_name,'REC-'||r.reception_number reference,false financial from receptions r join parties p on p.id=r.supplier_id
        union all select e.id::text,e.occurred_at,'produccion',case when e.event_type='production' then 'Producción registrada' when e.event_type='quality' then 'Control de calidad' else 'Nota operacional' end,e.title,r.plant_id,e.created_by_operator_id,e.created_by,'REC-'||r.reception_number,false from lot_events e join receptions r on r.id=e.reception_id
        union all select m.id::text,m.occurred_at,'inventario','Movimiento de inventario',m.movement_type||' · '||m.moved_kg||' kg',r.plant_id,m.created_by_operator_id,m.created_by,'REC-'||r.reception_number,false from inventory_movements m join receptions r on r.id=m.reception_id
        union all select c.id::text,c.occurred_at,'costos','Costo de transformación',c.category||' · $'||c.amount_clp,r.plant_id,c.created_by_operator_id,c.created_by,'REC-'||r.reception_number,true from transformation_costs c join receptions r on r.id=c.reception_id
        union all select d.id::text,d.dispatched_at,'comercial','Despacho confirmado',d.destination||' · '||d.dispatched_kg||' kg',r.plant_id,d.created_by_operator_id,d.created_by,'DSP-'||d.dispatch_number,false from lot_dispatches d join receptions r on r.id=d.reception_id
        union all select s.id::text,s.sold_at,'comercial','Venta registrada',s.sold_kg||' kg',r.plant_id,s.created_by_operator_id,s.created_by,'REC-'||r.reception_number,true from lot_sales s join receptions r on r.id=s.reception_id
        union all select o.id::text,o.created_at,'planificacion','Orden de venta creada',o.product||' · '||o.committed_kg||' kg',o.plant_id,o.created_by_operator_id,o.created_by,'OV-'||o.order_number,true from sales_orders o
        union all select dc.id::text,dc.generated_at,'cierre','Cierre diario guardado',coalesce(dc.notes,'Snapshot operacional'),dc.plant_id,dc.generated_by_operator_id,dc.generated_by,dc.close_date::text,false from daily_closes dc
      )
      select a.*,coalesce(op.full_name,a.operator_name) operator_name from audit a left join operators op on op.id=a.operator_id
      where (${admin} or a.plant_id is null or a.plant_id=any(${plantIds}::text[])) and (${financial} or not a.financial)
        and (${from||null}::date is null or (a.occurred_at at time zone 'America/Santiago')::date>=${from||null}::date)
        and (${to||null}::date is null or (a.occurred_at at time zone 'America/Santiago')::date<=${to||null}::date)
        and (${plantId||null}::text is null or a.plant_id=${plantId||null})
        and (${operatorId||null}::uuid is null or a.operator_id=${operatorId||null}::uuid)
        and (${module||null}::text is null or a.module=${module||null})
      order by a.occurred_at desc limit 1000`
    const operators=await sql`select id,full_name,role from operators where active order by full_name`
    return res.status(200).json({ok:true,items:Array.isArray(rows)?rows:[],operators:Array.isArray(operators)?operators:[],permissions:{canSeeFinancial:financial},generatedAt:new Date().toISOString()})
  }catch{return res.status(500).json({ok:false,error:'No fue posible cargar auditoría operacional'})}
}

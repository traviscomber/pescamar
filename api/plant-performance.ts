import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}

export default async function handler(req:Request,res:Response){
  res.setHeader('Cache-Control','no-store')
  try{
    const operator=await requireOperator(req)
    if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
    if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
    const admin=operator.role==='admin',plantIds=operator.plantIds,sql=getSql()
    const [rows,historicalRows]=await Promise.all([
      sql`
        with reception_base as (
          select r.id,r.plant_id,
            coalesce(r.accepted_kg,greatest(0,r.gross_kg-r.tare_kg),0) received_kg,
            coalesce((select (le.metrics->>'outputKg')::numeric from lot_events le where le.reception_id=r.id and le.event_type='production' and le.metrics ? 'outputKg' order by le.occurred_at desc limit 1),0) produced_kg,
            coalesce((select sum(s.sold_kg*s.price_per_kg_clp) from lot_sales s where s.reception_id=r.id and s.status='confirmed'),0) revenue_clp,
            coalesce((select st.gross_amount_clp from settlements st where st.reception_id=r.id and st.status in ('approved','pending','draft') order by st.created_at desc limit 1),0) purchase_cost_clp,
            coalesce((select sum(tc.amount_clp) from transformation_costs tc where tc.reception_id=r.id),0) transformation_cost_clp,
            coalesce((select sum(d.dispatched_kg) from lot_dispatches d where d.reception_id=r.id and d.status='confirmed'),0) dispatched_kg
          from receptions r
          where ${admin} or r.plant_id=any(${plantIds}::text[])
        )
        select plant_id,
          count(*) lots,
          coalesce(sum(received_kg),0) received_kg,
          coalesce(sum(produced_kg),0) produced_kg,
          coalesce(sum(greatest(0,coalesce(nullif(produced_kg,0),received_kg)-dispatched_kg)),0) available_kg,
          coalesce(sum(revenue_clp),0) revenue_clp,
          coalesce(sum(purchase_cost_clp),0) purchase_cost_clp,
          coalesce(sum(transformation_cost_clp),0) transformation_cost_clp,
          coalesce(sum(revenue_clp-purchase_cost_clp-transformation_cost_clp),0) contribution_clp,
          case when sum(revenue_clp)>0 then 100*sum(revenue_clp-purchase_cost_clp-transformation_cost_clp)/sum(revenue_clp) else null end contribution_pct
        from reception_base
        where plant_id is not null
        group by plant_id
        order by plant_id`,
      admin?sql`
        select
          lower(coalesce(nullif(trim(plant_id),''),nullif(trim(process_site_original),''),'sin planta')) historical_key,
          min(coalesce(nullif(trim(plant_id),''),nullif(trim(process_site_original),''),'Sin planta')) display_name,
          count(*) filter(where record_status='operational')::int lots,
          sum(coalesce(received_kg,guide_kg,0)) filter(where record_status='operational') received_kg,
          sum(coalesce(guide_kg,0)) filter(where record_status='operational') guide_kg,
          sum(coalesce(difference_kg,0)) filter(where record_status='operational') difference_kg,
          count(*) filter(where record_status='operational' and cardinality(data_quality_flags)>0)::int flagged_rows,
          min(event_date) filter(where record_status='operational') first_date,
          max(event_date) filter(where record_status='operational') last_date
        from historical_production_records
        group by lower(coalesce(nullif(trim(plant_id),''),nullif(trim(process_site_original),''),'sin planta'))
        order by received_kg desc nulls last`:Promise.resolve([])
    ])
    return res.status(200).json({ok:true,plants:Array.isArray(rows)?rows:[],historicalPlants:Array.isArray(historicalRows)?historicalRows:[]})
  }catch{return res.status(500).json({ok:false,error:'No fue posible calcular desempeño por planta'})}
}

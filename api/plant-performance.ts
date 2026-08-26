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
        with hist_base as (
          select
            lower(coalesce(nullif(trim(plant_id),''),nullif(trim(process_site_original),''),'sin planta')) historical_key,
            coalesce(nullif(trim(plant_id),''),nullif(trim(process_site_original),''),'Sin planta') display_name,
            coalesce(nullif(trim(supplier_name),''),'Sin proveedor') supplier,
            coalesce(received_kg,guide_kg,0) received_kg,
            coalesce(guide_kg,0) guide_kg,
            coalesce(difference_kg,0) difference_kg,
            guide_price_clp,
            case when yields ? 'total' and (yields->>'total')::numeric > 0 and (yields->>'total')::numeric <= 1 then (yields->>'total')::numeric else null end yield_total,
            cardinality(data_quality_flags)>0 flagged,
            event_date
          from historical_production_records
          where record_status='operational'
        ),
        site_summary as (
          select historical_key,min(display_name) display_name,count(*)::int lots,
            sum(received_kg) received_kg,sum(guide_kg) guide_kg,sum(difference_kg) difference_kg,
            count(*) filter(where yield_total is not null)::int yield_rows,
            avg(yield_total) filter(where yield_total is not null) yield_avg,
            count(*) filter(where flagged)::int flagged_rows,
            min(event_date) first_date,max(event_date) last_date
          from hist_base group by historical_key
        ),
        supplier_summary as (
          select historical_key,supplier,count(*)::int lots,sum(received_kg) received_kg,sum(difference_kg) difference_kg,
            avg(guide_price_clp) filter(where guide_price_clp is not null) avg_price_clp
          from hist_base group by historical_key,supplier
        ),
        supplier_ranked as (
          select *,row_number() over(partition by historical_key order by abs(difference_kg) desc,received_kg desc) rn
          from supplier_summary
        ),
        supplier_json as (
          select historical_key,jsonb_agg(jsonb_build_object('supplier',supplier,'lots',lots,'received_kg',received_kg,'difference_kg',difference_kg,'avg_price_clp',avg_price_clp) order by rn) filter(where rn<=3) supplier_drivers
          from supplier_ranked group by historical_key
        )
        select s.*,
          case when s.guide_kg>0 then 100*s.difference_kg/s.guide_kg else null end reception_variance_pct,
          case when s.lots>0 then 100.0*s.yield_rows/s.lots else 0 end yield_coverage_pct,
          coalesce(j.supplier_drivers,'[]'::jsonb) supplier_drivers
        from site_summary s left join supplier_json j using(historical_key)
        order by s.received_kg desc nulls last`:Promise.resolve([])
    ])
    return res.status(200).json({ok:true,plants:Array.isArray(rows)?rows:[],historicalPlants:Array.isArray(historicalRows)?historicalRows:[]})
  }catch{return res.status(500).json({ok:false,error:'No fue posible calcular desempeño por planta'})}
}

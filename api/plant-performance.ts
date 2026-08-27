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
        with eligible as (
          select e.*,
            lower(coalesce(nullif(trim(e.plant_id),''),nullif(trim(e.process_site_original),''),'sin planta')) historical_key,
            coalesce(nullif(trim(e.plant_id),''),nullif(trim(e.process_site_original),''),'Sin planta') display_name
          from historical_record_eligibility e
        ),
        site_summary as (
          select historical_key,min(display_name) display_name,
            count(*)::int source_rows,
            count(*) filter(where usable_for_reception)::int reception_rows,
            sum(received_kg) filter(where usable_for_reception) received_kg,
            sum(guide_kg) filter(where usable_for_reception) guide_kg,
            sum(difference_kg) filter(where usable_for_reception) difference_kg,
            count(*) filter(where usable_for_timing)::int timing_rows,
            avg(process_date-reception_date) filter(where usable_for_timing) avg_reception_to_process_days,
            avg(production_date-process_date) filter(where usable_for_timing) avg_process_to_production_days,
            avg(production_date-reception_date) filter(where usable_for_timing) avg_total_days,
            count(*) filter(where usable_for_quality)::int quality_rows,
            count(*) filter(where requires_review)::int review_rows,
            count(*) filter(where relationship_status='lote_consolidado')::int consolidated_rows,
            min(reception_date) first_date,max(reception_date) last_date
          from eligible
          group by historical_key
        ),
        supplier_summary as (
          select historical_key,coalesce(nullif(trim(supplier_name),''),'Sin proveedor') supplier,
            count(*) filter(where usable_for_reception)::int lots,
            sum(received_kg) filter(where usable_for_reception) received_kg,
            sum(difference_kg) filter(where usable_for_reception) difference_kg,
            avg(guide_price_clp) filter(where usable_for_supplier_cost) avg_price_clp
          from eligible
          group by historical_key,coalesce(nullif(trim(supplier_name),''),'Sin proveedor')
        ),
        supplier_ranked as (
          select *,row_number() over(partition by historical_key order by abs(coalesce(difference_kg,0)) desc,coalesce(received_kg,0) desc) rn
          from supplier_summary
        ),
        supplier_json as (
          select historical_key,jsonb_agg(jsonb_build_object('supplier',supplier,'lots',lots,'received_kg',received_kg,'difference_kg',difference_kg,'avg_price_clp',avg_price_clp) order by rn) filter(where rn<=3) supplier_drivers
          from supplier_ranked group by historical_key
        )
        select s.*,
          case when s.guide_kg>0 then 100*s.difference_kg/s.guide_kg else null end reception_variance_pct,
          case when s.source_rows>0 then 100.0*s.reception_rows/s.source_rows else 0 end reception_coverage_pct,
          case when s.source_rows>0 then 100.0*s.timing_rows/s.source_rows else 0 end timing_coverage_pct,
          case when s.source_rows>0 then 100.0*s.quality_rows/s.source_rows else 0 end quality_coverage_pct,
          null::numeric yield_avg,0::numeric yield_coverage_pct,0::int yield_rows,
          s.review_rows flagged_rows,
          coalesce(j.supplier_drivers,'[]'::jsonb) supplier_drivers
        from site_summary s left join supplier_json j using(historical_key)
        where s.historical_key<>'sin planta'
        order by s.received_kg desc nulls last`:Promise.resolve([])
    ])
    return res.status(200).json({
      ok:true,
      plants:Array.isArray(rows)?rows:[],
      historicalPlants:Array.isArray(historicalRows)?historicalRows:[],
      yieldRanking:[],
      yieldBenchmark:{cohort:'Desactivado',classification:'El ranking histórico de yield fue retirado hasta contar con cohortes de proceso comparables y semántica validada.'},
      intelligencePolicy:{reception:'Sólo filas con kg recibidos y sin duplicado ambiguo.',timing:'Excluye secuencias de fecha inconsistentes.',quality:'Sólo filas con clasificación y kg recibidos.',ranking:'No se publica un ranking global de yield por ahora.'}
    })
  }catch{return res.status(500).json({ok:false,error:'No fue posible calcular desempeño por planta'})}
}

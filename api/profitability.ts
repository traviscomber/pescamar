import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'
type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type PlantRow=Record<string,unknown>&{plant_id?:string|null}
const financialReadRoles=new Set(['admin','operations','finance','viewer'])
export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 try{
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  if(!financialReadRoles.has(operator.role))return res.status(403).json({ok:false,error:'Tu rol no tiene acceso a información financiera'})
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
  const sql=getSql(),admin=operator.role==='admin',plantIds=operator.plantIds,corporate=admin||plantIds.length>=6
  const [suppliers,plants,customers,sourceCoverage,historicalSuppliers,historicalPlants,historicalCustomers,historicalProducts,documents,coverage]=await Promise.all([
   sql`with scoped as (
      select r.*,coalesce(r.accepted_kg,greatest(0,coalesce(r.gross_kg,0)-coalesce(r.tare_kg,0))) physical_kg
      from receptions r where ${admin} or r.plant_id=any(${plantIds}::text[])
    ),receipts as (
      select supplier_id,count(*)::int receptions,sum(physical_kg) received_kg from scoped group by supplier_id
    ),sold as (
      select r.id reception_id,r.supplier_id,r.physical_kg,sum(s.sold_kg) sold_kg,sum(s.sold_kg*s.price_per_kg_clp) revenue_clp
      from scoped r join lot_sales s on s.reception_id=r.id and s.status='confirmed'
      group by r.id,r.supplier_id,r.physical_kg
    ),economic as (
      select s.*,st.gross_amount_clp purchase_cost_clp,tc.transformation_cost_clp,
       s.physical_kg>0 and abs(s.sold_kg-s.physical_kg)<=0.01 full_sale,
       st.gross_amount_clp is not null purchase_known,tc.transformation_cost_clp is not null transformation_known
      from sold s
      left join lateral(select gross_amount_clp from settlements x where x.reception_id=s.reception_id and x.status in ('approved','pending','draft') order by x.created_at desc limit 1)st on true
      left join lateral(select sum(amount_clp) transformation_cost_clp from transformation_costs x where x.reception_id=s.reception_id having count(*)>0)tc on true
    ),economics as (
      select supplier_id,count(*)::int sold_lots,sum(sold_kg) sold_kg,sum(revenue_clp) revenue_clp,
       sum(purchase_cost_clp) filter(where purchase_known) purchase_cost_clp,
       sum(transformation_cost_clp) filter(where transformation_known) transformation_cost_clp,
       count(*) filter(where full_sale)::int full_sale_lots,count(*) filter(where purchase_known)::int purchase_known_lots,count(*) filter(where transformation_known)::int transformation_known_lots,
       bool_and(full_sale and purchase_known and transformation_known) economic_complete,
       case when bool_and(full_sale and purchase_known and transformation_known) then sum(revenue_clp-purchase_cost_clp-transformation_cost_clp) end contribution_clp
      from economic group by supplier_id
    )
    select p.id supplier_id,p.legal_name supplier,r.receptions,r.received_kg,coalesce(e.sold_lots,0)::int sold_lots,coalesce(e.sold_kg,0) sold_kg,coalesce(e.revenue_clp,0) revenue_clp,
     e.purchase_cost_clp,e.transformation_cost_clp,e.contribution_clp,
     case when e.economic_complete and e.revenue_clp>0 then 100*e.contribution_clp/e.revenue_clp end contribution_pct,
     coalesce(e.economic_complete,false) economic_complete,coalesce(e.full_sale_lots,0)::int full_sale_lots,coalesce(e.purchase_known_lots,0)::int purchase_known_lots,coalesce(e.transformation_known_lots,0)::int transformation_known_lots
    from receipts r join parties p on p.id=r.supplier_id left join economics e on e.supplier_id=r.supplier_id
    where p.kind='supplier'::party_kind order by e.contribution_clp desc nulls last,r.received_kg desc`,
   sql`with scoped as (
      select r.*,coalesce(r.accepted_kg,greatest(0,coalesce(r.gross_kg,0)-coalesce(r.tare_kg,0))) physical_kg
      from receptions r where ${admin} or r.plant_id=any(${plantIds}::text[])
    ),sold as (
      select r.id reception_id,r.plant_id,r.physical_kg,sum(s.sold_kg) sold_kg,sum(s.sold_kg*s.price_per_kg_clp) revenue_clp
      from scoped r join lot_sales s on s.reception_id=r.id and s.status='confirmed'
      group by r.id,r.plant_id,r.physical_kg
    ),economic as (
      select s.*,st.gross_amount_clp purchase_cost_clp,tc.transformation_cost_clp,
       s.physical_kg>0 and abs(s.sold_kg-s.physical_kg)<=0.01 full_sale,
       st.gross_amount_clp is not null purchase_known,tc.transformation_cost_clp is not null transformation_known
      from sold s
      left join lateral(select gross_amount_clp from settlements x where x.reception_id=s.reception_id and x.status in ('approved','pending','draft') order by x.created_at desc limit 1)st on true
      left join lateral(select sum(amount_clp) transformation_cost_clp from transformation_costs x where x.reception_id=s.reception_id having count(*)>0)tc on true
    )
    select plant_id,count(*)::int lots,sum(revenue_clp) revenue_clp,
     sum(purchase_cost_clp) filter(where purchase_known) purchase_cost_clp,sum(transformation_cost_clp) filter(where transformation_known) transformation_cost_clp,
     case when bool_and(full_sale and purchase_known and transformation_known) then sum(revenue_clp-purchase_cost_clp-transformation_cost_clp) end contribution_clp,
     case when bool_and(full_sale and purchase_known and transformation_known) and sum(revenue_clp)>0 then 100*sum(revenue_clp-purchase_cost_clp-transformation_cost_clp)/sum(revenue_clp) end contribution_pct,
     bool_and(full_sale and purchase_known and transformation_known) economic_complete,
     count(*) filter(where full_sale)::int full_sale_lots,count(*) filter(where purchase_known)::int purchase_known_lots,count(*) filter(where transformation_known)::int transformation_known_lots
    from economic group by plant_id order by contribution_clp desc nulls last,revenue_clp desc`,
   sql`select p.id customer_id,p.legal_name customer,count(distinct s.id) sales,count(distinct s.reception_id) lots,sum(s.sold_kg) sold_kg,sum(s.sold_kg*s.price_per_kg_clp) revenue_clp from parties p join lot_sales s on s.customer_id=p.id and s.status='confirmed' join receptions r on r.id=s.reception_id where p.kind='customer'::party_kind and (${admin} or r.plant_id=any(${plantIds}::text[])) group by p.id,p.legal_name order by revenue_clp desc nulls last`,
   corporate?sql`select source_kind,count(*)::int files,min(period_start) period_start,max(period_end) period_end from canonical_source_files where canonical group by source_kind order by source_kind`:Promise.resolve([]),
   corporate?sql`select * from historical_supplier_intelligence order by received_kg desc nulls last`:sql`select coalesce(nullif(trim(supplier_name),''),'Sin proveedor') supplier,count(*)::int lots,sum(coalesce(received_kg,guide_kg,0)) received_kg,sum(coalesce(guide_kg,0)) guide_kg,sum(coalesce(difference_kg,0)) difference_kg,avg(quality_discount) filter(where quality_discount is not null) avg_quality_discount,avg(guide_price_clp) filter(where guide_price_clp is not null) avg_price_clp,sum(coalesce(received_kg,guide_kg,0)*coalesce(guide_price_clp,0)) estimated_purchase_clp,min(event_date) first_date,max(event_date) last_date,count(*) filter(where cardinality(data_quality_flags)>0)::int flagged_rows from historical_production_records where record_status='operational' and plant_id=any(${plantIds}::text[]) group by coalesce(nullif(trim(supplier_name),''),'Sin proveedor') order by received_kg desc nulls last`,
   corporate?sql`select * from historical_plant_intelligence order by received_kg desc nulls last`:sql`select * from historical_plant_intelligence where plant_id=any(${plantIds}::text[]) order by received_kg desc nulls last`,
   corporate?sql`select * from historical_client_intelligence order by source_kg desc nulls last`:sql`select coalesce(nullif(trim(client),''),'Sin cliente') customer,count(*)::int lots,sum(coalesce(received_kg,guide_kg,0)) source_kg,min(event_date) first_date,max(event_date) last_date,count(*) filter(where cardinality(data_quality_flags)>0)::int flagged_rows from historical_production_records where record_status='operational' and plant_id=any(${plantIds}::text[]) and nullif(trim(client),'') is not null group by coalesce(nullif(trim(client),''),'Sin cliente') order by source_kg desc nulls last`,
   corporate?sql`select * from historical_product_intelligence order by stock_kg desc nulls last`:Promise.resolve([]),
   corporate?sql`select (select count(*)::int from purchase_orders) purchase_orders,(select coalesce(sum(total_amount),0) from purchase_orders where currency='CLP') purchase_orders_clp,(select count(*)::int from export_invoices) export_invoices,(select coalesce(sum(total_amount),0) from export_invoices where currency='USD') export_invoices_usd,(select coalesce(sum(net_weight_kg),0) from export_invoices) export_kg,(select count(*)::int from canonical_packing_boxes) packing_boxes,(select coalesce(sum(total_kg),0) from canonical_packing_boxes) packing_kg`:sql`select (select count(*)::int from purchase_orders where plant_id=any(${plantIds}::text[])) purchase_orders,(select coalesce(sum(total_amount),0) from purchase_orders where currency='CLP' and plant_id=any(${plantIds}::text[])) purchase_orders_clp,(select count(*)::int from export_invoices where plant_id=any(${plantIds}::text[])) export_invoices,(select coalesce(sum(total_amount),0) from export_invoices where currency='USD' and plant_id=any(${plantIds}::text[])) export_invoices_usd,(select coalesce(sum(net_weight_kg),0) from export_invoices where plant_id=any(${plantIds}::text[])) export_kg,0::int packing_boxes,0::numeric packing_kg`,
   corporate?sql`select (select count(*)::int from historical_production_records where record_status='operational') historical_rows,(select count(*)::int from historical_production_records where record_status='operational' and cardinality(data_quality_flags)>0) historical_flagged,(select count(*)::int from canonical_stock_records) stock_rows,(select count(*)::int from canonical_account_entries) account_rows,(select count(*)::int from canonical_transfers_received) transfer_rows`:sql`select (select count(*)::int from historical_production_records where record_status='operational' and plant_id=any(${plantIds}::text[])) historical_rows,(select count(*)::int from historical_production_records where record_status='operational' and plant_id=any(${plantIds}::text[]) and cardinality(data_quality_flags)>0) historical_flagged,0::int stock_rows,0::int account_rows,0::int transfer_rows`
  ])
  const plantRows=((Array.isArray(plants)?plants:[]) as PlantRow[]).filter(row=>admin||plantIds.includes(String(row.plant_id??'')))
  return res.status(200).json({ok:true,live:{suppliers:Array.isArray(suppliers)?suppliers:[],plants:plantRows,customers:Array.isArray(customers)?customers:[]},historical:{suppliers:Array.isArray(historicalSuppliers)?historicalSuppliers:[],plants:Array.isArray(historicalPlants)?historicalPlants:[],customers:Array.isArray(historicalCustomers)?historicalCustomers:[],products:Array.isArray(historicalProducts)?historicalProducts:[]},documents:Array.isArray(documents)?documents[0]??{}:{},coverage:Array.isArray(coverage)?coverage[0]??{}:{},sourceCoverage:Array.isArray(sourceCoverage)?sourceCoverage:[],boundary:{financialRead:true,plantScoped:!admin,corporateHistory:corporate,profitabilityRule:'unknown_is_not_zero',liveContributionRequires:'same sold lot + physical kg + complete sale + settlement + transformation cost'}})
 }catch(error){
  const m=error instanceof Error?error.message:''
  return res.status(m.includes('historical_')||m.includes('profitability')?503:500).json({ok:false,error:m.includes('historical_')?'Falta aplicar la migración de inteligencia histórica':m.includes('profitability')?'Falta aplicar la migración de rentabilidad':'No fue posible calcular inteligencia económica'})
 }
}

create or replace view historical_supplier_intelligence as
select
  coalesce(nullif(trim(supplier_name),''),'Sin proveedor') as supplier,
  count(*) filter (where record_status='operational')::int as lots,
  sum(coalesce(received_kg,guide_kg,0)) filter (where record_status='operational') as received_kg,
  sum(coalesce(guide_kg,0)) filter (where record_status='operational') as guide_kg,
  sum(coalesce(difference_kg,0)) filter (where record_status='operational') as difference_kg,
  avg(quality_discount) filter (where record_status='operational' and quality_discount is not null) as avg_quality_discount,
  avg(guide_price_clp) filter (where record_status='operational' and guide_price_clp is not null) as avg_price_clp,
  sum(coalesce(received_kg,guide_kg,0)*coalesce(guide_price_clp,0)) filter (where record_status='operational') as estimated_purchase_clp,
  min(event_date) filter (where record_status='operational') as first_date,
  max(event_date) filter (where record_status='operational') as last_date,
  count(*) filter (where record_status='operational' and cardinality(data_quality_flags)>0)::int as flagged_rows
from historical_production_records
group by coalesce(nullif(trim(supplier_name),''),'Sin proveedor');

create or replace view historical_plant_intelligence as
select
  coalesce(nullif(trim(plant_id),''),nullif(trim(process_site_original),''),'Sin planta') as plant_id,
  count(*) filter (where record_status='operational')::int as lots,
  sum(coalesce(received_kg,guide_kg,0)) filter (where record_status='operational') as received_kg,
  sum(coalesce(guide_kg,0)) filter (where record_status='operational') as guide_kg,
  sum(coalesce(difference_kg,0)) filter (where record_status='operational') as difference_kg,
  avg(quality_discount) filter (where record_status='operational' and quality_discount is not null) as avg_quality_discount,
  min(event_date) filter (where record_status='operational') as first_date,
  max(event_date) filter (where record_status='operational') as last_date,
  count(*) filter (where record_status='operational' and cardinality(data_quality_flags)>0)::int as flagged_rows
from historical_production_records
group by coalesce(nullif(trim(plant_id),''),nullif(trim(process_site_original),''),'Sin planta');

create or replace view historical_client_intelligence as
select
  coalesce(nullif(trim(client),''),'Sin cliente') as customer,
  count(*) filter (where record_status='operational')::int as lots,
  sum(coalesce(received_kg,guide_kg,0)) filter (where record_status='operational') as source_kg,
  min(event_date) filter (where record_status='operational') as first_date,
  max(event_date) filter (where record_status='operational') as last_date,
  count(*) filter (where record_status='operational' and cardinality(data_quality_flags)>0)::int as flagged_rows
from historical_production_records
where nullif(trim(client),'') is not null
group by coalesce(nullif(trim(client),''),'Sin cliente');

create or replace view historical_product_intelligence as
select
  product_family,
  count(*)::int as stock_rows,
  sum(coalesce(total_kg,0)) as stock_kg,
  min(event_date) as first_date,
  max(event_date) as last_date,
  count(*) filter(where cardinality(data_quality_flags)>0)::int as flagged_rows
from canonical_stock_records
group by product_family;

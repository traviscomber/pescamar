create or replace view historical_record_eligibility as
with lot_stats as (
  select source_file, lower(trim(coalesce(lot_code,''))) lot_key, count(distinct guide_number) as lot_guide_count
  from historical_production_records
  where record_status='operational' and nullif(trim(coalesce(lot_code,'')),'') is not null
  group by source_file, lower(trim(coalesce(lot_code,'')))
), context_stats as (
  select source_file,
         lower(trim(coalesce(lot_code,''))) lot_key,
         trim(coalesce(guide_number,'')) guide_key,
         lower(trim(coalesce(supplier_name,''))) supplier_key,
         guide_kg, received_kg,
         count(*) as exact_context_rows
  from historical_production_records
  where record_status='operational'
  group by source_file, lower(trim(coalesce(lot_code,''))), trim(coalesce(guide_number,'')), lower(trim(coalesce(supplier_name,''))), guide_kg, received_kg
), scored as (
  select h.*,
    coalesce(cs.exact_context_rows,1)>1 as possible_duplicate,
    coalesce(ls.lot_guide_count,1)>1 as consolidated_lot,
    ('date_sequence_inconsistent'=any(coalesce(h.data_quality_flags,array[]::text[]))) as date_issue,
    cardinality(coalesce(h.data_quality_flags,array[]::text[]))>0 as any_quality_flag,
    (h.grade_breakdown is not null and h.grade_breakdown <> '{}'::jsonb) as has_quality_data
  from historical_production_records h
  left join lot_stats ls on ls.source_file=h.source_file and ls.lot_key=lower(trim(coalesce(h.lot_code,'')))
  left join context_stats cs on cs.source_file=h.source_file
    and cs.lot_key=lower(trim(coalesce(h.lot_code,'')))
    and cs.guide_key=trim(coalesce(h.guide_number,''))
    and cs.supplier_key=lower(trim(coalesce(h.supplier_name,'')))
    and cs.guide_kg is not distinct from h.guide_kg
    and cs.received_kg is not distinct from h.received_kg
  where h.record_status='operational'
)
select
  id, source_file, source_file_hash, source_row, guide_number, lot_code, supplier_name, process_site_original, plant_id,
  guide_kg, received_kg, difference_kg, guide_price_clp, reception_date, process_date, production_date,
  data_quality_flags,
  (not possible_duplicate and received_kg is not null) as usable_for_reception,
  (not possible_duplicate and not date_issue and received_kg is not null and reception_date is not null and process_date is not null and production_date is not null) as usable_for_timing,
  (not possible_duplicate and has_quality_data and received_kg is not null) as usable_for_quality,
  (not possible_duplicate and supplier_name is not null and received_kg is not null and guide_price_clp is not null) as usable_for_supplier_cost,
  (possible_duplicate or any_quality_flag) as requires_review,
  case when possible_duplicate or any_quality_flag then 'requiere_revision' when consolidated_lot then 'lote_consolidado' else 'directa' end as relationship_status
from scored;

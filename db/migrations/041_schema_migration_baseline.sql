-- Establish an explicit migration baseline without fabricating historical execution timestamps.
-- Migrations 001-040 are attested as structurally present. Migration 041 is the first
-- migration recorded with an actual applied_at timestamp in this registry.

do $$
begin
  if to_regclass('public.parties') is null
    or to_regclass('public.receptions') is null
    or to_regclass('public.operators') is null
    or to_regclass('public.historical_production_records') is null
    or to_regclass('public.canonical_production_support_blocks') is null
    or to_regclass('public.plant_stations') is null
    or to_regclass('public.plant_devices') is null
    or to_regclass('public.device_events') is null
    or to_regclass('public.packing_specs') is null
    or to_regclass('public.packing_units') is null
    or to_regclass('public.label_templates') is null
    or to_regclass('public.label_print_jobs') is null
    or to_regclass('public.pallets') is null
    or to_regclass('public.pallet_packing_units') is null
    or to_regclass('public.cold_assets') is null
    or to_regclass('public.cold_runs') is null
    or to_regclass('public.cold_run_loads') is null
    or to_regclass('public.cold_observations') is null
    or to_regclass('public.regulatory_holds') is null
    or to_regclass('public.regulatory_hold_events') is null
    or to_regclass('public.cold_runs_one_open_per_asset_unique') is null
    or to_regprocedure('public.regulatory_reception_is_blocked(uuid)') is null
    or to_regprocedure('public.enforce_regulatory_dispatch_hold()') is null
    or to_regprocedure('public.enforce_regulatory_pallet_membership_freeze()') is null
    or to_regprocedure('public.enforce_cold_observation_scope()') is null then
    raise exception 'No se puede establecer el baseline: faltan objetos estructurales requeridos hasta 040';
  end if;

  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='product_labels' and column_name='packing_unit_id')
    or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='product_labels' and column_name='label_template_id')
    or not exists(select 1 from pg_trigger where not tgisinternal and tgname='lot_dispatches_regulatory_hold_gate')
    or not exists(select 1 from pg_trigger where not tgisinternal and tgname='regulatory_holds_pallet_scope_lock')
    or not exists(select 1 from pg_trigger where not tgisinternal and tgname='pallet_packing_units_regulatory_freeze')
    or not exists(select 1 from pg_trigger where not tgisinternal and tgname='cold_observations_scope_guard') then
    raise exception 'No se puede establecer el baseline: faltan columnas o gates estructurales requeridos hasta 040';
  end if;
end $$;

create table if not exists schema_migrations (
  migration_name text primary key,
  evidence_kind text not null check (evidence_kind in ('baseline','applied')),
  recorded_at timestamptz not null default now(),
  applied_at timestamptz,
  baseline_through text,
  details jsonb not null default '{}'::jsonb,
  check (
    (evidence_kind='baseline' and applied_at is null and baseline_through is not null)
    or (evidence_kind='applied' and applied_at is not null)
  )
);

create index if not exists schema_migrations_recorded_at_idx on schema_migrations(recorded_at);

insert into schema_migrations(migration_name,evidence_kind,baseline_through,details)
select migration_name,'baseline','040_cold_sensor_station_scope.sql',jsonb_build_object(
  'attestation','runtime_structural_baseline',
  'historical_execution_reconstructed',false,
  'note','Estructura verificada al establecer 041; no se inventan timestamps históricos por archivo.'
)
from unnest(array[
  '001_core.sql','002_settlement_workflow.sql','003_operator_auth.sql','004_reception_plant_evidence.sql',
  '005_auth_abuse_audit.sql','006_historical_production.sql','007_live_lot_memory.sql','008_dispatches_sales.sql',
  '009_sales_orders_inventory_daily_close.sql','010_transformation_costs.sql','011_reception_evidence_files.sql',
  '012_plant_identity_links.sql','013_fix_create_lot_sale.sql','014_reception_evidence_ownership.sql',
  '015_production_lines.sql','016_operator_audit_identity.sql','017_operational_operator_identity.sql',
  '020_whatsapp_intelligence.sql','021_whatsapp_directory_seed.sql','022_sea_urchin_process_control.sql',
  '023_product_labels.sql','024_label_release_gate.sql','025_partners_profitability_inventory.sql',
  '026_historical_intelligence.sql','027_historical_record_eligibility.sql','028_uni_vision_station.sql',
  '029_uni_vision_source_image_hash.sql','030_production_support_evidence.sql','031_production_support_resolutions.sql',
  '032_production_support_blocks.sql','033_plant_execution_foundation.sql','034_label_engine.sql','035_pallets.sql',
  '036_cold_chain.sql','037_regulatory_holds.sql','038_regulatory_pallet_membership_freeze.sql',
  '039_cold_asset_active_run_exclusion.sql','040_cold_sensor_station_scope.sql'
]::text[]) as baseline(migration_name)
on conflict(migration_name) do nothing;

insert into schema_migrations(migration_name,evidence_kind,applied_at,details)
values(
  '041_schema_migration_baseline.sql',
  'applied',
  now(),
  jsonb_build_object('attestation','migration_registry_created','historical_execution_reconstructed',false)
)
on conflict(migration_name) do nothing;

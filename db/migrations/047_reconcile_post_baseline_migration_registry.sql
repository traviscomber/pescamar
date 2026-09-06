-- Reconcile migrations 042-046 into the explicit registry without inventing
-- historical execution timestamps. This migration verifies the canonical
-- structures first, records those migrations as structurally reconciled, and
-- records 047 itself as applied with a real timestamp.

-- Fail closed with pure SQL so the migration is accepted by the migration
-- runner while still refusing reconciliation when any canonical landmark is
-- missing. Division by zero intentionally aborts the transaction on failure.
select 1 / case when
  to_regclass('public.japan_export_release_evidence') is not null
  and to_regclass('public.japan_export_release_evidence_reception_gate_idx') is not null
  and to_regclass('public.japan_export_release_evidence_current_unique') is not null
  and to_regprocedure('public.japan_destination_matches(text)') is not null
  and to_regprocedure('public.japan_dispatch_is_allowed(uuid,text,text)') is not null
  and to_regprocedure('public.japan_reception_is_released(uuid)') is not null
  and to_regprocedure('public.japan_reception_has_valid_cold_chain(uuid)') is not null
  and to_regclass('public.lot_lifecycle_events') is not null
  and to_regclass('public.lot_lifecycle_events_reception_time_idx') is not null
  and exists(
    select 1 from pg_constraint
    where conrelid=to_regclass('public.lot_dispatches')
      and conname='lot_dispatches_japan_release_check'
  )
  and exists(
    select 1 from pg_constraint
    where conrelid=to_regclass('public.sea_urchin_stage_checks')
      and conname='sea_urchin_stage_sequence_mapping_check'
  )
  and exists(
    select 1 from pg_constraint
    where conrelid=to_regclass('public.sea_urchin_stage_checks')
      and conname='sea_urchin_stage_sequence_pass_unique'
  )
  and exists(
    select 1 from pg_constraint
    where conrelid=to_regclass('public.sea_urchin_stage_checks')
      and conname='sea_urchin_stage_previous_pass_fk'
  )
  and exists(
    select 1 from pg_constraint
    where conrelid=to_regclass('public.sea_urchin_process_runs')
      and conname='sea_urchin_run_release_classification_check'
  )
  and exists(
    select 1 from pg_constraint
    where conrelid=to_regclass('public.sea_urchin_process_runs')
      and conname='sea_urchin_run_terminal_stage_fk'
  )
  and exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='sea_urchin_stage_checks'
      and column_name='sequence_pass' and is_generated='ALWAYS'
  )
  and exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='sea_urchin_stage_checks'
      and column_name='required_previous_sequence_no' and is_generated='ALWAYS'
  )
  and exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='sea_urchin_stage_checks'
      and column_name='required_previous_pass' and is_generated='ALWAYS'
  )
  and exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='sea_urchin_process_runs'
      and column_name='required_terminal_sequence_no' and is_generated='ALWAYS'
  )
  and exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='sea_urchin_process_runs'
      and column_name='required_terminal_pass' and is_generated='ALWAYS'
  )
then 1 else 0 end as canonical_structure_verified;

alter table schema_migrations
  drop constraint if exists schema_migrations_evidence_kind_check;

alter table schema_migrations
  drop constraint if exists schema_migrations_check;

alter table schema_migrations
  add constraint schema_migrations_evidence_kind_check
  check (evidence_kind in ('baseline','applied','reconciled'));

alter table schema_migrations
  add constraint schema_migrations_check
  check (
    (evidence_kind='baseline' and applied_at is null and baseline_through is not null)
    or (evidence_kind='applied' and applied_at is not null)
    or (evidence_kind='reconciled' and applied_at is null and baseline_through is null)
  );

insert into schema_migrations(migration_name,evidence_kind,details)
select migration_name,'reconciled',jsonb_build_object(
  'attestation','runtime_structural_reconciliation',
  'canonical_structure_verified',true,
  'historical_execution_reconstructed',false,
  'original_execution_timestamp_known',false,
  'reconciled_by','047_reconcile_post_baseline_migration_registry.sql',
  'note','La estructura canónica está presente y no se inventa applied_at histórico para este archivo.'
)
from unnest(array[
  '042_japan_export_release_gate.sql',
  '043_japan_dispatch_fail_closed.sql',
  '044_sea_urchin_sequence_fail_closed.sql',
  '045_japan_cold_chain_fail_closed.sql',
  '046_lot_operational_lifecycle.sql'
]::text[]) as reconciled(migration_name)
on conflict(migration_name) do nothing;

insert into schema_migrations(migration_name,evidence_kind,applied_at,details)
values(
  '047_reconcile_post_baseline_migration_registry.sql',
  'applied',
  now(),
  jsonb_build_object(
    'attestation','post_baseline_registry_reconciliation',
    'historical_execution_reconstructed',false,
    'reconciled_through','046_lot_operational_lifecycle.sql'
  )
)
on conflict(migration_name) do nothing;

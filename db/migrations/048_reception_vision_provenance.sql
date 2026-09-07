-- Structured provenance for AI-assisted reception evidence.
-- The photo remains valid evidence without AI metadata; when Vision is used,
-- provider/model/confidence are stored explicitly instead of being parsed from note text.

alter table reception_evidence
  add column if not exists ai_provider text,
  add column if not exists ai_model text,
  add column if not exists ai_confidence numeric(5,4);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reception_evidence_ai_confidence_check'
  ) then
    alter table reception_evidence add constraint reception_evidence_ai_confidence_check
      check (ai_confidence is null or (ai_confidence >= 0 and ai_confidence <= 1));
  end if;
end $$;

create index if not exists reception_evidence_ai_provenance_idx
  on reception_evidence (ai_provider, ai_model)
  where ai_provider is not null;

insert into schema_migrations(migration_name,evidence_kind,applied_at,details)
values(
  '048_reception_vision_provenance.sql',
  'applied',
  now(),
  jsonb_build_object(
    'attestation','structured_reception_vision_provenance',
    'source','canonical_migration',
    'historical_execution_reconstructed',false
  )
)
on conflict(migration_name) do nothing;

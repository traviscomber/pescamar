-- Server-authored Vision provenance on immutable reception source files.
-- This prevents clients from inventing provider/model/confidence metadata when
-- attaching a previously stored reception image.

alter table reception_evidence_files
  add column if not exists ai_provider text,
  add column if not exists ai_model text,
  add column if not exists ai_confidence numeric(5,4);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reception_evidence_files_ai_confidence_check'
  ) then
    alter table reception_evidence_files add constraint reception_evidence_files_ai_confidence_check
      check (ai_confidence is null or (ai_confidence >= 0 and ai_confidence <= 1));
  end if;
end $$;

create index if not exists reception_evidence_files_ai_provenance_idx
  on reception_evidence_files (ai_provider, ai_model)
  where ai_provider is not null;

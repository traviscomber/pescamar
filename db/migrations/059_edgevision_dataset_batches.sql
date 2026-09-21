-- EdgeVision dataset intake scaffolding for the predictive path. Registers
-- real incoming dataset batches (metadata + storage reference only, never
-- binary blobs in the database) so QA can review them before any capability
-- is promoted to a Pescamar-validated baseline. The predictive product
-- boundary stays hard: this table records evidence intake; it never enables
-- forecasts by itself (see docs/SEAFOOD-GRADE-A.md, Gate 5 and appendix).

create table if not exists edgevision_dataset_batches (
  id bigint generated always as identity primary key,
  plant_id text not null,
  capability text not null check (capability in ('count','calibre','size','defects','biomass','anomaly')),
  source_label text not null,
  captured_from timestamptz not null,
  captured_to timestamptz not null,
  constraint edgevision_dataset_batches_window_check check (captured_to >= captured_from),
  image_count integer not null default 0 check (image_count >= 0),
  operator_confirmed_labels integer not null default 0 check (operator_confirmed_labels >= 0),
  storage_ref text not null,
  qa_status text not null default 'pending_review' check (qa_status in ('pending_review','validated','rejected')),
  qa_notes text,
  constraint edgevision_dataset_batches_validated_notes_check
    check (qa_status <> 'validated' or (qa_notes is not null and length(trim(qa_notes)) >= 10)),
  promoted_at timestamptz,
  promoted_by uuid references operators(id) on delete set null,
  created_by uuid not null references operators(id),
  created_at timestamptz not null default now()
);

create index if not exists edgevision_dataset_batches_capability_idx
  on edgevision_dataset_batches (capability, qa_status);
create index if not exists edgevision_dataset_batches_plant_idx
  on edgevision_dataset_batches (plant_id, created_at desc);

insert into schema_migrations(migration_name,evidence_kind,applied_at,details)
values(
  '059_edgevision_dataset_batches.sql',
  'applied',
  now(),
  jsonb_build_object(
    'attestation','edgevision_dataset_intake',
    'source','canonical_migration',
    'operational_writes',false,
    'binary_blobs_in_db',false,
    'predictive_activation',false,
    'role_from_session_only',true
  )
)
on conflict(migration_name) do nothing;

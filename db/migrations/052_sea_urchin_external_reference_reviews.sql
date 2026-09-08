-- Seafood Intelligence OS · Uni external-reference human review
-- Reconstructed from the live applied schema and schema_migrations evidence on 2026-09-08.
-- These reviews are human quality labels for external references only; they are not operational lot evidence
-- and do not trigger automatic training or operational decisions.

create table if not exists sea_urchin_external_reference_reviews (
  id bigserial primary key,
  reference_id text not null references sea_urchin_external_references(id) on delete restrict,
  decision text not null check (decision in ('accepted','rejected')),
  rejection_reason text,
  note text,
  reviewed_by text not null,
  reviewed_at timestamptz not null default now(),
  provenance jsonb not null default '{}'::jsonb,
  constraint sea_urchin_external_reference_reviews_rejection_reason_ck check (
    (decision='rejected' and rejection_reason is not null and length(trim(rejection_reason))>0)
    or (decision='accepted' and rejection_reason is null)
  )
);

create index if not exists sea_urchin_external_reference_reviews_reference_idx
  on sea_urchin_external_reference_reviews(reference_id, reviewed_at desc);

insert into schema_migrations(migration_name,evidence_kind,applied_at,details)
values (
  '052_sea_urchin_external_reference_reviews.sql',
  'applied',
  now(),
  jsonb_build_object(
    'purpose','human_quality_review_of_external_uni_references',
    'automatic_training',false,
    'operational_evidence',false
  )
)
on conflict (migration_name) do nothing;

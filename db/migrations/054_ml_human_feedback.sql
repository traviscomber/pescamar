-- Human feedback for Seafood AI / ML interpretations.
-- Votes create supervised-learning candidates. They never retrain, approve, release,
-- dispatch or modify operational state automatically.

create table if not exists ml_feedback (
  id bigint generated always as identity primary key,
  operator_id uuid not null references operators(id) on delete restrict,
  organization_id text not null,
  operator_role text not null,
  plant_id text,
  reception_id uuid references receptions(id) on delete set null,
  rating text not null check (rating in ('good','bad')),
  comment text,
  question text not null,
  answer text not null,
  source_ids text[] not null default '{}'::text[],
  policy_version text,
  engine text,
  router_intent text,
  learning_status text not null default 'candidate' check (learning_status in ('candidate','accepted','rejected')),
  learning_eligible boolean not null default false,
  reviewed_by_operator_id uuid references operators(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  constraint ml_feedback_bad_comment_check check (rating <> 'bad' or nullif(btrim(comment),'') is not null),
  constraint ml_feedback_review_check check (
    (learning_status='candidate' and learning_eligible=false and reviewed_at is null)
    or
    (learning_status in ('accepted','rejected') and reviewed_by_operator_id is not null and reviewed_at is not null)
  )
);

create index if not exists ml_feedback_created_idx on ml_feedback(created_at desc);
create index if not exists ml_feedback_learning_idx on ml_feedback(learning_status,learning_eligible,created_at desc);
create index if not exists ml_feedback_operator_idx on ml_feedback(operator_id,created_at desc);
create index if not exists ml_feedback_scope_idx on ml_feedback(plant_id,reception_id,created_at desc);

insert into schema_migrations(migration_name,evidence_kind,applied_at,details)
values(
  '054_ml_human_feedback.sql',
  'applied',
  now(),
  jsonb_build_object(
    'attestation','human_feedback_candidates_for_ml_learning',
    'source','canonical_migration',
    'automatic_training',false,
    'operational_writes',false,
    'historical_execution_reconstructed',false
  )
)
on conflict(migration_name) do nothing;

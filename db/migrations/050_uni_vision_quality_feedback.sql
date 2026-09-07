-- Human Quality feedback for Uni Vision supervised-learning evidence.
-- A confirmed human decision remains the authority. These fields create labeled
-- examples for future model evaluation/training; they do not retrain or approve automatically.

alter table sea_urchin_color_captures
  add column if not exists quality_feedback_reason text,
  add column if not exists quality_feedback_note text,
  add column if not exists quality_learning_label text,
  add column if not exists learning_eligible boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sea_urchin_color_quality_learning_label_check'
  ) then
    alter table sea_urchin_color_captures add constraint sea_urchin_color_quality_learning_label_check
      check (quality_learning_label is null or quality_learning_label in ('good','bad'));
  end if;
end $$;

create index if not exists sea_urchin_color_learning_examples_idx
  on sea_urchin_color_captures (learning_eligible, quality_learning_label, confirmed_at desc)
  where learning_eligible = true;

insert into schema_migrations(migration_name,evidence_kind,applied_at,details)
values(
  '050_uni_vision_quality_feedback.sql',
  'applied',
  now(),
  jsonb_build_object(
    'attestation','human_quality_feedback_for_supervised_learning',
    'source','canonical_migration',
    'authority','quality_or_admin',
    'automatic_training',false,
    'historical_execution_reconstructed',false
  )
)
on conflict(migration_name) do nothing;

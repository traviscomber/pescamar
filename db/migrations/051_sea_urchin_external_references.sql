create table if not exists sea_urchin_external_references (
  id text primary key,
  title text not null,
  source_page text not null unique,
  image_url text,
  source_type text not null check (source_type in ('public_domain','creative_commons','official_reference','commercial_reference','research_reference')),
  license text not null,
  attribution text,
  scene text not null,
  intended_use text not null check (intended_use in ('visual_variability','segmentation_qa','reference_only','defect_variability')),
  quality_status text not null default 'unlabeled' check (quality_status = 'unlabeled'),
  official_grade text check (official_grade is null),
  notes text not null default '',
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sea_urchin_external_references_use_idx
  on sea_urchin_external_references(intended_use, source_type);

insert into schema_migrations(migration_name,evidence_kind,applied_at,details)
values (
  '051_sea_urchin_external_references.sql',
  'applied',
  now(),
  jsonb_build_object(
    'source','canonical_migration',
    'purpose','external_uni_visual_reference_catalog',
    'operational_evidence',false,
    'automatic_training',false,
    'human_quality_labels',false
  )
)
on conflict (migration_name) do nothing;

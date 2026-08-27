create table if not exists canonical_production_support_resolutions (
  id uuid primary key default gen_random_uuid(),
  source_file_hash text not null,
  parser_version text not null,
  sheet_name text not null,
  source_block integer not null,
  selected_main_source_row integer,
  resolution_status text not null check (resolution_status in ('linked','unmatched','deferred')),
  resolution_basis text not null check (resolution_basis in ('guide','lot','both','manual','none')),
  review_note text,
  candidate_snapshot jsonb not null default '{}'::jsonb,
  reviewed_by_operator_id uuid not null references operators(id),
  reviewed_at timestamptz not null default now(),
  unique(source_file_hash, parser_version, sheet_name, source_block),
  check ((resolution_status='linked' and selected_main_source_row is not null) or resolution_status<>'linked')
);

create index if not exists canonical_production_support_resolutions_selected_idx
  on canonical_production_support_resolutions(source_file_hash, selected_main_source_row)
  where selected_main_source_row is not null;
create index if not exists canonical_production_support_resolutions_reviewed_idx
  on canonical_production_support_resolutions(reviewed_at desc);

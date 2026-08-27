create table if not exists canonical_production_support_blocks (
  id uuid primary key default gen_random_uuid(),
  source_file_hash text not null,
  parser_version text not null default 'production-support-v2',
  sheet_name text not null,
  source_block integer not null,
  family_key text not null,
  event_date date,
  supplier_name text,
  process_site text,
  guide_number text,
  lot_reference text,
  notes text,
  observation_count integer not null default 0 check (observation_count >= 0),
  data_quality_flags text[] not null default array[]::text[],
  raw_record jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  unique(source_file_hash, parser_version, sheet_name, source_block)
);

create index if not exists canonical_production_support_blocks_source_idx
  on canonical_production_support_blocks(source_file_hash, parser_version);
create index if not exists canonical_production_support_blocks_guide_idx
  on canonical_production_support_blocks(lower(guide_number)) where guide_number is not null;
create index if not exists canonical_production_support_blocks_lot_idx
  on canonical_production_support_blocks(lower(lot_reference)) where lot_reference is not null;
create index if not exists canonical_production_support_blocks_supplier_idx
  on canonical_production_support_blocks(lower(supplier_name)) where supplier_name is not null;

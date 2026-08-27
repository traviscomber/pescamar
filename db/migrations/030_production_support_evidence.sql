create table if not exists canonical_production_support_rows (
  id uuid primary key default gen_random_uuid(),
  source_file_hash text not null,
  parser_version text not null default 'production-support-v1',
  sheet_name text not null,
  source_block integer not null,
  source_row integer not null,
  family_key text not null,
  event_date date,
  supplier_name text,
  process_site text,
  guide_number text,
  lot_reference text,
  grade_code text not null,
  guide_kg numeric,
  accepted_kg numeric,
  destined_kg numeric,
  notes text,
  data_quality_flags text[] not null default array[]::text[],
  raw_record jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  unique(source_file_hash, parser_version, sheet_name, source_block, source_row)
);

create index if not exists canonical_production_support_source_idx
  on canonical_production_support_rows(source_file_hash, parser_version);
create index if not exists canonical_production_support_guide_idx
  on canonical_production_support_rows(lower(guide_number)) where guide_number is not null;
create index if not exists canonical_production_support_lot_idx
  on canonical_production_support_rows(lower(lot_reference)) where lot_reference is not null;
create index if not exists canonical_production_support_supplier_idx
  on canonical_production_support_rows(lower(supplier_name)) where supplier_name is not null;

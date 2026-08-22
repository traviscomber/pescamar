create table if not exists historical_production_records (
  id uuid primary key default gen_random_uuid(),
  source_row integer not null,
  source_file text not null,
  source_file_hash text not null,
  record_status text not null default 'operational' check (record_status in ('operational','void')),
  event_date date,
  reception_date date,
  process_date date,
  production_date date,
  guide_number text,
  supplier_original text,
  supplier_name text,
  extraction_zone text,
  guide_price_clp numeric,
  process_site_original text,
  plant_id text,
  lot_code text not null,
  guide_kg numeric,
  received_kg numeric,
  difference_kg numeric,
  quality_discount numeric,
  grade_breakdown jsonb not null default '{}'::jsonb,
  yields jsonb not null default '{}'::jsonb,
  client text,
  observations text,
  data_quality_flags text[] not null default array[]::text[],
  raw_record jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  unique(source_file_hash, source_row)
);

create index if not exists historical_production_event_date_idx on historical_production_records(event_date desc) where event_date is not null;
create index if not exists historical_production_lot_idx on historical_production_records(lower(lot_code));
create index if not exists historical_production_supplier_idx on historical_production_records(lower(supplier_name)) where supplier_name is not null;
create index if not exists historical_production_guide_idx on historical_production_records(guide_number) where guide_number is not null;
create index if not exists historical_production_site_idx on historical_production_records(lower(process_site_original)) where process_site_original is not null;

-- Seafood Intelligence OS · Design asset registry
-- Binary design assets live in Neon Object Storage; PostgreSQL stores metadata, lifecycle and provenance only.

create table if not exists design_assets (
  id uuid primary key default gen_random_uuid(),
  asset_key text not null check (length(trim(asset_key)) > 0),
  page_key text not null check (length(trim(page_key)) > 0),
  section_key text not null check (length(trim(section_key)) > 0),
  role text not null default 'section' check (role in ('hero','section','background','logo','icon','reference','gallery','other')),
  bucket_name text not null default 'pescamar-design-assets' check (length(trim(bucket_name)) > 0),
  object_key text not null check (length(trim(object_key)) > 0),
  public_url text,
  file_name text not null check (length(trim(file_name)) > 0),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','image/avif','image/svg+xml')),
  byte_size bigint check (byte_size is null or byte_size >= 0),
  width_px integer check (width_px is null or width_px > 0),
  height_px integer check (height_px is null or height_px > 0),
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  alt_text text,
  status text not null default 'draft' check (status in ('draft','approved','active','archived')),
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_by_operator_id uuid references operators(id) on delete restrict,
  approved_by_operator_id uuid references operators(id) on delete restrict,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket_name, object_key),
  check ((status in ('approved','active') and approved_by_operator_id is not null and approved_at is not null) or status in ('draft','archived'))
);

create unique index if not exists design_assets_active_slot_unique
  on design_assets(page_key,section_key,role)
  where status='active';

create index if not exists design_assets_page_section_idx
  on design_assets(page_key,section_key,status,sort_order);

create index if not exists design_assets_asset_key_idx
  on design_assets(asset_key,status);

insert into schema_migrations(migration_name,evidence_kind,applied_at,details)
values (
  '054_design_assets.sql',
  'applied',
  now(),
  jsonb_build_object(
    'source','canonical_migration',
    'purpose','design_asset_registry',
    'storage_bucket','pescamar-design-assets',
    'binary_storage','neon_object_storage',
    'operational_evidence',false
  )
)
on conflict (migration_name) do nothing;

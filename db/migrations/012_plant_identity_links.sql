create table if not exists plant_identity_links (
  id uuid primary key default gen_random_uuid(),
  source_system text not null,
  source_label text not null,
  source_label_normalized text not null,
  plant_id text,
  link_status text not null default 'unlinked' check (link_status in ('unlinked','candidate','confirmed','rejected')),
  evidence jsonb not null default '{}'::jsonb,
  confirmed_by text,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_system, source_label_normalized),
  check (plant_id is null or plant_id in ('ancud','quellon','iquique','piedra-azul','aqua-austral','natales')),
  check ((link_status='confirmed' and plant_id is not null and confirmed_at is not null) or link_status<>'confirmed')
);

create index if not exists plant_identity_links_plant_idx on plant_identity_links(plant_id) where plant_id is not null;
create index if not exists plant_identity_links_status_idx on plant_identity_links(link_status);

with normalized as (
  select
    lower(trim(process_site_original)) as source_label_normalized,
    min(process_site_original) as source_label,
    count(*) as record_count,
    jsonb_agg(distinct process_site_original order by process_site_original) as variants
  from historical_production_records
  where process_site_original is not null and trim(process_site_original)<>''
  group by lower(trim(process_site_original))
)
insert into plant_identity_links(source_system,source_label,source_label_normalized,evidence)
select
  'historical_production_2025',
  source_label,
  source_label_normalized,
  jsonb_build_object('record_count',record_count,'source','historical_production_records','variants',variants)
from normalized
on conflict(source_system,source_label_normalized) do update
set source_label=excluded.source_label,
    evidence=excluded.evidence,
    updated_at=now();

-- Pescamar Plant Execution cold-chain foundation
-- Physical tunnel/chamber/freezer sessions. This complements, and does not replace,
-- species-specific process checks such as sea_urchin_stage_checks.freezing.

create table if not exists cold_assets (
  id uuid primary key default gen_random_uuid(),
  plant_id text not null,
  station_id uuid references plant_stations(id) on delete set null,
  code text not null,
  name text not null,
  asset_type text not null check (asset_type in ('tunnel','chamber','freezer','cold_room')),
  active boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_by_operator_id uuid references operators(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(plant_id,code)
);

create table if not exists cold_runs (
  id uuid primary key default gen_random_uuid(),
  plant_id text not null,
  asset_id uuid not null references cold_assets(id) on delete restrict,
  run_code text not null,
  status text not null default 'open' check (status in ('open','completed','deviation','cancelled')),
  min_allowed_c numeric(7,2),
  max_allowed_c numeric(7,2),
  observed_min_c numeric(7,2),
  observed_max_c numeric(7,2),
  last_observed_c numeric(7,2),
  observation_count integer not null default 0 check (observation_count >= 0),
  deviation_count integer not null default 0 check (deviation_count >= 0),
  started_by_operator_id uuid not null references operators(id),
  completed_by_operator_id uuid references operators(id),
  started_at timestamptz not null,
  completed_at timestamptz,
  evidence_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (min_allowed_c is not null or max_allowed_c is not null),
  check (min_allowed_c is null or max_allowed_c is null or min_allowed_c <= max_allowed_c),
  unique(plant_id,run_code)
);

create table if not exists cold_run_loads (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references cold_runs(id) on delete restrict,
  pallet_id uuid references pallets(id) on delete restrict,
  reception_id uuid references receptions(id) on delete restrict,
  added_by_operator_id uuid not null references operators(id),
  added_at timestamptz not null default now(),
  released_at timestamptz,
  removed_by_operator_id uuid references operators(id),
  removed_at timestamptz,
  removal_reason text,
  check ((pallet_id is not null)::int + (reception_id is not null)::int = 1),
  check ((removed_at is null and removed_by_operator_id is null and removal_reason is null) or (removed_at is not null and removed_by_operator_id is not null and nullif(trim(removal_reason),'') is not null))
);

create table if not exists cold_observations (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references cold_runs(id) on delete restrict,
  plant_id text not null,
  temperature_c numeric(7,2) not null,
  source text not null default 'manual' check (source in ('manual','sensor')),
  device_id uuid references plant_devices(id) on delete set null,
  observed_by_operator_id uuid references operators(id),
  observed_at timestamptz not null,
  evidence_url text,
  note text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique(plant_id,idempotency_key),
  check ((source='manual' and observed_by_operator_id is not null) or (source='sensor' and device_id is not null))
);

create unique index if not exists cold_run_loads_active_pallet_unique on cold_run_loads(pallet_id) where pallet_id is not null and released_at is null and removed_at is null;
create unique index if not exists cold_run_loads_active_reception_unique on cold_run_loads(reception_id) where reception_id is not null and released_at is null and removed_at is null;
create index if not exists cold_assets_plant_active_idx on cold_assets(plant_id,active);
create index if not exists cold_runs_plant_status_idx on cold_runs(plant_id,status,started_at desc);
create index if not exists cold_run_loads_run_idx on cold_run_loads(run_id,added_at) where removed_at is null;
create index if not exists cold_observations_run_time_idx on cold_observations(run_id,observed_at);

-- Pescamar Plant Execution foundation
-- Live floor execution objects. Canonical/imported packing evidence remains separate.

create table if not exists plant_stations (
  id uuid primary key default gen_random_uuid(),
  plant_id text not null,
  code text not null,
  name text not null,
  station_type text not null check (station_type in ('floor','packing','cold','warehouse','quality')),
  active boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_by_operator_id uuid references operators(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(plant_id,code)
);

create table if not exists plant_devices (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references plant_stations(id) on delete cascade,
  device_type text not null check (device_type in ('scanner','scale','printer','terminal','sensor')),
  manufacturer text,
  model text,
  protocol text,
  stable_identifier text,
  active boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(station_id,stable_identifier)
);

create table if not exists device_events (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references plant_stations(id),
  device_id uuid references plant_devices(id),
  plant_id text not null,
  operator_id uuid not null references operators(id),
  reception_id uuid references receptions(id),
  event_type text not null check (event_type in ('scan','weight','print','temperature','manual_weight','other')),
  raw_value text,
  normalized_value jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  processing_status text not null default 'received' check (processing_status in ('received','applied','rejected','superseded')),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(plant_id,idempotency_key)
);

create table if not exists packing_specs (
  id uuid primary key default gen_random_uuid(),
  plant_id text,
  code text not null,
  version integer not null,
  product text not null,
  species text,
  grade text,
  format text,
  destination text,
  min_net_kg numeric(14,3),
  max_net_kg numeric(14,3),
  label_template_code text,
  units_per_box integer,
  boxes_per_pallet integer,
  rules jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_by_operator_id uuid references operators(id),
  created_at timestamptz not null default now()
);

create table if not exists packing_units (
  id uuid primary key default gen_random_uuid(),
  packing_unit_code text not null unique,
  plant_id text not null,
  reception_id uuid not null references receptions(id),
  sea_urchin_run_id uuid references sea_urchin_process_runs(id),
  station_id uuid not null references plant_stations(id),
  source_device_event_id uuid references device_events(id),
  packing_spec_id uuid references packing_specs(id),
  product text,
  species text not null,
  grade text,
  format text,
  gross_kg numeric(14,3),
  tare_kg numeric(14,3),
  net_kg numeric(14,3) not null check (net_kg > 0),
  status text not null default 'packed' check (status in ('packed','held','released','voided','palletized','dispatched')),
  packed_by_operator_id uuid not null references operators(id),
  packed_at timestamptz not null,
  correction_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plant_stations_plant_active_idx on plant_stations(plant_id,active);
create index if not exists plant_devices_station_active_idx on plant_devices(station_id,active);
create index if not exists device_events_reception_time_idx on device_events(reception_id,occurred_at desc);
create index if not exists device_events_station_time_idx on device_events(station_id,occurred_at desc);
create unique index if not exists packing_specs_scope_code_version_unique on packing_specs(coalesce(plant_id,''),code,version);
create index if not exists packing_specs_active_idx on packing_specs(active,product,species);
create unique index if not exists packing_units_source_device_event_unique on packing_units(source_device_event_id) where source_device_event_id is not null;
create index if not exists packing_units_reception_time_idx on packing_units(reception_id,packed_at desc);
create index if not exists packing_units_plant_status_idx on packing_units(plant_id,status,packed_at desc);

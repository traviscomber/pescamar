-- Pescamar Plant Execution pallet foundation
-- Groups live packing units into a physical logistics unit without creating inventory or dispatch movements.

create table if not exists pallets (
  id uuid primary key default gen_random_uuid(),
  pallet_code text not null unique,
  plant_id text not null,
  status text not null default 'building' check (status in ('building','closed','held','released','dispatched','voided')),
  product text,
  species text,
  grade text,
  destination text,
  box_count integer not null default 0 check (box_count >= 0),
  net_kg numeric(14,3) not null default 0 check (net_kg >= 0),
  created_by_operator_id uuid not null references operators(id),
  closed_by_operator_id uuid references operators(id),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists pallet_packing_units (
  id uuid primary key default gen_random_uuid(),
  pallet_id uuid not null references pallets(id) on delete restrict,
  packing_unit_id uuid not null references packing_units(id) on delete restrict,
  previous_packing_status text not null check (previous_packing_status in ('packed','released')),
  added_by_operator_id uuid not null references operators(id),
  added_at timestamptz not null default now(),
  removed_by_operator_id uuid references operators(id),
  removed_at timestamptz,
  removal_reason text,
  check ((removed_at is null and removed_by_operator_id is null and removal_reason is null) or (removed_at is not null and removed_by_operator_id is not null and nullif(trim(removal_reason),'') is not null))
);

create unique index if not exists pallet_packing_units_active_unit_unique on pallet_packing_units(packing_unit_id) where removed_at is null;
create unique index if not exists pallet_packing_units_active_membership_unique on pallet_packing_units(pallet_id,packing_unit_id) where removed_at is null;
create index if not exists pallets_plant_status_idx on pallets(plant_id,status,updated_at desc);
create index if not exists pallet_packing_units_pallet_idx on pallet_packing_units(pallet_id,added_at) where removed_at is null;
create index if not exists pallet_packing_units_history_idx on pallet_packing_units(packing_unit_id,added_at desc);

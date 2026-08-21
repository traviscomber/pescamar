create extension if not exists pgcrypto;

create type party_kind as enum ('fisher', 'supplier', 'customer');
create type workflow_status as enum ('draft', 'pending', 'approved', 'rejected', 'cancelled');
create type credit_recovery_kind as enum ('percentage', 'fixed_amount', 'full_balance');
create type credit_movement_kind as enum ('advance', 'recovery', 'adjustment', 'forgiveness');

create table parties (
  id uuid primary key default gen_random_uuid(),
  kind party_kind not null,
  legal_name text not null,
  tax_id text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, legal_name)
);

create table receptions (
  id uuid primary key default gen_random_uuid(),
  reception_number bigint generated always as identity unique,
  supplier_id uuid not null references parties(id),
  species text not null,
  extraction_zone text not null,
  received_at timestamptz not null,
  gross_kg numeric(12,3) not null check (gross_kg >= 0),
  tare_kg numeric(12,3) not null default 0 check (tare_kg >= 0),
  drained_kg numeric(12,3) check (drained_kg >= 0),
  accepted_kg numeric(12,3) check (accepted_kg >= 0),
  temperature_c numeric(5,2),
  quality_status text not null default 'Muestreo' check (quality_status in ('Clasificado', 'Muestreo', 'Revisión', 'Alerta calibre')),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  status workflow_status not null default 'draft',
  source text not null,
  source_reference text,
  created_at timestamptz not null default now(),
  check (tare_kg <= gross_kg),
  check (accepted_kg is null or accepted_kg <= gross_kg - tare_kg)
);

create table settlements (
  id uuid primary key default gen_random_uuid(),
  reception_id uuid not null unique references receptions(id),
  supplier_id uuid not null references parties(id),
  gross_amount_clp bigint not null check (gross_amount_clp >= 0),
  other_deductions_clp bigint not null default 0 check (other_deductions_clp >= 0),
  net_amount_clp bigint,
  status workflow_status not null default 'draft',
  settled_at timestamptz,
  created_at timestamptz not null default now()
);

create table credit_accounts (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null unique references parties(id),
  currency char(3) not null default 'CLP' check (currency = 'CLP'),
  created_at timestamptz not null default now()
);

create table credit_requests (
  id uuid primary key default gen_random_uuid(),
  request_number bigint generated always as identity unique,
  account_id uuid not null references credit_accounts(id),
  amount_clp bigint not null check (amount_clp > 0),
  reason text not null,
  recovery_kind credit_recovery_kind not null,
  recovery_value numeric(12,2),
  status workflow_status not null default 'pending',
  requested_by text not null,
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  check ((recovery_kind = 'full_balance' and recovery_value is null) or (recovery_kind = 'percentage' and recovery_value > 0 and recovery_value <= 100) or (recovery_kind = 'fixed_amount' and recovery_value > 0))
);

create table credit_movements (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references credit_accounts(id),
  credit_request_id uuid references credit_requests(id),
  settlement_id uuid references settlements(id),
  kind credit_movement_kind not null,
  amount_clp bigint not null check (amount_clp > 0),
  occurred_at timestamptz not null default now(),
  evidence_url text,
  comment text not null,
  created_by text not null,
  check ((kind = 'advance' and credit_request_id is not null) or kind <> 'advance'),
  check ((kind = 'recovery' and settlement_id is not null) or kind <> 'recovery')
);

create table approval_actions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  action workflow_status not null check (action in ('approved', 'rejected')),
  comment text not null check (length(trim(comment)) > 0),
  acted_by text not null,
  acted_at timestamptz not null default now()
);

create table plant_import_batches (
  id text primary key,
  file_name text not null,
  periods text[] not null default '{}',
  plant_ids text[] not null default '{}',
  row_count integer not null check (row_count > 0),
  published_at timestamptz not null default now(),
  published_by text not null,
  previous_plants jsonb not null,
  resulting_plants jsonb not null,
  reverted_at timestamptz
);

create table plant_current_state (
  state_key text primary key check (state_key = 'current'),
  plants jsonb not null,
  latest_batch_id text references plant_import_batches(id),
  updated_at timestamptz not null default now()
);

create index receptions_supplier_received_idx on receptions (supplier_id, received_at desc);
create index credit_requests_account_status_idx on credit_requests (account_id, status, requested_at desc);
create index credit_movements_account_date_idx on credit_movements (account_id, occurred_at desc);
create index approval_actions_entity_idx on approval_actions (entity_type, entity_id, acted_at desc);
create index plant_import_batches_published_at_idx on plant_import_batches (published_at desc);

create view credit_account_balances as
select account_id,
  coalesce(sum(case when kind in ('advance', 'adjustment') then amount_clp else -amount_clp end), 0)::bigint as balance_clp,
  max(occurred_at) as last_movement_at
from credit_movements
group by account_id;

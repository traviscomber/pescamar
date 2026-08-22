-- 008_dispatches_sales.sql
-- Salidas físicas y ventas por lote. Migración aditiva e idempotente.

create table if not exists lot_dispatches (
  id uuid primary key default gen_random_uuid(),
  reception_id uuid not null references receptions(id),
  dispatch_number bigint generated always as identity unique,
  customer_id uuid references parties(id),
  destination text not null,
  dispatched_kg numeric not null check (dispatched_kg > 0),
  document_ref text,
  vehicle_ref text,
  status text not null default 'confirmed' check (status in ('confirmed','cancelled')),
  dispatched_at timestamptz not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  cancelled_by text,
  cancelled_at timestamptz,
  cancellation_reason text
);
create index if not exists lot_dispatches_reception_time_idx on lot_dispatches(reception_id, dispatched_at desc);
create index if not exists lot_dispatches_customer_time_idx on lot_dispatches(customer_id, dispatched_at desc) where customer_id is not null;

create table if not exists lot_sales (
  id uuid primary key default gen_random_uuid(),
  reception_id uuid not null references receptions(id),
  dispatch_id uuid references lot_dispatches(id),
  customer_id uuid not null references parties(id),
  sold_kg numeric not null check (sold_kg > 0),
  price_per_kg_clp bigint not null check (price_per_kg_clp > 0),
  invoice_ref text,
  status text not null default 'confirmed' check (status in ('confirmed','cancelled')),
  sold_at timestamptz not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  cancelled_by text,
  cancelled_at timestamptz,
  cancellation_reason text
);
create index if not exists lot_sales_reception_time_idx on lot_sales(reception_id, sold_at desc);
create index if not exists lot_sales_customer_time_idx on lot_sales(customer_id, sold_at desc);
create index if not exists lot_sales_dispatch_idx on lot_sales(dispatch_id) where dispatch_id is not null;

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

create or replace function create_lot_dispatch(p_reception_id uuid,p_customer_id uuid,p_destination text,p_kg numeric,p_document_ref text,p_vehicle_ref text,p_dispatched_at timestamptz,p_created_by text) returns lot_dispatches language plpgsql as $$
declare r receptions%rowtype; base_kg numeric; used_kg numeric; result lot_dispatches;
begin
  select * into r from receptions where id=p_reception_id for update;
  if not found then raise exception 'Lote no disponible'; end if;
  select coalesce((select (metrics->>'outputKg')::numeric from lot_events where reception_id=p_reception_id and event_type='production' and metrics ? 'outputKg' order by occurred_at desc limit 1),r.accepted_kg,greatest(0,r.gross_kg-r.tare_kg)) into base_kg;
  select coalesce(sum(dispatched_kg),0) into used_kg from lot_dispatches where reception_id=p_reception_id and status='confirmed';
  if p_kg<=0 or p_kg>base_kg-used_kg+0.0001 then raise exception 'Salida supera disponibilidad'; end if;
  insert into lot_dispatches(reception_id,customer_id,destination,dispatched_kg,document_ref,vehicle_ref,dispatched_at,created_by) values(p_reception_id,p_customer_id,p_destination,p_kg,p_document_ref,p_vehicle_ref,p_dispatched_at,p_created_by) returning * into result;
  return result;
end $$;

create or replace function create_lot_sale(p_reception_id uuid,p_dispatch_id uuid,p_customer_id uuid,p_kg numeric,p_price_per_kg_clp bigint,p_invoice_ref text,p_sold_at timestamptz,p_created_by text) returns lot_sales language plpgsql as $$
declare r receptions%rowtype; base_kg numeric; sold_kg numeric; dispatch_available numeric; result lot_sales;
begin
  select * into r from receptions where id=p_reception_id for update;
  if not found then raise exception 'Lote no disponible'; end if;
  select coalesce((select (metrics->>'outputKg')::numeric from lot_events where reception_id=p_reception_id and event_type='production' and metrics ? 'outputKg' order by occurred_at desc limit 1),r.accepted_kg,greatest(0,r.gross_kg-r.tare_kg)) into base_kg;
  select coalesce(sum(sold_kg),0) into sold_kg from lot_sales where reception_id=p_reception_id and status='confirmed';
  if p_kg<=0 or p_price_per_kg_clp<=0 or p_kg>base_kg-sold_kg+0.0001 then raise exception 'Venta supera kilos físicos del lote'; end if;
  if p_dispatch_id is not null then
    select d.dispatched_kg-coalesce((select sum(s.sold_kg) from lot_sales s where s.dispatch_id=d.id and s.status='confirmed'),0) into dispatch_available from lot_dispatches d where d.id=p_dispatch_id and d.reception_id=p_reception_id and d.status='confirmed' for update;
    if dispatch_available is null or p_kg>dispatch_available+0.0001 then raise exception 'Venta supera el despacho seleccionado'; end if;
  end if;
  insert into lot_sales(reception_id,dispatch_id,customer_id,sold_kg,price_per_kg_clp,invoice_ref,sold_at,created_by) values(p_reception_id,p_dispatch_id,p_customer_id,p_kg,p_price_per_kg_clp,p_invoice_ref,p_sold_at,p_created_by) returning * into result;
  return result;
end $$;

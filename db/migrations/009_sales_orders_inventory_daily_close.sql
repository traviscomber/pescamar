-- 009_sales_orders_inventory_daily_close.sql
-- Planificación comercial, ubicación física y cierre diario. Aditiva e idempotente.

create table if not exists sales_orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  customer_id uuid not null references parties(id),
  plant_id text,
  species text not null,
  product text not null,
  committed_kg numeric not null check (committed_kg > 0),
  price_per_kg_clp bigint not null check (price_per_kg_clp > 0),
  delivery_date date not null,
  status text not null default 'pending' check (status in ('pending','prepared','dispatched','invoiced','cancelled')),
  notes text,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_by text,
  cancelled_at timestamptz,
  cancellation_reason text
);
create index if not exists sales_orders_delivery_status_idx on sales_orders(delivery_date,status);
create index if not exists sales_orders_customer_idx on sales_orders(customer_id,delivery_date desc);
create index if not exists sales_orders_plant_idx on sales_orders(plant_id,delivery_date) where plant_id is not null;

create table if not exists sales_order_allocations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references sales_orders(id) on delete cascade,
  reception_id uuid not null references receptions(id),
  allocated_kg numeric not null check (allocated_kg > 0),
  created_by text not null,
  created_at timestamptz not null default now(),
  unique(order_id,reception_id)
);
create index if not exists sales_order_allocations_reception_idx on sales_order_allocations(reception_id);

create table if not exists inventory_locations (
  id uuid primary key default gen_random_uuid(),
  plant_id text not null,
  name text not null,
  kind text not null default 'storage' check (kind in ('receiving','process','cold_storage','finished_goods','dispatch','other')),
  active boolean not null default true,
  created_by text not null,
  created_at timestamptz not null default now(),
  unique(plant_id,name)
);
create index if not exists inventory_locations_plant_active_idx on inventory_locations(plant_id,active,name);

create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  reception_id uuid not null references receptions(id),
  from_location_id uuid references inventory_locations(id),
  to_location_id uuid references inventory_locations(id),
  movement_type text not null check (movement_type in ('placement','transfer','adjustment_in','adjustment_out','waste')),
  moved_kg numeric not null check (moved_kg > 0),
  reason text,
  occurred_at timestamptz not null default now(),
  created_by text not null,
  created_at timestamptz not null default now(),
  check (from_location_id is not null or to_location_id is not null),
  check (from_location_id is null or to_location_id is null or from_location_id <> to_location_id)
);
create index if not exists inventory_movements_reception_time_idx on inventory_movements(reception_id,occurred_at desc);
create index if not exists inventory_movements_from_idx on inventory_movements(from_location_id,occurred_at desc) where from_location_id is not null;
create index if not exists inventory_movements_to_idx on inventory_movements(to_location_id,occurred_at desc) where to_location_id is not null;

create table if not exists daily_closes (
  id uuid primary key default gen_random_uuid(),
  close_date date not null,
  plant_id text,
  snapshot jsonb not null,
  notes text,
  generated_by text not null,
  generated_at timestamptz not null default now()
);
create unique index if not exists daily_closes_scope_date_unique on daily_closes(close_date,coalesce(plant_id,'__corporate__'));
create index if not exists daily_closes_generated_idx on daily_closes(generated_at desc);

create or replace function create_sales_order_allocation(
  p_order_id uuid,
  p_reception_id uuid,
  p_allocated_kg numeric,
  p_created_by text
) returns sales_order_allocations
language plpgsql
as $$
declare
  v_order sales_orders%rowtype;
  v_reception receptions%rowtype;
  v_committed numeric;
  v_order_allocated numeric;
  v_physical numeric;
  v_dispatched numeric;
  v_reserved_elsewhere numeric;
  v_row sales_order_allocations%rowtype;
begin
  if p_allocated_kg <= 0 then raise exception 'allocation_invalid'; end if;
  select * into v_order from sales_orders where id=p_order_id for update;
  if not found or v_order.status in ('cancelled','dispatched','invoiced') then raise exception 'order_not_allocatable'; end if;
  select * into v_reception from receptions where id=p_reception_id for update;
  if not found then raise exception 'reception_not_found'; end if;
  if v_order.plant_id is not null and v_reception.plant_id is distinct from v_order.plant_id then raise exception 'plant_mismatch'; end if;
  v_committed:=v_order.committed_kg;
  select coalesce(sum(allocated_kg),0) into v_order_allocated from sales_order_allocations where order_id=p_order_id and reception_id<>p_reception_id;
  if v_order_allocated+p_allocated_kg>v_committed then raise exception 'order_overallocated'; end if;
  select coalesce((select (metrics->>'outputKg')::numeric from lot_events where reception_id=p_reception_id and event_type='production' and metrics ? 'outputKg' order by occurred_at desc limit 1),v_reception.accepted_kg,greatest(0,v_reception.gross_kg-v_reception.tare_kg)) into v_physical;
  select coalesce(sum(dispatched_kg),0) into v_dispatched from lot_dispatches where reception_id=p_reception_id and status='confirmed';
  select coalesce(sum(a.allocated_kg),0) into v_reserved_elsewhere from sales_order_allocations a join sales_orders o on o.id=a.order_id where a.reception_id=p_reception_id and a.order_id<>p_order_id and o.status in ('pending','prepared');
  if p_allocated_kg>greatest(0,v_physical-v_dispatched-v_reserved_elsewhere) then raise exception 'lot_overreserved'; end if;
  insert into sales_order_allocations(order_id,reception_id,allocated_kg,created_by)
  values(p_order_id,p_reception_id,p_allocated_kg,p_created_by)
  on conflict(order_id,reception_id) do update set allocated_kg=excluded.allocated_kg,created_by=excluded.created_by,created_at=now()
  returning * into v_row;
  update sales_orders set status=case when v_order_allocated+p_allocated_kg>=committed_kg then 'prepared' else status end,updated_at=now() where id=p_order_id;
  return v_row;
end $$;

create or replace function record_inventory_movement(
  p_reception_id uuid,
  p_from_location_id uuid,
  p_to_location_id uuid,
  p_movement_type text,
  p_moved_kg numeric,
  p_reason text,
  p_created_by text
) returns inventory_movements
language plpgsql
as $$
declare
  v_reception receptions%rowtype;
  v_physical numeric;
  v_located numeric;
  v_from_balance numeric;
  v_row inventory_movements%rowtype;
begin
  if p_moved_kg<=0 or p_movement_type not in ('placement','transfer','adjustment_in','adjustment_out','waste') then raise exception 'movement_invalid'; end if;
  select * into v_reception from receptions where id=p_reception_id for update;
  if not found then raise exception 'reception_not_found'; end if;
  if p_from_location_id is not null and not exists(select 1 from inventory_locations where id=p_from_location_id and plant_id=v_reception.plant_id and active) then raise exception 'source_location_invalid'; end if;
  if p_to_location_id is not null and not exists(select 1 from inventory_locations where id=p_to_location_id and plant_id=v_reception.plant_id and active) then raise exception 'target_location_invalid'; end if;
  select coalesce((select (metrics->>'outputKg')::numeric from lot_events where reception_id=p_reception_id and event_type='production' and metrics ? 'outputKg' order by occurred_at desc limit 1),v_reception.accepted_kg,greatest(0,v_reception.gross_kg-v_reception.tare_kg)) into v_physical;
  select coalesce(sum(case when to_location_id is not null then moved_kg else 0 end)-sum(case when from_location_id is not null then moved_kg else 0 end),0) into v_located from inventory_movements where reception_id=p_reception_id;
  if p_from_location_id is not null then
    select coalesce(sum(case when to_location_id=p_from_location_id then moved_kg else 0 end)-sum(case when from_location_id=p_from_location_id then moved_kg else 0 end),0) into v_from_balance from inventory_movements where reception_id=p_reception_id;
    if p_moved_kg>v_from_balance then raise exception 'location_insufficient_stock'; end if;
  end if;
  if p_from_location_id is null and p_to_location_id is not null and p_movement_type in ('placement','adjustment_in') and v_located+p_moved_kg>v_physical then raise exception 'lot_overlocated'; end if;
  insert into inventory_movements(reception_id,from_location_id,to_location_id,movement_type,moved_kg,reason,created_by)
  values(p_reception_id,p_from_location_id,p_to_location_id,p_movement_type,p_moved_kg,nullif(trim(p_reason),''),p_created_by)
  returning * into v_row;
  return v_row;
end $$;

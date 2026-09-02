-- Pescamar regulatory hold foundation
-- Holds are append-audited and enforced at the database dispatch boundary.

create table if not exists regulatory_holds (
  id uuid primary key default gen_random_uuid(),
  plant_id text not null,
  authority text not null check (authority ~ '^[a-z0-9][a-z0-9_-]{1,49}$'),
  reception_id uuid references receptions(id) on delete restrict,
  pallet_id uuid references pallets(id) on delete restrict,
  packing_unit_id uuid references packing_units(id) on delete restrict,
  status text not null default 'open' check (status in ('open','released','rejected')),
  reason text not null check (nullif(trim(reason),'') is not null),
  document_ref text,
  evidence_url text,
  opened_by_operator_id uuid not null references operators(id),
  opened_at timestamptz not null default now(),
  resolved_by_operator_id uuid references operators(id),
  resolved_at timestamptz,
  resolution_note text,
  updated_at timestamptz not null default now(),
  check ((reception_id is not null)::int + (pallet_id is not null)::int + (packing_unit_id is not null)::int = 1),
  check ((status='open' and resolved_by_operator_id is null and resolved_at is null) or (status<>'open' and resolved_by_operator_id is not null and resolved_at is not null and nullif(trim(resolution_note),'') is not null))
);

create table if not exists regulatory_hold_events (
  id uuid primary key default gen_random_uuid(),
  hold_id uuid not null references regulatory_holds(id) on delete restrict,
  event_type text not null check (event_type in ('opened','released','rejected')),
  note text not null check (nullif(trim(note),'') is not null),
  document_ref text,
  evidence_url text,
  actor_operator_id uuid not null references operators(id),
  occurred_at timestamptz not null default now()
);

create unique index if not exists regulatory_holds_open_reception_authority_unique on regulatory_holds(reception_id,authority) where reception_id is not null and status='open';
create unique index if not exists regulatory_holds_open_pallet_authority_unique on regulatory_holds(pallet_id,authority) where pallet_id is not null and status='open';
create unique index if not exists regulatory_holds_open_packing_authority_unique on regulatory_holds(packing_unit_id,authority) where packing_unit_id is not null and status='open';
create index if not exists regulatory_holds_plant_status_idx on regulatory_holds(plant_id,status,opened_at desc);
create index if not exists regulatory_hold_events_hold_time_idx on regulatory_hold_events(hold_id,occurred_at);

create or replace function regulatory_reception_is_blocked(p_reception_id uuid) returns boolean
language sql stable as $$
  select exists(
    select 1
    from regulatory_holds h
    where h.status in ('open','rejected')
      and (
        h.reception_id=p_reception_id
        or (h.packing_unit_id is not null and exists(
          select 1 from packing_units u
          where u.id=h.packing_unit_id and u.reception_id=p_reception_id
        ))
        or (h.pallet_id is not null and exists(
          select 1
          from pallet_packing_units i
          join packing_units u on u.id=i.packing_unit_id
          where i.pallet_id=h.pallet_id
            and i.removed_at is null
            and u.reception_id=p_reception_id
        ))
      )
  )
$$;

create or replace function enforce_regulatory_dispatch_hold() returns trigger
language plpgsql as $$
begin
  if new.status='confirmed' and regulatory_reception_is_blocked(new.reception_id) then
    raise exception 'Lote bloqueado por control regulatorio';
  end if;
  return new;
end $$;

drop trigger if exists lot_dispatches_regulatory_hold_gate on lot_dispatches;
create trigger lot_dispatches_regulatory_hold_gate
before insert or update of reception_id,status on lot_dispatches
for each row execute function enforce_regulatory_dispatch_hold();

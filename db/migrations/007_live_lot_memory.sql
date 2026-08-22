create table if not exists lot_events (
  id uuid primary key default gen_random_uuid(),
  reception_id uuid not null references receptions(id) on delete cascade,
  event_type text not null check (event_type in ('quality','production','note')),
  title text not null,
  detail text,
  metrics jsonb not null default '{}'::jsonb,
  created_by text not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists lot_events_reception_time_idx on lot_events(reception_id,occurred_at desc);

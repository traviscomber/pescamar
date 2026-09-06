create table if not exists lot_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  reception_id uuid not null references receptions(id) on delete cascade,
  action text not null check (action in ('close','reopen')),
  reason text not null check (char_length(btrim(reason)) between 5 and 500),
  snapshot jsonb not null default '{}'::jsonb,
  created_by text not null,
  created_by_operator_id uuid references operators(id),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists lot_lifecycle_events_reception_time_idx
  on lot_lifecycle_events(reception_id,occurred_at desc,id desc);

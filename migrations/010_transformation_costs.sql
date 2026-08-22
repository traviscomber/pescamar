-- Additive cost ledger for real transformation costs by live lot.
create table if not exists transformation_costs (
  id uuid primary key default gen_random_uuid(),
  reception_id uuid not null references receptions(id) on delete cascade,
  category text not null check (category in ('labor','energy','ice','packaging','transport','processing','other')),
  amount_clp numeric not null check (amount_clp >= 0),
  quantity numeric null check (quantity is null or quantity >= 0),
  unit text null,
  note text null,
  occurred_at timestamptz not null default now(),
  created_by text not null,
  created_at timestamptz not null default now()
);
create index if not exists transformation_costs_reception_time_idx on transformation_costs(reception_id, occurred_at desc);
create index if not exists transformation_costs_category_time_idx on transformation_costs(category, occurred_at desc);

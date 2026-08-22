-- Controles de abuso y auditoría mínima de autenticación.

create table if not exists auth_login_limits (
  key_hash text primary key,
  attempts integer not null default 0 check (attempts >= 0),
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists auth_login_limits_expiry_idx
  on auth_login_limits (blocked_until, updated_at);

create table if not exists auth_events (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in ('login_success','login_failure','login_rate_limited','logout')),
  operator_id uuid references operators(id) on delete set null,
  email_hash text,
  ip_hash text,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists auth_events_occurred_idx
  on auth_events (occurred_at desc);
create index if not exists auth_events_operator_idx
  on auth_events (operator_id, occurred_at desc);

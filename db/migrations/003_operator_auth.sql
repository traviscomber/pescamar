-- Identidad individual para operadores y sesiones de servidor.
-- ADMIN_SETUP_TOKEN queda reservado al bootstrap administrativo; no autentica operaciones.

alter table operators add column if not exists password_hash text;
alter table operators add column if not exists plant_ids text[] not null default '{}';

create table if not exists operator_sessions (
  token_hash text primary key,
  operator_id uuid not null references operators(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists operator_sessions_operator_idx
  on operator_sessions (operator_id, expires_at desc);
create index if not exists operator_sessions_expiry_idx
  on operator_sessions (expires_at);

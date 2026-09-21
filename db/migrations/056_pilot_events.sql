-- Pilot friction instrumentation: route-visit beacons from authenticated clients.
-- Events are anonymous beyond the operator id and role stamped server-side from
-- the session. They never carry query strings, payloads of product data or PII,
-- and they never modify operational state. They exist to decide, with evidence,
-- when pilot UX friction has dropped enough to reactivate product iteration.

create table if not exists pilot_events (
  id bigint generated always as identity primary key,
  operator_id uuid not null references operators(id) on delete restrict,
  role text not null,
  event text not null check (event in ('route_visited')),
  path text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint pilot_events_path_check check (path ~ '^/[A-Za-z0-9._~!$&''()*+,;=:@%/-]*$' and length(path) <= 200)
);

create index if not exists pilot_events_created_idx on pilot_events(created_at desc);
create index if not exists pilot_events_operator_idx on pilot_events(operator_id,created_at desc);
create index if not exists pilot_events_path_idx on pilot_events(path,created_at desc);

insert into schema_migrations(migration_name,evidence_kind,applied_at,details)
values(
  '056_pilot_events.sql',
  'applied',
  now(),
  jsonb_build_object(
    'attestation','pilot_friction_route_visit_telemetry',
    'source','canonical_migration',
    'operational_writes',false,
    'query_strings_stored',false,
    'role_from_session_only',true,
    'historical_execution_reconstructed',false
  )
)
on conflict(migration_name) do nothing;

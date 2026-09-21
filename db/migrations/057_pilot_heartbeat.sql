-- Pilot instrumentation heartbeat: allow one instrumentation_heartbeat per
-- mounted session alongside route_visited. The heartbeat exists so a dead
-- telemetry pipeline is detected within minutes (a session that never emits
-- it is running stale or blocked client code), even when the operator parks
-- on /admin surfaces where route visits are not instrumented. No operational
-- state, no PII, role always stamped server-side from the session.

do $$
declare
  event_check text;
begin
  select con.conname into event_check
  from pg_constraint con
  join pg_class rel on rel.oid=con.conrelid
  join pg_namespace nsp on nsp.oid=rel.relnamespace
  where nsp.nspname='public' and rel.relname='pilot_events'
    and con.contype='c' and con.conname like '%event%'
  limit 1;
  if event_check is not null then
    execute format('alter table pilot_events drop constraint %I', event_check);
  end if;
end $$;

alter table pilot_events add constraint pilot_events_event_check
  check (event in ('route_visited','instrumentation_heartbeat'));

insert into schema_migrations(migration_name,evidence_kind,applied_at,details)
values(
  '057_pilot_heartbeat.sql',
  'applied',
  now(),
  jsonb_build_object(
    'attestation','pilot_instrumentation_heartbeat',
    'source','canonical_migration',
    'operational_writes',false,
    'query_strings_stored',false,
    'role_from_session_only',true
  )
)
on conflict(migration_name) do nothing;

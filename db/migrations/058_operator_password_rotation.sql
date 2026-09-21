-- Operator credential lifecycle for pilot onboarding: every password set by
-- an administrator or operations manager is temporary by design and must be
-- changed by the operator at first login. Also extends the auth_events event
-- check so identity lifecycle actions (creation, reset, self-service change)
-- are auditable alongside login events. No operational state, no PII beyond
-- the existing auth_events pattern (hashes only).

alter table operators
  add column if not exists must_change_password boolean not null default false;

do $$
declare
  event_check text;
begin
  select con.conname into event_check
  from pg_constraint con
  join pg_class rel on rel.oid=con.conrelid
  join pg_namespace nsp on nsp.oid=rel.relnamespace
  where nsp.nspname='public' and rel.relname='auth_events'
    and con.contype='c' and con.conname like '%event%'
  limit 1;
  if event_check is not null then
    execute format('alter table auth_events drop constraint %I', event_check);
  end if;
end $$;

alter table auth_events add constraint auth_events_event_type_check
  check (event_type in ('login_success','login_failure','login_rate_limited','logout','operator_created','password_reset','password_changed'));

insert into schema_migrations(migration_name,evidence_kind,applied_at,details)
values(
  '058_operator_password_rotation.sql',
  'applied',
  now(),
  jsonb_build_object(
    'attestation','operator_credential_lifecycle',
    'source','canonical_migration',
    'operational_writes',false,
    'temporary_password_forced_change',true,
    'auth_events_extended',true,
    'role_from_session_only',true
  )
)
on conflict(migration_name) do nothing;

-- Santa Rosa: séptima planta del catálogo operacional. Expansión de los dos
-- CHECK de plant_id (receptions y plant_identity_links) para incluir 'santa-rosa'.
-- Expand-only: sólo amplía las listas permitidas; no reescribe, mueve ni borra datos.
-- Decisión evidence-based 2026-09-21: sitio histórico distinto de Planta Quellón
-- (sector Santa Rosa, zona de extracción Quellón): 87 registros históricos
-- abr-2025–jun-2026 y 121 canónicos hasta sep-2026; ninguna de las 6 plantas del
-- catálogo coincide con la evidencia; pendiente confirmación en terreno.

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'receptions_plant_id_check'
  ) then
    alter table receptions drop constraint receptions_plant_id_check;
  end if;
end $$;

alter table receptions add constraint receptions_plant_id_check
  check (plant_id is null or plant_id in ('ancud','quellon','iquique','piedra-azul','aqua-austral','natales','santa-rosa'));

do $$
declare
  plant_check text;
begin
  select con.conname into plant_check
  from pg_constraint con
  join pg_class rel on rel.oid=con.conrelid
  join pg_namespace nsp on nsp.oid=rel.relnamespace
  where nsp.nspname='public' and rel.relname='plant_identity_links'
    and con.contype='c'
    and pg_get_constraintdef(con.oid) like '%aqua-austral%'
  limit 1;
  if plant_check is not null then
    execute format('alter table plant_identity_links drop constraint %I', plant_check);
  end if;
end $$;

alter table plant_identity_links add constraint plant_identity_links_plant_id_check
  check (plant_id is null or plant_id in ('ancud','quellon','iquique','piedra-azul','aqua-austral','natales','santa-rosa'));

insert into schema_migrations(migration_name,evidence_kind,applied_at,details)
values(
  '060_santa_rosa_plant.sql',
  'applied',
  now(),
  jsonb_build_object(
    'attestation','santa_rosa_seventh_plant',
    'source','canonical_migration',
    'expand_only',true,
    'evidence_based_decision',true,
    'pending_field_confirmation',true,
    'operational_writes',false
  )
)
on conflict(migration_name) do nothing;

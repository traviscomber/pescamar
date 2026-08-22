-- Alcance por planta y evidencia documental de recepciones.
-- Aditiva y compatible con instalaciones que ya aplicaron 001-003.

alter table receptions add column if not exists plant_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'receptions_plant_id_check'
  ) then
    alter table receptions add constraint receptions_plant_id_check
      check (plant_id is null or plant_id in ('ancud','quellon','iquique','piedra-azul','aqua-austral','natales'));
  end if;
end $$;

create index if not exists receptions_plant_received_idx
  on receptions (plant_id, received_at desc);

create table if not exists reception_evidence (
  id uuid primary key default gen_random_uuid(),
  reception_id uuid not null references receptions(id) on delete cascade,
  kind text not null check (kind in ('document','photo','certificate','other')),
  label text not null check (length(trim(label)) >= 2),
  url text not null check (length(trim(url)) >= 8),
  note text,
  created_by text not null,
  created_at timestamptz not null default now()
);

create index if not exists reception_evidence_reception_idx
  on reception_evidence (reception_id, created_at desc);

-- Seafood Intelligence OS · GS1 identity registry foundation
-- External identifiers are evidence-backed links. No GS1 identifier is generated from internal IDs.

create or replace function gs1_mod10_valid(p_value text)
returns boolean
language plpgsql
immutable
strict
as $$
declare
  i integer;
  total integer := 0;
  multiplier integer := 3;
  expected integer;
begin
  if p_value !~ '^[0-9]+$' or length(p_value) < 2 then return false; end if;
  i := length(p_value)-1;
  while i >= 1 loop
    total := total + substring(p_value from i for 1)::integer * multiplier;
    multiplier := case when multiplier=3 then 1 else 3 end;
    i := i-1;
  end loop;
  expected := (10 - (total % 10)) % 10;
  return expected = right(p_value,1)::integer;
end $$;

create table if not exists gs1_identity_links (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null check (length(trim(organization_id)) > 0),
  key_type text not null check (key_type in ('gtin','gln_location','gln_party','sscc')),
  gs1_value text not null,
  entity_type text not null check (entity_type in ('packing_spec','plant','inventory_location','party','pallet')),
  party_id uuid references parties(id) on delete restrict,
  plant_id text,
  inventory_location_id uuid references inventory_locations(id) on delete restrict,
  packing_spec_id uuid references packing_specs(id) on delete restrict,
  pallet_id uuid references pallets(id) on delete restrict,
  link_status text not null default 'candidate' check (link_status in ('candidate','confirmed','rejected')),
  source_system text not null check (length(trim(source_system)) > 0),
  source_reference text not null check (length(trim(source_reference)) > 0),
  evidence jsonb not null check (jsonb_typeof(evidence)='object' and evidence <> '{}'::jsonb),
  standard_version text not null default 'gs1-digital-link-1.7.0' check (standard_version='gs1-digital-link-1.7.0'),
  created_by_operator_id uuid references operators(id) on delete restrict,
  reviewed_by_operator_id uuid references operators(id) on delete restrict,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (plant_id is null or length(trim(plant_id)) > 0),
  check (num_nonnulls(party_id,plant_id,inventory_location_id,packing_spec_id,pallet_id)=1),
  check (
    (entity_type='party' and key_type='gln_party' and party_id is not null) or
    (entity_type='plant' and key_type='gln_location' and plant_id is not null) or
    (entity_type='inventory_location' and key_type='gln_location' and inventory_location_id is not null) or
    (entity_type='packing_spec' and key_type='gtin' and packing_spec_id is not null) or
    (entity_type='pallet' and key_type='sscc' and pallet_id is not null)
  ),
  check (
    (key_type='gtin' and gs1_value ~ '^[0-9]{14}$') or
    (key_type in ('gln_location','gln_party') and gs1_value ~ '^[0-9]{13}$') or
    (key_type='sscc' and gs1_value ~ '^[0-9]{18}$')
  ),
  check (gs1_mod10_valid(gs1_value)),
  check (
    (link_status='candidate' and reviewed_by_operator_id is null and reviewed_at is null and review_note is null) or
    (link_status in ('confirmed','rejected') and reviewed_by_operator_id is not null and reviewed_at is not null and nullif(trim(review_note),'') is not null)
  )
);

create unique index if not exists gs1_identity_links_active_key_unique
  on gs1_identity_links(organization_id,key_type,gs1_value)
  where link_status in ('candidate','confirmed');
create index if not exists gs1_identity_links_org_status_idx on gs1_identity_links(organization_id,link_status,key_type);
create index if not exists gs1_identity_links_party_idx on gs1_identity_links(party_id) where party_id is not null;
create index if not exists gs1_identity_links_location_idx on gs1_identity_links(inventory_location_id) where inventory_location_id is not null;
create index if not exists gs1_identity_links_packing_spec_idx on gs1_identity_links(packing_spec_id) where packing_spec_id is not null;
create index if not exists gs1_identity_links_pallet_idx on gs1_identity_links(pallet_id) where pallet_id is not null;

insert into schema_migrations(migration_name,evidence_kind,applied_at,details)
values (
  '052_gs1_identity_registry.sql',
  'applied',
  now(),
  jsonb_build_object(
    'source','canonical_migration',
    'purpose','gs1_identity_registry_foundation',
    'digital_link_version','1.7.0',
    'automatic_identifier_generation',false,
    'human_review_required',true,
    'external_writes',false
  )
)
on conflict (migration_name) do nothing;

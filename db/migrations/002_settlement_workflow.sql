-- Flujo auditable: recepción -> liquidación -> recuperación de anticipo.
-- Compatible con instalaciones que ya aplicaron 001_core.sql.

alter table receptions add column if not exists guide_kg numeric(12,3);
update receptions set guide_kg = gross_kg where guide_kg is null;
alter table receptions alter column guide_kg set not null;
alter table receptions drop constraint if exists receptions_guide_kg_check;
alter table receptions add constraint receptions_guide_kg_check check (guide_kg >= 0);

alter table settlements add column if not exists price_per_kg_clp bigint;
alter table settlements add column if not exists credit_recovery_clp bigint not null default 0;
alter table settlements add column if not exists created_by text;
alter table settlements add column if not exists approved_by text;
alter table settlements add column if not exists calculation_snapshot jsonb not null default '{}'::jsonb;
alter table settlements add column if not exists updated_at timestamptz not null default now();

update settlements
set price_per_kg_clp = case
  when price_per_kg_clp is null and gross_amount_clp > 0 then 1
  else price_per_kg_clp
end,
created_by = coalesce(created_by, 'Migración 002')
where price_per_kg_clp is null or created_by is null;

alter table settlements alter column price_per_kg_clp set not null;
alter table settlements alter column created_by set not null;
alter table settlements drop constraint if exists settlements_price_check;
alter table settlements add constraint settlements_price_check check (price_per_kg_clp > 0);
alter table settlements drop constraint if exists settlements_recovery_check;
alter table settlements add constraint settlements_recovery_check check (credit_recovery_clp >= 0);
alter table settlements drop constraint if exists settlements_net_check;
alter table settlements add constraint settlements_net_check check (net_amount_clp is null or net_amount_clp >= 0);

create unique index if not exists credit_movements_advance_request_unique
  on credit_movements (credit_request_id) where kind = 'advance';
create unique index if not exists credit_movements_recovery_settlement_unique
  on credit_movements (settlement_id) where kind = 'recovery';
create index if not exists settlements_status_created_idx
  on settlements (status, created_at desc);


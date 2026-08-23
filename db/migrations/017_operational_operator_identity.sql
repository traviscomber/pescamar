-- Stable operator identity across the live 2026 operating chain.
-- Additive: legacy human-readable actor fields remain for display/backward compatibility.

alter table receptions add column if not exists created_by_operator_id uuid;
alter table reception_evidence add column if not exists created_by_operator_id uuid;
alter table lot_events add column if not exists created_by_operator_id uuid;
alter table inventory_locations add column if not exists created_by_operator_id uuid;
alter table inventory_movements add column if not exists created_by_operator_id uuid;
alter table transformation_costs add column if not exists created_by_operator_id uuid;
alter table lot_dispatches add column if not exists created_by_operator_id uuid;
alter table lot_sales add column if not exists created_by_operator_id uuid;
alter table sales_orders add column if not exists created_by_operator_id uuid;
alter table sales_order_allocations add column if not exists created_by_operator_id uuid;
alter table daily_closes add column if not exists generated_by_operator_id uuid;

alter table receptions drop constraint if exists receptions_created_by_operator_id_fkey;
alter table receptions add constraint receptions_created_by_operator_id_fkey foreign key (created_by_operator_id) references operators(id) not valid;
alter table reception_evidence drop constraint if exists reception_evidence_created_by_operator_id_fkey;
alter table reception_evidence add constraint reception_evidence_created_by_operator_id_fkey foreign key (created_by_operator_id) references operators(id) not valid;
alter table lot_events drop constraint if exists lot_events_created_by_operator_id_fkey;
alter table lot_events add constraint lot_events_created_by_operator_id_fkey foreign key (created_by_operator_id) references operators(id) not valid;
alter table inventory_locations drop constraint if exists inventory_locations_created_by_operator_id_fkey;
alter table inventory_locations add constraint inventory_locations_created_by_operator_id_fkey foreign key (created_by_operator_id) references operators(id) not valid;
alter table inventory_movements drop constraint if exists inventory_movements_created_by_operator_id_fkey;
alter table inventory_movements add constraint inventory_movements_created_by_operator_id_fkey foreign key (created_by_operator_id) references operators(id) not valid;
alter table transformation_costs drop constraint if exists transformation_costs_created_by_operator_id_fkey;
alter table transformation_costs add constraint transformation_costs_created_by_operator_id_fkey foreign key (created_by_operator_id) references operators(id) not valid;
alter table lot_dispatches drop constraint if exists lot_dispatches_created_by_operator_id_fkey;
alter table lot_dispatches add constraint lot_dispatches_created_by_operator_id_fkey foreign key (created_by_operator_id) references operators(id) not valid;
alter table lot_sales drop constraint if exists lot_sales_created_by_operator_id_fkey;
alter table lot_sales add constraint lot_sales_created_by_operator_id_fkey foreign key (created_by_operator_id) references operators(id) not valid;
alter table sales_orders drop constraint if exists sales_orders_created_by_operator_id_fkey;
alter table sales_orders add constraint sales_orders_created_by_operator_id_fkey foreign key (created_by_operator_id) references operators(id) not valid;
alter table sales_order_allocations drop constraint if exists sales_order_allocations_created_by_operator_id_fkey;
alter table sales_order_allocations add constraint sales_order_allocations_created_by_operator_id_fkey foreign key (created_by_operator_id) references operators(id) not valid;
alter table daily_closes drop constraint if exists daily_closes_generated_by_operator_id_fkey;
alter table daily_closes add constraint daily_closes_generated_by_operator_id_fkey foreign key (generated_by_operator_id) references operators(id) not valid;

create index if not exists receptions_created_by_operator_idx on receptions(created_by_operator_id);
create index if not exists reception_evidence_created_by_operator_idx on reception_evidence(created_by_operator_id);
create index if not exists lot_events_created_by_operator_idx on lot_events(created_by_operator_id);
create index if not exists inventory_locations_created_by_operator_idx on inventory_locations(created_by_operator_id);
create index if not exists inventory_movements_created_by_operator_idx on inventory_movements(created_by_operator_id);
create index if not exists transformation_costs_created_by_operator_idx on transformation_costs(created_by_operator_id);
create index if not exists lot_dispatches_created_by_operator_idx on lot_dispatches(created_by_operator_id);
create index if not exists lot_sales_created_by_operator_idx on lot_sales(created_by_operator_id);
create index if not exists sales_orders_created_by_operator_idx on sales_orders(created_by_operator_id);
create index if not exists sales_order_allocations_created_by_operator_idx on sales_order_allocations(created_by_operator_id);
create index if not exists daily_closes_generated_by_operator_idx on daily_closes(generated_by_operator_id);

alter table receptions validate constraint receptions_created_by_operator_id_fkey;
alter table reception_evidence validate constraint reception_evidence_created_by_operator_id_fkey;
alter table lot_events validate constraint lot_events_created_by_operator_id_fkey;
alter table inventory_locations validate constraint inventory_locations_created_by_operator_id_fkey;
alter table inventory_movements validate constraint inventory_movements_created_by_operator_id_fkey;
alter table transformation_costs validate constraint transformation_costs_created_by_operator_id_fkey;
alter table lot_dispatches validate constraint lot_dispatches_created_by_operator_id_fkey;
alter table lot_sales validate constraint lot_sales_created_by_operator_id_fkey;
alter table sales_orders validate constraint sales_orders_created_by_operator_id_fkey;
alter table sales_order_allocations validate constraint sales_order_allocations_created_by_operator_id_fkey;
alter table daily_closes validate constraint daily_closes_generated_by_operator_id_fkey;

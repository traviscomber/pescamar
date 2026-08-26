-- General product labels for Pescamar.
-- Labels are transversal to all species and processes; erizo is only one consumer.

alter table if exists sea_urchin_labels rename to product_labels;

alter table product_labels
  add column if not exists reception_id uuid references receptions(id) on delete cascade,
  add column if not exists species text,
  add column if not exists packing_format text,
  add column if not exists process_type text,
  add column if not exists updated_at timestamptz not null default now();

alter table product_labels alter column run_id drop not null;

update product_labels l
set reception_id = u.reception_id,
    species = coalesce(l.species, r.species),
    process_type = coalesce(l.process_type, 'erizo')
from sea_urchin_process_runs u
join receptions r on r.id = u.reception_id
where l.run_id = u.id
  and l.reception_id is null;

alter table product_labels
  alter column reception_id set not null;

create index if not exists idx_product_labels_reception_status on product_labels(reception_id,status);
create index if not exists idx_product_labels_order_status on product_labels(sales_order_id,status) where sales_order_id is not null;
create index if not exists idx_product_labels_message on product_labels(source_message_id) where source_message_id is not null;
create index if not exists idx_product_labels_species on product_labels(species,status);

comment on table product_labels is 'Etiquetas sensibles transversales de Pescamar para cualquier especie, lote, packing u orden.';

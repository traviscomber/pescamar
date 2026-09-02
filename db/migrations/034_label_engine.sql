-- Pescamar Plant Execution label engine foundation
-- Versioned label definitions + auditable print queue. No printer driver is assumed here.

create table if not exists label_templates (
  id uuid primary key default gen_random_uuid(),
  plant_id text,
  code text not null,
  version integer not null check (version > 0),
  name text not null,
  width_mm numeric(8,2) check (width_mm is null or width_mm > 0),
  height_mm numeric(8,2) check (height_mm is null or height_mm > 0),
  barcode_format text not null default 'code128' check (barcode_format in ('none','code128','gs1_128','ean13','qrcode','data_matrix')),
  definition jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_by_operator_id uuid references operators(id),
  created_at timestamptz not null default now()
);

create unique index if not exists label_templates_scope_code_version_unique on label_templates(coalesce(plant_id,''),code,version);
create index if not exists label_templates_active_idx on label_templates(active,code,version desc);

alter table product_labels
  add column if not exists packing_unit_id uuid references packing_units(id) on delete set null,
  add column if not exists label_template_id uuid references label_templates(id) on delete set null;

create index if not exists product_labels_packing_unit_idx on product_labels(packing_unit_id) where packing_unit_id is not null;
create index if not exists product_labels_template_idx on product_labels(label_template_id) where label_template_id is not null;

create table if not exists label_print_jobs (
  id uuid primary key default gen_random_uuid(),
  plant_id text not null,
  packing_unit_id uuid not null references packing_units(id),
  product_label_id uuid references product_labels(id),
  label_template_id uuid not null references label_templates(id),
  printer_device_id uuid not null references plant_devices(id),
  requested_by_operator_id uuid not null references operators(id),
  copies integer not null default 1 check (copies between 1 and 20),
  status text not null default 'queued' check (status in ('queued','sent','printed','failed','cancelled','reprinted')),
  payload_snapshot jsonb not null,
  idempotency_key text not null,
  source_job_id uuid references label_print_jobs(id),
  error_message text,
  requested_at timestamptz not null default now(),
  sent_at timestamptz,
  printed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(plant_id,idempotency_key)
);

create index if not exists label_print_jobs_queue_idx on label_print_jobs(plant_id,status,requested_at);
create index if not exists label_print_jobs_packing_idx on label_print_jobs(packing_unit_id,requested_at desc);
create index if not exists label_print_jobs_printer_idx on label_print_jobs(printer_device_id,status,requested_at);

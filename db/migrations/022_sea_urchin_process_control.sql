-- Pescamar sea urchin process control
-- Stages and target values come from the 2026 sea urchin process material and operational input.
-- Stage rows are initialized by the API when a sea urchin run starts.

create table if not exists sea_urchin_process_runs (
  id uuid primary key default gen_random_uuid(),
  reception_id uuid not null references receptions(id) on delete cascade,
  status text not null default 'in_process' check (status in ('in_process','hold','ready_for_packing','released','closed')),
  grade text check (grade is null or grade in ('A','B','C','D','E')),
  finger_class text check (finger_class is null or finger_class in ('A','B','C','D','E')),
  color_code text,
  color_status text not null default 'pending' check (color_status in ('pending','accepted','ng','review')),
  xray_status text not null default 'pending' check (xray_status in ('pending','passed','failed','review')),
  packing_format text,
  output_kg numeric(14,3),
  notes text,
  created_by text not null,
  created_by_operator_id uuid references operators(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(reception_id)
);

create table if not exists sea_urchin_stage_checks (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references sea_urchin_process_runs(id) on delete cascade,
  stage text not null check (stage in ('pinching','blanching','thermal_shock','sanitary_break','dripping','draining','molding','color','xray','freezing','packing')),
  sequence_no integer not null,
  target_temperature_c numeric(6,2),
  target_duration_seconds integer,
  actual_temperature_c numeric(6,2),
  actual_duration_seconds integer,
  status text not null default 'pending' check (status in ('pending','ok','deviation','hold','not_applicable')),
  evidence_url text,
  evidence_message_id uuid references whatsapp_messages_raw(id) on delete set null,
  note text,
  checked_by text,
  checked_by_operator_id uuid references operators(id),
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  unique(run_id,stage)
);

create table if not exists sea_urchin_labels (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references sea_urchin_process_runs(id) on delete cascade,
  label_code text not null,
  product text,
  grade text check (grade is null or grade in ('A','B','C','D','E')),
  lot_code text,
  net_kg numeric(14,3),
  destination text,
  sales_order_id uuid references sales_orders(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','validated','mismatch','blocked')),
  mismatch_reason text,
  source_message_id uuid references whatsapp_messages_raw(id) on delete set null,
  source_document_url text,
  validated_by text,
  validated_by_operator_id uuid references operators(id),
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  unique(run_id,label_code)
);

create index if not exists idx_urchin_runs_status on sea_urchin_process_runs(status,updated_at desc);
create index if not exists idx_urchin_checks_run on sea_urchin_stage_checks(run_id,sequence_no);
create index if not exists idx_urchin_labels_run_status on sea_urchin_labels(run_id,status);

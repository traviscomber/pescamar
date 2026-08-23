create table if not exists reception_evidence_files (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  mime_type text not null,
  data_base64 text not null,
  byte_size integer not null check (byte_size > 0),
  created_by text not null,
  created_at timestamptz not null default now()
);

create index if not exists reception_evidence_files_created_idx
  on reception_evidence_files (created_at desc);

-- Japan export release evidence for Pescamar.
-- Additive only: does not release product by itself. Every manual gate is tied to a reception and operator.

create table if not exists japan_export_release_evidence (
  id uuid primary key default gen_random_uuid(),
  reception_id uuid not null references receptions(id) on delete restrict,
  gate_code text not null check (gate_code in (
    'plant_japan_authorized',
    'pac_japan_scope',
    'origin_legal',
    'lab_release',
    'cold_chain_release',
    'neppex_approved',
    'health_certificate',
    'japan_importer_ready',
    'japan_label_compliance',
    'final_quality_release'
  )),
  status text not null check (status in ('approved','rejected','expired')),
  document_ref text,
  evidence_url text,
  note text,
  valid_until date,
  verified_by_operator_id uuid not null references operators(id),
  verified_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status<>'approved' or document_ref is not null or evidence_url is not null),
  check (note is null or nullif(trim(note),'') is not null)
);

create index if not exists japan_export_release_evidence_reception_gate_idx
  on japan_export_release_evidence(reception_id,gate_code,verified_at desc);

create unique index if not exists japan_export_release_evidence_current_unique
  on japan_export_release_evidence(reception_id,gate_code)
  where status='approved';

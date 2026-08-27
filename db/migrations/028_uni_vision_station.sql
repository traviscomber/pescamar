-- Pescamar Uni Vision Station
-- Objective, explainable sea urchin roe color measurement.
-- No automatic grade thresholds are seeded: references must be approved from real plant samples.

alter table reception_evidence_files add column if not exists created_by_operator_id uuid;

create table if not exists sea_urchin_color_references (
  id uuid primary key default gen_random_uuid(),
  plant_id text not null,
  grade text not null check (grade in ('A','B','C','D','E')),
  label text,
  l_mean numeric(8,4) not null check (l_mean between 0 and 100),
  a_mean numeric(8,4) not null check (a_mean between -150 and 150),
  b_mean numeric(8,4) not null check (b_mean between -150 and 150),
  is_active boolean not null default true,
  created_by text not null,
  created_by_operator_id uuid references operators(id),
  created_at timestamptz not null default now()
);

create table if not exists sea_urchin_color_captures (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references sea_urchin_process_runs(id) on delete cascade,
  evidence_file_id uuid not null references reception_evidence_files(id) on delete restrict,
  capture_source text not null check (capture_source in ('camera','upload')),
  device_label text,
  image_sha256 text not null check (image_sha256 ~ '^[0-9a-f]{64}$'),
  pixel_count integer not null check (pixel_count > 0),
  r_mean numeric(8,4) not null check (r_mean between 0 and 255),
  g_mean numeric(8,4) not null check (g_mean between 0 and 255),
  b_rgb_mean numeric(8,4) not null check (b_rgb_mean between 0 and 255),
  l_mean numeric(8,4) not null check (l_mean between 0 and 100),
  a_mean numeric(8,4) not null check (a_mean between -150 and 150),
  b_mean numeric(8,4) not null check (b_mean between -150 and 150),
  l_std numeric(8,4) not null check (l_std >= 0),
  a_std numeric(8,4) not null check (a_std >= 0),
  b_std numeric(8,4) not null check (b_std >= 0),
  chroma numeric(8,4) not null check (chroma >= 0),
  hue_deg numeric(8,4) not null check (hue_deg between 0 and 360),
  suggested_grade text check (suggested_grade is null or suggested_grade in ('A','B','C','D','E')),
  nearest_reference_id uuid references sea_urchin_color_references(id) on delete set null,
  delta_e numeric(8,4) check (delta_e is null or delta_e >= 0),
  operator_grade text check (operator_grade is null or operator_grade in ('A','B','C','D','E')),
  decision text not null default 'pending' check (decision in ('pending','accepted','review','ng')),
  confirmed_by text,
  confirmed_by_operator_id uuid references operators(id),
  confirmed_at timestamptz,
  created_by text not null,
  created_by_operator_id uuid references operators(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_urchin_color_refs_plant_grade
  on sea_urchin_color_references(plant_id,grade,created_at desc)
  where is_active;

create index if not exists idx_urchin_color_captures_run
  on sea_urchin_color_captures(run_id,created_at desc);

create unique index if not exists idx_urchin_color_capture_image
  on sea_urchin_color_captures(run_id,image_sha256);

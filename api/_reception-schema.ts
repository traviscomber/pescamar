import { getSql } from "./_db.js";

let ready: Promise<void> | null = null;

export function ensureReceptionSchema() {
  if (!ready) {
    ready = (async () => {
      const sql = getSql();
      await sql`alter table receptions add column if not exists plant_id text`;
      await sql`create index if not exists receptions_plant_received_idx on receptions (plant_id, received_at desc)`;
      await sql`create table if not exists reception_evidence (
        id uuid primary key default gen_random_uuid(),
        reception_id uuid not null references receptions(id) on delete cascade,
        kind text not null check (kind in ('document','photo','certificate','other')),
        label text not null check (length(trim(label)) >= 2),
        url text not null check (length(trim(url)) >= 8),
        note text,
        created_by text not null,
        created_at timestamptz not null default now()
      )`;
      await sql`create index if not exists reception_evidence_reception_idx on reception_evidence (reception_id, created_at desc)`;
    })().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

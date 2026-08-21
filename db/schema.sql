CREATE TABLE IF NOT EXISTS plant_import_batches (
  id text PRIMARY KEY,
  file_name text NOT NULL,
  periods text[] NOT NULL DEFAULT '{}',
  plant_ids text[] NOT NULL DEFAULT '{}',
  row_count integer NOT NULL CHECK (row_count > 0),
  published_at timestamptz NOT NULL DEFAULT now(),
  published_by text NOT NULL,
  previous_plants jsonb NOT NULL,
  resulting_plants jsonb NOT NULL,
  reverted_at timestamptz
);

CREATE TABLE IF NOT EXISTS plant_current_state (
  state_key text PRIMARY KEY CHECK (state_key = 'current'),
  plants jsonb NOT NULL,
  latest_batch_id text REFERENCES plant_import_batches(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plant_import_batches_published_at_idx
  ON plant_import_batches (published_at DESC);

COMMENT ON TABLE plant_import_batches IS
  'Auditable snapshots published from validated plant spreadsheets';
COMMENT ON TABLE plant_current_state IS
  'Single shared operational state for the multiplant dashboard';

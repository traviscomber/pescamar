import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  console.log('NEON_SCHEMA_STATUS', JSON.stringify({ databaseConfigured: false }))
  process.exit(0)
}

const sql = neon(process.env.DATABASE_URL)
const columns = await sql`
  select table_name,column_name from information_schema.columns where table_schema='public' and (
    (table_name='receptions' and column_name='guide_kg') or
    (table_name='settlements' and column_name in ('price_per_kg_clp','credit_recovery_clp','created_by','approved_by','calculation_snapshot','updated_at')) or
    (table_name='operators' and column_name in ('password_hash','plant_ids'))
  )
`
const tables = await sql`select table_name from information_schema.tables where table_schema='public' and table_name='operator_sessions'`
const indexes = await sql`select indexname from pg_indexes where schemaname='public' and indexname in ('credit_movements_advance_request_unique','credit_movements_recovery_settlement_unique','settlements_status_created_idx','operator_sessions_operator_idx','operator_sessions_expiry_idx')`
const counts = await sql`select
  (select count(*)::int from receptions) as receptions,
  (select count(*)::int from settlements) as settlements,
  (select count(*)::int from operators) as operators`

const presentColumns = new Set(columns.map((row) => `${row.table_name}.${row.column_name}`))
const presentIndexes = new Set(indexes.map((row) => row.indexname))
const migration002 = [
  'receptions.guide_kg',
  'settlements.price_per_kg_clp',
  'settlements.credit_recovery_clp',
  'settlements.created_by',
  'settlements.approved_by',
  'settlements.calculation_snapshot',
  'settlements.updated_at',
].every((key) => presentColumns.has(key)) && [
  'credit_movements_advance_request_unique',
  'credit_movements_recovery_settlement_unique',
  'settlements_status_created_idx',
].every((key) => presentIndexes.has(key))
const migration003 = presentColumns.has('operators.password_hash') &&
  presentColumns.has('operators.plant_ids') &&
  tables.length === 1 &&
  ['operator_sessions_operator_idx','operator_sessions_expiry_idx'].every((key) => presentIndexes.has(key))

console.log('NEON_SCHEMA_STATUS', JSON.stringify({
  databaseConfigured: true,
  migration002,
  migration003,
  counts: counts[0] ?? { receptions: 0, settlements: 0, operators: 0 },
}))

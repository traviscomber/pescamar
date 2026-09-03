import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path:string)=>readFile(path,'utf8')

test('041 records a structural baseline without inventing historical execution timestamps',async()=>{
  const migration=await read('db/migrations/041_schema_migration_baseline.sql')
  assert.match(migration,/create table if not exists schema_migrations/)
  assert.match(migration,/evidence_kind in \('baseline','applied'\)/)
  assert.match(migration,/historical_execution_reconstructed',false/)
  assert.match(migration,/001_core\.sql/)
  assert.match(migration,/040_cold_sensor_station_scope\.sql/)
  assert.match(migration,/041_schema_migration_baseline\.sql/)
  assert.match(migration,/to_regprocedure\('public\.enforce_cold_observation_scope\(\)'\)/)
  assert.match(migration,/tgname='cold_observations_scope_guard'/)
  assert.match(migration,/'041_schema_migration_baseline\.sql',\s*'applied',\s*now\(\)/)
})

test('schema preflight passes only when manifest and tracker reconcile exactly',async()=>{
  const source=await read('api/schema-preflight.ts')
  assert.match(source,/public'&&row\.tablename==='schema_migrations'/)
  assert.match(source,/missing\.length===0&&unexpected\.length===0&&invalid\.length===0&&latestApplied/)
  assert.match(source,/status:trackerVerified\?'baseline_verified'/)
  assert.match(source,/status:trackerVerified\?'pass':'hold'/)
  assert.match(source,/No se reconstruyeron timestamps históricos/)
})

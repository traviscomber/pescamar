import {readFile} from 'node:fs/promises'
import {expect,test} from '@playwright/test'

test('cold-chain mutations remain behind the Plant Execution write gate',async()=>{
 const api=await readFile('api/cold-chain.ts','utf8')
 const gate=api.indexOf("if(req.method==='POST'&&!writesEnabled())")
 const auth=api.indexOf('const operator=await requireOperator(req)')
 expect(gate).toBeGreaterThan(-1)
 expect(auth).toBeGreaterThan(gate)
 for(const action of ['upsertAsset','startRun','addLoad','removeLoad','recordObservation','completeRun','cancelRun'])expect(api).toContain(`action==='${action}'`)
})

test('cold chain models physical assets and sessions without rewriting erizo process-stage evidence',async()=>{
 const migration=await readFile('db/migrations/036_cold_chain.sql','utf8')
 expect(migration).toContain('create table if not exists cold_assets')
 expect(migration).toContain('create table if not exists cold_runs')
 expect(migration).toContain('create table if not exists cold_run_loads')
 expect(migration).toContain('create table if not exists cold_observations')
 expect(migration.toLowerCase()).not.toContain('alter table sea_urchin_stage_checks')
 expect(migration.toLowerCase()).not.toContain('update sea_urchin_stage_checks')
})

test('a pallet or lot can belong to only one active cold run while completed history is retained',async()=>{
 const migration=await readFile('db/migrations/036_cold_chain.sql','utf8')
 expect(migration).toContain('cold_run_loads_active_pallet_unique')
 expect(migration).toContain('cold_run_loads_active_reception_unique')
 expect(migration).toContain('released_at is null and removed_at is null')
 expect(migration).toContain('removal_reason')
})

test('temperature observations are idempotent and sensor claims require a registered sensor',async()=>{
 const api=await readFile('api/cold-chain.ts','utf8')
 const migration=await readFile('db/migrations/036_cold_chain.sql','utf8')
 expect(api).toContain('idempotency_key')
 expect(api).toContain("device.device_type!=='sensor'")
 expect(migration).toContain('unique(plant_id,idempotency_key)')
 expect(migration).toContain("source in ('manual','sensor')")
})

test('closing a cold run requires active load plus temperature evidence and derives deviation status',async()=>{
 const api=await readFile('api/cold-chain.ts','utf8')
 expect(api).toContain('l.load_count>0 and m.observation_count>0')
 expect(api).toContain("case when m.deviation_count>0 then 'deviation' else 'completed' end")
 expect(api).toContain('released_at=${completedAt}')
})

test('cold-chain lifecycle does not create inventory movements or dispatches',async()=>{
 const api=(await readFile('api/cold-chain.ts','utf8')).toLowerCase()
 expect(api).not.toContain('inventory_movements')
 expect(api).not.toContain('create_lot_dispatch')
 expect(api).not.toContain('lot_dispatches')
})

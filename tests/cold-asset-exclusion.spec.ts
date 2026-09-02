import {readFile} from 'node:fs/promises'
import {expect,test} from '@playwright/test'

test('one physical cold asset cannot own two independent open runs',async()=>{
 const migration=(await readFile('db/migrations/039_cold_asset_active_run_exclusion.sql','utf8')).toLowerCase()
 expect(migration).toContain('cold_runs_one_open_per_asset_unique')
 expect(migration).toContain('on cold_runs(asset_id)')
 expect(migration).toContain("where status='open'")
})

test('cold run remains the aggregation boundary for multiple physical loads',async()=>{
 const schema=(await readFile('db/migrations/036_cold_chain.sql','utf8')).toLowerCase()
 expect(schema).toContain('run_id uuid not null references cold_runs(id)')
 expect(schema).toContain('cold_run_loads_active_pallet_unique')
 expect(schema).toContain('cold_run_loads_active_reception_unique')
})

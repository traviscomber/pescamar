import {readFile} from 'node:fs/promises'
import {expect,test} from '@playwright/test'

test('Plant Execution refuses writes before auth or DB access when gate is disabled',async()=>{
 const api=await readFile('api/plant-execution.ts','utf8')
 const gate=api.indexOf("if(!writesEnabled())return res.status(503)")
 const auth=api.indexOf('const operator=await requireOperator(req)')
 const sql=api.indexOf('const sql=getSql()')
 expect(gate).toBeGreaterThan(-1)
 expect(auth).toBeGreaterThan(gate)
 expect(sql).toBeGreaterThan(auth)
})

test('Plant Execution schema preserves event-to-packing idempotency and canonical separation',async()=>{
 const migration=await readFile('db/migrations/033_plant_execution_foundation.sql','utf8')
 const contract=await readFile('PLANT_EXECUTION_CONTRACT.md','utf8')
 expect(migration).toContain('unique(plant_id,idempotency_key)')
 expect(migration).toContain('packing_units_source_device_event_unique')
 expect(contract).toContain('canonical_packing_boxes')
 expect(contract).toContain('NO crea `packing_units`')
})

import {readFile} from 'node:fs/promises'
import {expect,test} from '@playwright/test'

test('packing specifications are write-gated and append-only by version',async()=>{
 const api=await readFile('api/packing-specs.ts','utf8')
 const gate=api.indexOf("if(req.method==='POST'&&!writesEnabled())")
 const auth=api.indexOf('const operator=await requireOperator(req)')
 expect(gate).toBeGreaterThan(-1)
 expect(auth).toBeGreaterThan(gate)
 expect(api).toContain("action!=='createVersion'")
 expect(api).toContain('insert into packing_specs')
 expect(api.toLowerCase()).not.toContain('update packing_specs')
 expect(api).toContain("operator.role!=='admin'")
})

test('packing specification identity is versioned by scope, code and version',async()=>{
 const migration=await readFile('db/migrations/033_plant_execution_foundation.sql','utf8')
 expect(migration).toContain("packing_specs_scope_code_version_unique")
 expect(migration).toContain("coalesce(plant_id,''),code,version")
})

import {readFile} from 'node:fs/promises'
import {expect,test} from '@playwright/test'

test('station registry keeps writes behind the Plant Execution gate and admin role',async()=>{
 const api=await readFile('api/plant-stations.ts','utf8')
 const gate=api.indexOf("if(req.method==='POST'&&!writesEnabled())")
 const auth=api.indexOf('const operator=await requireOperator(req)')
 const admin=api.indexOf("if(operator.role!=='admin')")
 expect(gate).toBeGreaterThan(-1)
 expect(auth).toBeGreaterThan(gate)
 expect(admin).toBeGreaterThan(auth)
 expect(api).toContain("action==='upsertStation'")
 expect(api).toContain("action==='upsertDevice'")
})

test('Plant Execution migration never seeds physical stations or devices',async()=>{
 const migration=(await readFile('db/migrations/033_plant_execution_foundation.sql','utf8')).toLowerCase()
 expect(migration).not.toContain('insert into plant_stations')
 expect(migration).not.toContain('insert into plant_devices')
})

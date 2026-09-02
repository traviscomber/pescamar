import {readFile} from 'node:fs/promises'
import {expect,test} from '@playwright/test'

test('pallet mutations remain behind the Plant Execution write gate',async()=>{
 const api=await readFile('api/pallets.ts','utf8')
 const gate=api.indexOf("if(req.method==='POST'&&!writesEnabled())")
 const auth=api.indexOf('const operator=await requireOperator(req)')
 expect(gate).toBeGreaterThan(-1)
 expect(auth).toBeGreaterThan(gate)
 expect(api).toContain("action==='create'")
 expect(api).toContain("action==='addUnit'")
 expect(api).toContain("action==='close'")
})

test('one physical packing unit can belong to only one pallet',async()=>{
 const migration=await readFile('db/migrations/035_pallets.sql','utf8')
 expect(migration).toContain('unique(packing_unit_id)')
 expect(migration).toContain('primary key(pallet_id,packing_unit_id)')
})

test('closing a pallet derives totals from live packing units without moving inventory',async()=>{
 const api=(await readFile('api/pallets.ts','utf8')).toLowerCase()
 expect(api).toContain('sum(u.net_kg)')
 expect(api).toContain("status='closed'")
 expect(api).not.toContain('inventory_movements')
 expect(api).not.toContain('dispatches')
})

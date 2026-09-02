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
 expect(api).toContain("action==='removeUnit'")
 expect(api).toContain("action==='close'")
})

test('one physical packing unit has only one active pallet while history is preserved',async()=>{
 const migration=await readFile('db/migrations/035_pallets.sql','utf8')
 expect(migration).toContain('pallet_packing_units_active_unit_unique')
 expect(migration).toContain('where removed_at is null')
 expect(migration).toContain('removed_by_operator_id')
 expect(migration).toContain('removal_reason')
 expect(migration).toContain('previous_packing_status')
})

test('removing a box requires a reason and restores its previous packing state',async()=>{
 const api=await readFile('api/pallets.ts','utf8')
 expect(api).toContain('reason.length<4')
 expect(api).toContain('previous_packing_status')
 expect(api).toContain("status=${membership.previous_packing_status}")
 expect(api).not.toContain('delete from pallet_packing_units')
})

test('closing a pallet derives totals from active live packing units without moving inventory',async()=>{
 const api=(await readFile('api/pallets.ts','utf8')).toLowerCase()
 expect(api).toContain('sum(u.net_kg)')
 expect(api).toContain('i.removed_at is null')
 expect(api).toContain("status='closed'")
 expect(api).not.toContain('inventory_movements')
 expect(api).not.toContain('dispatches')
})

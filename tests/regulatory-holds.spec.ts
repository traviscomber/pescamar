import {readFile} from 'node:fs/promises'
import {expect,test} from '@playwright/test'

test('regulatory mutations remain disabled until Plant Execution writes are explicitly enabled',async()=>{
 const api=await readFile('api/regulatory-holds.ts','utf8')
 const gate=api.indexOf("if(req.method==='POST'&&!writesEnabled())")
 const auth=api.indexOf('const operator=await requireOperator(req)')
 expect(gate).toBeGreaterThan(-1)
 expect(auth).toBeGreaterThan(gate)
 expect(api).toContain("['admin','quality']")
})

test('release helper preserves current production while Plant Execution gate is off',async()=>{
 const helper=await readFile('api/_regulatory-release.ts','utf8')
 const safeReturn=helper.indexOf("if(!writesEnabled())return {active:false,releasable:true")
 const db=helper.indexOf('const sql=getSql()')
 expect(safeReturn).toBeGreaterThan(-1)
 expect(db).toBeGreaterThan(safeReturn)
})

test('holds are auditable and target exactly one live resource',async()=>{
 const migration=await readFile('db/migrations/037_regulatory_holds.sql','utf8')
 expect(migration).toContain('create table if not exists regulatory_holds')
 expect(migration).toContain('create table if not exists regulatory_hold_events')
 expect(migration).toContain("status in ('open','released','rejected')")
 expect(migration).toContain('(reception_id is not null)::int + (pallet_id is not null)::int + (packing_unit_id is not null)::int = 1')
 expect(migration).toContain("event_type in ('opened','released','rejected')")
})

test('open and rejected holds block a reception through direct lot, packing unit or pallet lineage',async()=>{
 const migration=await readFile('db/migrations/037_regulatory_holds.sql','utf8')
 expect(migration).toContain("h.status in ('open','rejected')")
 expect(migration).toContain('h.reception_id=p_reception_id')
 expect(migration).toContain('h.packing_unit_id')
 expect(migration).toContain('h.pallet_id')
 expect(migration).toContain('pallet_packing_units')
})

test('database dispatch boundary rejects confirmed dispatches under regulatory hold',async()=>{
 const migration=await readFile('db/migrations/037_regulatory_holds.sql','utf8')
 expect(migration).toContain('create or replace function enforce_regulatory_dispatch_hold()')
 expect(migration).toContain('lot_dispatches_regulatory_hold_gate')
 expect(migration).toContain('before insert or update of reception_id,status on lot_dispatches')
 expect(migration).toContain("raise exception 'Lote bloqueado por control regulatorio'")
})

test('application dispatch and sales-order allocation also enforce regulatory release',async()=>{
 const commercial=await readFile('api/commercial.ts','utf8')
 const orders=await readFile('api/sales-orders.ts','utf8')
 expect(commercial).toContain("import {getRegulatoryReleaseState}")
 expect(commercial).toContain('const regulatory=await getRegulatoryReleaseState(receptionId)')
 expect(commercial).toContain('Despacho bloqueado por control regulatorio')
 expect(orders).toContain("import {getRegulatoryReleaseState}")
 expect(orders).toContain('Lote bloqueado por control regulatorio')
})

test('regulatory v1 does not invent Sernapesca XML or Siscomex contracts',async()=>{
 const migration=(await readFile('db/migrations/037_regulatory_holds.sql','utf8')).toLowerCase()
 const api=(await readFile('api/regulatory-holds.ts','utf8')).toLowerCase()
 expect(migration).not.toContain('siscomex')
 expect(api).not.toContain('siscomex')
 expect(api).not.toContain('xml')
})

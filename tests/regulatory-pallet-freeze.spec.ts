import {readFile} from 'node:fs/promises'
import {expect,test} from '@playwright/test'

test('blocking pallet holds freeze physical membership at the database boundary',async()=>{
 const migration=(await readFile('db/migrations/038_regulatory_pallet_membership_freeze.sql','utf8')).toLowerCase()
 expect(migration).toContain('enforce_regulatory_pallet_membership_freeze')
 expect(migration).toContain("h.status in ('open','rejected')")
 expect(migration).toContain('before insert or update or delete on pallet_packing_units')
 expect(migration).toContain('old.pallet_id')
 expect(migration).toContain('new.pallet_id')
 expect(migration).toContain('pallet bloqueado por control regulatorio')
})

test('hold creation and membership mutation serialize on the same pallet row',async()=>{
 const migration=(await readFile('db/migrations/038_regulatory_pallet_membership_freeze.sql','utf8')).toLowerCase()
 expect(migration).toContain('lock_regulatory_hold_pallet_scope')
 expect(migration).toContain('before insert or update on regulatory_holds')
 expect(migration).toContain('where id=new.pallet_id for update')
 expect(migration).toContain('where id=old.pallet_id for update')
 expect(migration).toContain('order by id')
 expect(migration).toContain('for update')
})

test('regulatory pallet freeze preserves dispatch lineage instead of deleting membership history',async()=>{
 const regulatory=(await readFile('db/migrations/037_regulatory_holds.sql','utf8')).toLowerCase()
 const freeze=(await readFile('db/migrations/038_regulatory_pallet_membership_freeze.sql','utf8')).toLowerCase()
 expect(regulatory).toContain('i.removed_at is null')
 expect(freeze).not.toContain('delete from pallet_packing_units')
 expect(freeze).not.toContain('update regulatory_holds')
})

test('pallet API exposes a regulatory membership freeze as a conflict instead of a server error',async()=>{
 const api=await readFile('api/pallets.ts','utf8')
 expect(api).toContain("message.includes('Pallet bloqueado por control regulatorio')")
 expect(api).toContain("res.status(409).json({ok:false,error:'Pallet bloqueado por control regulatorio; su composición no puede cambiar'})")
})

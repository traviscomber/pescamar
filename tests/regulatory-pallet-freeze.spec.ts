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

test('regulatory pallet freeze preserves dispatch lineage instead of deleting membership history',async()=>{
 const regulatory=(await readFile('db/migrations/037_regulatory_holds.sql','utf8')).toLowerCase()
 const freeze=(await readFile('db/migrations/038_regulatory_pallet_membership_freeze.sql','utf8')).toLowerCase()
 expect(regulatory).toContain('i.removed_at is null')
 expect(freeze).not.toContain('delete from pallet_packing_units')
 expect(freeze).not.toContain('update regulatory_holds')
})

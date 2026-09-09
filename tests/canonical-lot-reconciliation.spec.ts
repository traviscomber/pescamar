import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'

test('historical lot reconciliation is deterministic and evidence only',async()=>{
 const source=await readFile('api/canonical-lot-reconciliation.ts','utf8')
 expect(source).toContain("schemaVersion:'pescamar.canonical-lot-reconciliation.v1'")
 expect(source).toContain("where record_status='operational' and nullif(btrim(lot_code),'') is not null")
 expect(source).toContain("group by lower(btrim(lot_code))")
 expect(source).toContain("if(guides.length!==1)")
 expect(source).toContain("if(suppliers.length!==1)")
 expect(source).toContain("if(clients.length>1)")
 expect(source).toContain("promotionAllowed:false")
 expect(source).toContain("writesReceptions:false")
 expect(source).toContain("writesInventory:false")
 expect(source).toContain("writesParties:false")
 expect(source).toContain("La reconciliación de lote no equivale a reconciliación de party")
 expect(source).not.toContain('insert into receptions')
 expect(source).not.toContain('insert into inventory_movements')
 expect(source).not.toContain('insert into parties')
})

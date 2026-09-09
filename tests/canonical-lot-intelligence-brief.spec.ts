import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'

test('canonical intelligence exposes historical lot reconciliation without live promotion',async()=>{
 const source=await readFile('api/_canonical-business-intelligence.ts','utf8')
 expect(source).toContain('lotReconciliation:{lots:number;resolved:number;review:number')
 expect(source).toContain("kind:'historical-lot-reconciliation'")
 expect(source).toContain('promotionAllowed:false')
 expect(source).toContain("not in ('singuia','s/guia')")
 expect(source).toContain("in ('singuia','s/guia')")
 expect(source).toContain('valid_guides=1 and placeholder_rows=0 and suppliers=1 and clients<=1')
 expect(source).toContain('No promover a operación live.')
 expect(source).not.toContain('insert into receptions')
 expect(source).not.toContain('insert into parties')
 expect(source).not.toContain('insert into inventory_movements')
})

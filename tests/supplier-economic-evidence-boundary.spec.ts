import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'

test('supplier live economics fails closed on incomplete sold-lot lineage',async()=>{
 const source=await readFile('api/supplier-economic-intelligence.ts','utf8')
 expect(source).toContain("version:'supplier-economics-v2-unknown-not-zero'")
 expect(source).toContain('bool_and(full_sale and purchase_known and transformation_known) economic_complete')
 expect(source).toContain('case when bool_and(full_sale and purchase_known and transformation_known) then sum(revenue_clp-purchase_cost_clp-transformation_cost_clp) end contribution_clp')
 expect(source).toContain('row.economic_complete&&sold>0&&contribution!=null')
 expect(source).toContain('liveEconomicComplete?nullable(l?.contribution_clp):null')
 expect(source).toContain('contributionPerSoldKg')
 expect(source).toContain('Una venta o costo faltante permanece desconocido y no se convierte en cero.')
 expect(source).not.toContain('coalesce(pc.purchase_cost_clp,0)')
 expect(source).not.toContain('coalesce(t.transformation_cost_clp,0)')
})

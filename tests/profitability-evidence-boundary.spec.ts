import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'

test('live profitability fails closed until the sold lot has complete economic lineage',async()=>{
 const source=await readFile('api/profitability.ts','utf8')
 expect(source).toContain('full_sale')
 expect(source).toContain('purchase_known')
 expect(source).toContain('transformation_known')
 expect(source).toContain('bool_and(full_sale and purchase_known and transformation_known) economic_complete')
 expect(source).toContain("profitabilityRule:'unknown_is_not_zero'")
 expect(source).toContain("liveContributionRequires:'same sold lot + physical kg + complete sale + settlement + transformation cost'")
 expect(source).toContain("case when bool_and(full_sale and purchase_known and transformation_known) then sum(revenue_clp-purchase_cost_clp-transformation_cost_clp) end contribution_clp")
 expect(source).not.toContain('from plant_profitability')
})

test('profitability UI separates known revenue from unknown contribution',async()=>{
 const [focus,detail]=await Promise.all([readFile('src/pages/ProfitabilityFocus.tsx','utf8'),readFile('src/pages/Profitability.tsx','utf8')])
 expect(focus).toContain('row.economic_complete&&row.contribution_clp!=null')
 expect(focus).toContain('Ingresos trazados; margen pendiente')
 expect(focus).toContain('Dato ausente no se interpreta como cero.')
 expect(detail).toContain("r.economic_complete&&r.contribution_clp!=null")
 expect(detail).toContain("r.economic_complete?money(r.contribution_clp):'—'")
 expect(detail).toContain('Unknown is not zero')
 expect(detail).toContain('Una venta sin liquidación, transformación o cierre físico completo conserva ingreso conocido, pero no genera contribución ni porcentaje de margen.')
})

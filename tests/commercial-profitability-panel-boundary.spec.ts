import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'

test('commercial profitability panel preserves unknown transformation cost',async()=>{
 const [panel,commercial]=await Promise.all([
  readFile('src/components/ProfitabilityPanel.tsx','utf8'),
  readFile('src/pages/Commercial.tsx','utf8'),
 ])
 expect(commercial).toContain("import {ProfitabilityPanel} from '../components/ProfitabilityPanel'")
 expect(commercial).toContain('<ProfitabilityPanel lots={lots} sales={sales}/>')
 expect(panel).toContain('lot.transformationCostClp!=null&&lot.physicalKg>0')
 expect(panel).toContain('unitPurchase!=null&&unitTransformation!=null')
 expect(panel).toContain('current.knownRevenue+=revenue')
 expect(panel).toContain('row.knownRevenue-totalCost')
 expect(panel).toContain('datos faltantes permanecen desconocidos y nunca se convierten en cero')
 expect(panel).not.toContain('lot.transformationCostClp??0')
})

import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const files=await Promise.all([
  'api/receptions.ts','api/lot-360.ts','api/inventory.ts','api/transformation-costs.ts','api/sales-orders.ts','api/commercial.ts','api/daily-close.ts'
].map(path=>readFile(new URL(`../${path}`,import.meta.url),'utf8')))
const [receptions,lot360,inventory,costs,salesOrders,commercial,dailyClose]=files

assert(receptions.includes('created_by_operator_id')&&receptions.includes('${operator.id}::uuid'),'receptions and evidence must persist operator UUID')
assert(lot360.includes('created_by_operator_id')&&lot360.includes('${operator.id}::uuid'),'lot events must persist operator UUID')
assert(inventory.includes('created_by_operator_id=${operator.id}::uuid'),'inventory movements must persist operator UUID')
assert(inventory.includes('created_by,created_by_operator_id'),'inventory locations must persist operator UUID')
assert(costs.includes('created_by,created_by_operator_id'),'transformation costs must persist operator UUID')
assert(salesOrders.includes('created_by,created_by_operator_id'),'sales orders must persist operator UUID')
assert(salesOrders.includes('created_by_operator_id=${operator.id}::uuid'),'sales allocations must persist operator UUID')
assert(commercial.includes('lot_dispatches d set created_by_operator_id=${operator.id}::uuid'),'dispatches must persist operator UUID')
assert(commercial.includes('lot_sales s set created_by_operator_id=${operator.id}::uuid'),'sales must persist operator UUID')
assert(dailyClose.includes('generated_by,generated_by_operator_id'),'daily close must persist operator UUID')
assert(dailyClose.includes('generated_by_operator_id=excluded.generated_by_operator_id'),'daily close upserts must refresh operator UUID')

if(failures.length){
  console.error('Stable operator identity FAILED')
  for(const failure of failures)console.error(`- ${failure}`)
  process.exit(1)
}
console.log('Stable operator identity PASS across reception, lot events, inventory, costs, sales planning, commercial execution and daily close')

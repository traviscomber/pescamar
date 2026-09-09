import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [commercial,orders,settlements,costs,profitability]=await Promise.all([
 readFile(new URL('../api/commercial.ts',import.meta.url),'utf8'),
 readFile(new URL('../api/sales-orders.ts',import.meta.url),'utf8'),
 readFile(new URL('../api/settlements.ts',import.meta.url),'utf8'),
 readFile(new URL('../api/transformation-costs.ts',import.meta.url),'utf8'),
 readFile(new URL('../api/profitability.ts',import.meta.url),'utf8'),
])

for(const [name,source] of Object.entries({commercial,orders,settlements,costs,profitability})){
 assert(source.includes("'admin','operations','finance','viewer'")||source.includes('"admin","operations","finance","viewer"'),`${name} must allow financial read only to admin/operations/finance/viewer`)
 assert(source.includes("Tu rol no tiene acceso a información"),`${name} must fail closed for unauthorized financial readers`)
 assert(!source.includes("'quality'"),`${name} financial read allowlist must not include Quality`)
}

assert(settlements.includes('left join credit_accounts ca on ca.party_id=r.supplier_id'),'settlement credit balance must use exact supplier party identity')
assert(!settlements.includes('lower(trim(cp.legal_name))'),'settlement credit balance must not fall back to supplier name matching')
assert(!settlements.includes('or lower(trim('),'settlement financial identity must not use name fallback')

assert(profitability.includes("with scoped as (select * from receptions r where ${admin} or r.plant_id=any(${plantIds}::text[]))"),'live profitability must derive supplier metrics from authorized receptions')
assert(profitability.includes("join receptions r on r.id=s.reception_id where p.kind='customer'::party_kind and (${admin} or r.plant_id=any(${plantIds}::text[]))"),'customer profitability must be plant scoped')
assert(profitability.includes('corporate=admin||plantIds.length>=6'),'global historical profitability must require corporate scope')
assert(profitability.includes('corporate?sql`select * from historical_supplier_intelligence'),'global historical supplier metrics must be corporate-only')
assert(profitability.includes("plant_id=any(${plantIds}::text[])"),'limited-scope profitability must filter historical production by authorized plant')
assert(profitability.includes('boundary:{financialRead:true,plantScoped:!admin,corporateHistory:corporate}'),'profitability API must expose its financial and scope boundary')

assert(commercial.includes('getRegulatoryReleaseState(receptionId)'),'commercial dispatch must preserve regulatory release gate')
assert(commercial.includes('getJapanReleaseState(receptionId)'),'Japan dispatch must preserve Japan Release gate')
assert(orders.includes('getRegulatoryReleaseState(receptionId)'),'sales-order allocation must preserve regulatory release gate')

if(failures.length){
 console.error('Financial read boundary smoke FAILED')
 for(const failure of failures)console.error(`- ${failure}`)
 process.exit(1)
}
console.log('Financial read boundary smoke PASS: Quality cannot read financial/commercial APIs, settlement credit identity is exact-party only, profitability is plant-scoped, and regulatory dispatch gates remain intact')

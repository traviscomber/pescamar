import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [eventSource,physicalSource,lineageSource,pageSource]=await Promise.all([
  readFile(new URL('../api/_seafood-event.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/_physical-lineage.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/lot-lineage.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/Lineage.tsx',import.meta.url),'utf8'),
])

for(const type of ['packing','pallet','cold'])assert(eventSource.includes(`|'${type}'`),`Seafood Event Graph must include ${type}`)

assert(physicalSource.includes('from sea_urchin_process_runs u where u.reception_id=${receptionId}::uuid'),'production runs must be scoped to the canonical reception')
assert(physicalSource.includes('from packing_units pu where pu.reception_id=${receptionId}::uuid'),'packing units must be scoped to the canonical reception')
assert(physicalSource.includes('join pallet_packing_units ppu on ppu.pallet_id=p.id and ppu.removed_at is null'),'pallet lineage must include only active packing-unit links')
assert(physicalSource.includes('join packing_units pu on pu.id=ppu.packing_unit_id where pu.reception_id=${receptionId}::uuid'),'pallet lineage must resolve back to the canonical reception')
assert(physicalSource.includes('from cold_run_loads cl join cold_runs cr on cr.id=cl.run_id'),'cold lineage must be grounded in cold run loads')
assert(physicalSource.includes('cl.reception_id=${receptionId}::uuid or cl.pallet_id in'),'cold lineage must resolve direct reception loads or pallets linked to the reception')
assert(physicalSource.includes("type:'packing'")&&physicalSource.includes("source:{entityType:'packing_unit'"),'packing events must retain canonical source identity')
assert(physicalSource.includes("type:'pallet'")&&physicalSource.includes("source:{entityType:'pallet'"),'pallet events must retain canonical source identity')
assert(physicalSource.includes("type:'cold'")&&physicalSource.includes("source:{entityType:'cold_run_load'"),'cold events must retain load-level source identity')
assert(physicalSource.includes('inputKg:null')&&physicalSource.includes('inputEvidenceMissing:true'),'production must not invent input mass when evidence is absent')
assert(physicalSource.includes('id:`cold:${runId}:${loadId}`'),'cold events must be unique per run/load relation')
assert(!/\b(insert|update|delete|create table|alter table|drop table)\b/i.test(physicalSource),'physical lineage projection must remain read-only')

assert(lineageSource.includes("import {loadPhysicalLineageEvents} from './_physical-lineage.js'"),'lot lineage must consume physical lineage projection')
assert(lineageSource.includes('events.push(...physicalEvents)'),'physical lineage must be part of the ordered Event Graph')
assert(lineageSource.includes('r.created_by_operator_id::text created_by'),'reception actor must use the current canonical operator identity column')
assert(lineageSource.includes('supplierId:text(reception.supplier_id)'),'reception must retain internal supplier reference for later GS1 evidence resolution')
assert(lineageSource.includes('fromLocationId:text(row.from_location_id)')&&lineageSource.includes('toLocationId:text(row.to_location_id)'),'inventory events must retain internal location references without treating them as GS1')
assert(lineageSource.includes('customerId:text(row.customer_id)'),'commercial events must retain internal party references without treating them as GS1')
for(const marker of ["packing:has('packing')","pallet:has('pallet')","cold:has('cold')"])assert(lineageSource.includes(marker),`lineage coverage must expose ${marker}`)

assert(pageSource.includes("|'packing'|'pallet'|'cold'"),'lineage UI event union must support packing, pallet and cold')
for(const label of ["packing:'Packing'","pallet:'Pallet'","cold:'Frío'"])assert(pageSource.includes(label),`lineage UI must label ${label}`)
assert(pageSource.includes("case'packing'")&&pageSource.includes("case'pallet'")&&pageSource.includes("case'cold'"),'lineage UI must summarize physical plant stages')
assert(pageSource.includes('por packing, pallet, frío, inventario y despacho'),'lineage page must describe the complete physical flow in operator language')

if(failures.length){
  console.error('Physical lineage smoke FAILED')
  for(const failure of failures)console.error(`- ${failure}`)
  process.exit(1)
}
console.log('Physical lineage smoke PASS: reception → production → packing → pallet → cold → inventory/commercial evidence is explicitly projected, source-scoped and read-only without fabricated mass or GS1 identity')

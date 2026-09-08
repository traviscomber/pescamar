import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [rail,floor]=await Promise.all([
 readFile(new URL('../src/components/LiveLotActionRail.tsx',import.meta.url),'utf8'),
 readFile(new URL('../src/pages/FloorStation.tsx',import.meta.url),'utf8'),
])

assert(rail.includes("json<LineagePayload>(`/api/lot-lineage?receptionId=${encoded}`)"),'Ficha 360 must read the Seafood Event Graph for physical progress')
assert(rail.includes('const TOTAL_STEPS=8'),'lot continuity must represent the complete minimum-team chain')
for(const marker of [
  "label:'Resolver calidad'",
  "label:'Continuar proceso de erizo'",
  "label:'Registrar packing'",
  "label:'Conformar pallet'",
  "label:'Registrar frío'",
  "label:'Ubicar producto'",
  "label:'Comprometer producto'",
  "label:'Preparar despacho'",
  "label:'Cerrar liquidación'",
])assert(rail.includes(marker),`next-action rail must include ${marker}`)
assert(rail.includes('coverage.production===true'),'production completion must come from physical Event Graph evidence')
assert(rail.includes('coverage.packing===true')&&rail.includes('coverage.pallet===true')&&rail.includes('coverage.cold===true'),'packing, pallet and cold completion must come from physical Event Graph evidence')
assert(rail.includes('coverage.inventory===true')&&rail.includes("event.type==='inventory'")&&rail.includes('toLocationId'),'inventory completion must require an Event Graph movement with a real destination location')
assert(rail.includes('coverage.commercialCommitment===true')&&rail.includes("event.type==='commercial_commitment'")&&rail.includes('allocatedKg')&&rail.includes("!=='cancelled'"),'commercial commitment must require a positive, non-cancelled sales-order allocation')
assert(rail.includes("to:`/floor/detalle?${q}`"),'packing action must preserve lot and plant context')
assert(rail.includes("to:`/pallets/detalle?${q}`"),'pallet action must preserve lot and plant context')
assert(rail.includes("to:`/frio/detalle?${coldQuery}`"),'cold action must preserve lot, plant and pallet context when known')
assert(rail.includes("to:`/ordenes-venta?${q}`"),'commercial commitment action must preserve lot and plant context into sales orders')
assert(rail.includes('palletEvent?.metrics?.palletId'),'cold handoff must reuse the pallet identity already present in lineage evidence')
assert(!rail.includes("if(!hasDispatch&&!hasSale)"),'dispatch or sale must not be used as a proxy for inventory placement and commercial commitment')

assert(floor.includes('useSearchParams'),'packing station must accept inherited route context')
assert(floor.includes('params.get("receptionId")')&&floor.includes('params.get("plantId")'),'packing station must read inherited lot and plant identity')
assert(floor.includes('const inheritedPlant=requestedLot?.plantId'),'canonical lot plant must take precedence over a loose route plant hint')
assert(floor.includes('const inheritedLotId=requestedLot?.plantId===effectivePlant?requestedReceptionId:""'),'inherited lot must remain plant-scoped')
assert(floor.includes('autoFocus={!inheritedContext}'),'scanner must become optional when canonical context is already inherited')
assert(floor.includes('"Una captura: confirmar peso"'),'minimum-team packing must explicitly reduce the inherited path to one physical capture')
assert(floor.includes('Corregir contexto manualmente'),'manual correction must remain available as an exception path')

if(failures.length){
 console.error('Lot action continuity smoke FAILED')
 for(const failure of failures)console.error(`- ${failure}`)
 process.exit(1)
}
console.log('Lot action continuity smoke PASS: Ficha 360 follows quality → process → packing → pallet → cold → located stock → real commercial commitment → dispatch → settlement using Event Graph evidence, while packing inherits canonical lot/plant context')
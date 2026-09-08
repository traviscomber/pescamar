import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const rail=await readFile(new URL('../src/components/LiveLotActionRail.tsx',import.meta.url),'utf8')

assert(rail.includes("json<LineagePayload>(`/api/lot-lineage?receptionId=${encoded}`)"),'Ficha 360 must read the Seafood Event Graph for physical progress')
assert(rail.includes('const TOTAL_STEPS=8'),'lot continuity must represent the complete minimum-team chain')
for(const marker of [
  "label:'Resolver calidad'",
  "label:'Continuar proceso de erizo'",
  "label:'Registrar packing'",
  "label:'Conformar pallet'",
  "label:'Registrar frío'",
  "label:'Ubicar y comprometer producto'",
  "label:'Preparar despacho'",
  "label:'Cerrar liquidación'",
])assert(rail.includes(marker),`next-action rail must include ${marker}`)
assert(rail.includes('coverage.production===true'),'production completion must come from physical Event Graph evidence')
assert(rail.includes('coverage.packing===true')&&rail.includes('coverage.pallet===true')&&rail.includes('coverage.cold===true'),'packing, pallet and cold completion must come from physical Event Graph evidence')
assert(rail.includes("to:`/floor/detalle?${q}`"),'packing action must preserve lot and plant context')
assert(rail.includes("to:`/pallets/detalle?${q}`"),'pallet action must preserve lot and plant context')
assert(rail.includes("to:`/frio/detalle?${coldQuery}`"),'cold action must preserve lot, plant and pallet context when known')
assert(rail.includes('palletEvent?.metrics?.palletId'),'cold handoff must reuse the pallet identity already present in lineage evidence')
assert(!rail.includes("if(!hasProduction)return{label:'Ubicar y comprometer producto'"),'the operator flow must not skip physical packing/pallet/cold after production')

if(failures.length){
 console.error('Lot action continuity smoke FAILED')
 for(const failure of failures)console.error(`- ${failure}`)
 process.exit(1)
}
console.log('Lot action continuity smoke PASS: Ficha 360 follows quality → process → packing → pallet → cold → inventory/commercial → dispatch → settlement using Event Graph evidence and inherited context')

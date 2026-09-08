import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const control=await readFile(new URL('../src/pages/PlantExecutionControl.tsx',import.meta.url),'utf8')
const floor=await readFile(new URL('../src/pages/FloorStation.tsx',import.meta.url),'utf8')
const inventory=await readFile(new URL('../src/pages/InventoryFocus.tsx',import.meta.url),'utf8')
const orders=await readFile(new URL('../src/pages/SalesOrders.tsx',import.meta.url),'utf8')
const rail=await readFile(new URL('../src/components/LiveLotActionRail.tsx',import.meta.url),'utf8')

assert(control.includes("import {Link,useSearchParams} from 'react-router-dom'"),'pallet and cold controls must read inherited URL context')
assert(control.includes("inheritedReception=searchParams.get('receptionId')")&&control.includes("requestedPlant=searchParams.get('plantId')"),'palletization must inherit reception and plant')
assert(control.includes("units.filter(unit=>unit.reception_id===inheritedReception)"),'palletization must scope available packing units to the active reception')
assert(control.includes('Contexto heredado del lote')&&control.includes("Sólo confirma el pallet destino"),'palletization must explain inherited context and exception-only correction')
assert(control.includes("inheritedPallet=searchParams.get('palletId')"),'cold chain must inherit pallet identity')
assert(control.includes("contextRuns=openRuns.filter(run=>!plantId||run.plant_id===plantId)"),'cold chain must scope open runs to the inherited plant')
assert(control.includes("if(!runId&&contextRuns.length===1)setRunId(contextRuns[0].id)"),'cold chain must auto-select the only unambiguous open cycle')
assert(control.includes("eligiblePallets.some(pallet=>pallet.id===inheritedPallet)"),'cold chain must only inherit a pallet when it is eligible for the selected run')
assert(control.includes('Sólo confirma la carga y la medición física.'),'cold chain must present the minimum human action clearly')
assert(floor.includes('const requestedReceptionId=params.get("receptionId")')&&floor.includes('const requestedPlantId=params.get("plantId")'),'packing must inherit reception and plant')
assert(floor.includes('const inheritedPlant=requestedLot?.plantId')&&floor.includes('const inheritedLotId=requestedLot?.plantId===effectivePlant?requestedReceptionId'),'packing must prefer the canonical lot plant and inherited reception identity')
assert(inventory.includes("const receptionId=params.get('receptionId')")&&inventory.includes("scoped.filter(lot=>lot.reception_id===receptionId)"),'inventory must scope the decision surface to the active reception when one is inherited')
assert(inventory.includes("orderParams.set('receptionId',receptionId)")&&inventory.includes("/ordenes-venta?${orderParams.toString()}"),'inventory must preserve active lot context into sales orders')
assert(orders.includes("requestedReceptionId=params.get('receptionId')")&&orders.includes("contextLot=allLots.find(l=>l.id===requestedReceptionId)"),'sales orders must consume the inherited reception context')
assert(rail.includes("to:`/pallets/detalle?${q}`")&&rail.includes("to:`/frio/detalle?${coldQuery}`"),'Ficha 360 must carry inherited context into pallet and cold steps')

if(failures.length){
 console.error('Inherited physical context smoke FAILED')
 for(const failure of failures)console.error(`- ${failure}`)
 process.exit(1)
}
console.log('Inherited physical context smoke PASS: packing, palletization, cold chain, inventory and sales orders reuse known lot context and reserve manual selection for ambiguity or correction')
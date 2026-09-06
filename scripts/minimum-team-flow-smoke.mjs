import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [vision,production,floor,inventory,operatingModel]=await Promise.all([
  readFile(new URL('../src/components/ReceptionVisionUpload.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/ProductionFocus.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/FloorStation.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/InventoryFocus.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/OperatingModel.tsx',import.meta.url),'utf8'),
])

assert(vision.includes('setProposal(payload.vision)'),'reception must stage AI extraction as a proposal')
assert(vision.includes('onExtract(documentaryFields(proposal))'),'reception must apply only confirmed documentary context')
assert(vision.includes('gross:null,tare:null,drained:null,temperature:null'),'reception must keep physical measurements human-confirmed')
assert(production.includes("const blocked=priority?.action==='blocked'"),'production must distinguish blocked work from normal execution')
assert(!production.includes('>Ver plan</Link>'),'production must not ask operators to review the full plan during normal execution')
assert(production.includes('No necesitas revisar el plan completo'),'production empty state must explicitly avoid unnecessary plan review')
assert(floor.includes('Corregir contexto manualmente'),'packing must keep plant/lot/station selection as fallback rather than the normal path')
assert(floor.includes('Scanner HID')&&floor.includes('Confirmar peso')&&floor.includes('Confirmar packing'),'packing must expose the scan-weight-confirm operator path')
assert(floor.includes('Dos acciones humanas: escanear y pesar'),'packing must state the minimum human interaction target')
assert(inventory.includes('decision-focus'),'inventory must remain decision-first')
assert(inventory.includes('Hay inventario físico sin posición registrada.')&&inventory.includes('Resolver bloqueo'),'inventory must escalate only physical location gaps or release blockers')
assert(operatingModel.includes('Un dato heredable o calculable no debe convertirse en una nueva tarea humana'),'operating model must state the minimum-team rule')

if(failures.length){
  console.error('Minimum-team flow contract FAILED')
  for(const failure of failures)console.error(`- ${failure}`)
  process.exit(1)
}
console.log('Minimum-team flow contract PASS: reception, production, packing and inventory preserve capture-once, physical confirmation and exception-only review')

import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [vision,reception,production,floor,inventory,salesOrders,commercial,today,operatingModel]=await Promise.all([
  readFile(new URL('../src/components/ReceptionVisionUpload.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/components/ReceptionModal.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/ProductionFocus.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/FloorStation.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/InventoryFocus.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/SalesOrders.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/Commercial.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/DailyClose.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/OperatingModel.tsx',import.meta.url),'utf8'),
])

assert(vision.includes('setProposal(payload.vision)'),'reception must stage AI extraction as a proposal')
assert(vision.includes('onExtract(documentaryFields(proposal))'),'reception must apply only confirmed documentary context')
assert(vision.includes('gross:null,tare:null,drained:null,temperature:null'),'reception must keep physical measurements human-confirmed')
assert(reception.includes('1 · Evidencia y contexto')&&reception.includes('2 · Confirmación física'),'reception must present evidence before physical confirmation')
assert(reception.includes("const documentaryReady=Boolean(supplier&&guideReference.trim()&&zone.trim()&&guideValue!=null)"),'reception must distinguish prepared documentary context from missing context')
assert(reception.includes("accessiblePlants.length>1?<label>Planta"),'reception must derive plant for single-plant operators and expose correction only when ambiguous')
assert(reception.includes("setOccurredAt(localDateTime())"),'reception must derive reception time by default')
assert(reception.includes("Completar contexto manualmente")&&reception.includes("Corregir contexto documental"),'reception administrative entry must be fallback/exception UI')
assert(!reception.includes('if(Number.isFinite(fields.gross)')&&!reception.includes('if(Number.isFinite(fields.tare)')&&!reception.includes('if(Number.isFinite(fields.drained)')&&!reception.includes('if(Number.isFinite(fields.temperature)'),'reception must never promote AI-extracted physical measurements into operator fields')
assert(reception.includes('Cuatro mediciones del operador')&&reception.includes('Las mediciones físicas nunca se aceptan desde Vision'),'reception must make the physical authority boundary explicit')
assert(production.includes("const blocked=priority?.action==='blocked'"),'production must distinguish blocked work from normal execution')
assert(!production.includes('>Ver plan</Link>'),'production must not ask operators to review the full plan during normal execution')
assert(production.includes('No necesitas revisar el plan completo'),'production empty state must explicitly avoid unnecessary plan review')
assert(floor.includes('Corregir contexto manualmente'),'packing must keep plant/lot/station selection as fallback rather than the normal path')
assert(floor.includes('Scanner HID')&&floor.includes('Confirmar peso')&&floor.includes('Confirmar packing'),'packing must expose the scan-weight-confirm operator path')
assert(floor.includes('Dos acciones humanas: escanear y pesar'),'packing must state the minimum human interaction target')
assert(inventory.includes('decision-focus'),'inventory must remain decision-first')
assert(inventory.includes('Hay inventario físico sin posición registrada.')&&inventory.includes('Resolver bloqueo'),'inventory must escalate only physical location gaps or release blockers')
assert(salesOrders.includes('Propuesta del sistema')&&salesOrders.includes('Nada se reserva hasta que confirmes.'),'commercial allocation must remain an explicit proposal rather than an automatic commitment')
assert(salesOrders.includes('Math.min(remaining,candidate.availableToPromiseKg)'),'commercial suggestion must stay bounded by order remainder and available-to-promise stock')
assert(salesOrders.includes("mode==='allocate'?'Confirmar reserva':'Confirmar'"),'commercial economic commitment must require explicit human confirmation')
assert(commercial.includes('Contexto heredado del despacho confirmado')&&commercial.includes('nada se vende hasta confirmar'),'sale capture must inherit confirmed dispatch context without auto-selling')
assert(commercial.includes('sales.filter(s=>s.dispatch_id===dispatch.id)'),'sale proposal must subtract sales already linked to the dispatch')
assert(commercial.includes("mode==='dispatch'?'Confirmar salida':'Confirmar venta'"),'dispatch and sale mutations must remain explicit human confirmations')
assert(today.includes("const suggestedOwner=(path:string)=>")&&today.includes("'Comercial / administrativo':'Operador generalista'"),'Today must route each priority to a minimum-team responsibility without inventing an individual assignment')
assert(today.includes('<b>Responsable sugerido:</b>')&&today.includes('Responsable sugerido: {item.owner}'),'Today must display the suggested owner on the primary priority and remaining queue')
assert(operatingModel.includes('Un dato heredable o calculable no debe convertirse en una nueva tarea humana'),'operating model must state the minimum-team rule')

if(failures.length){
  console.error('Minimum-team flow contract FAILED')
  for(const failure of failures)console.error(`- ${failure}`)
  process.exit(1)
}
console.log('Minimum-team flow contract PASS: reception, production, packing, inventory, commercial commitments and Today owner routing preserve capture-once, inherited context and exception-only review')
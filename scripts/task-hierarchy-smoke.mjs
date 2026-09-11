import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [floor,pallets,cold,inventory,lot,receptions,orders]=await Promise.all([
 readFile(new URL('../src/pages/FloorFocus.tsx',import.meta.url),'utf8'),
 readFile(new URL('../src/pages/PalletsFocus.tsx',import.meta.url),'utf8'),
 readFile(new URL('../src/pages/ColdChainFocus.tsx',import.meta.url),'utf8'),
 readFile(new URL('../src/pages/InventoryFocus.tsx',import.meta.url),'utf8'),
 readFile(new URL('../src/pages/Lot360.tsx',import.meta.url),'utf8'),
 readFile(new URL('../src/pages/Receptions.tsx',import.meta.url),'utf8'),
 readFile(new URL('../src/pages/SalesOrders.tsx',import.meta.url),'utf8'),
])

assert(floor.includes('eyebrow="Operación de planta" title="Packing"'),'Packing must identify the operator location before presenting the next action')
assert(!floor.includes('title="Siguiente acción"'),'Packing page title must not be a generic action label')
assert(floor.includes('className="button primary"')&&floor.includes('Ver estaciones'),'Packing must keep one primary operating action and configuration secondary')

assert(pallets.includes('eyebrow="Operación de planta" title="Pallets"'),'Pallets must use human plant context and no mixed-language eyebrow')
assert(!pallets.includes('Plant Execution'),'Spanish Pallets UX must not expose internal English terminology')
assert(!pallets.includes('daily-footer-actions'),'Pallets must not repeat the same detail navigation below its primary action')
assert(pallets.includes('className="button primary"'),'Pallets must retain one clear primary action')

assert(cold.includes('eyebrow="Operación de planta" title="Cadena de frío"'),'Cold chain must use plant-operating context')
assert(!cold.includes('daily-footer-actions'),'Cold chain must not repeat the same detail navigation below its primary action')
assert(cold.includes("value:'Registro manual'")&&cold.includes("value:'Automáticas'"),'Cold-chain capture state must be concise while retaining truthful manual/automatic distinction')

assert(inventory.includes("eyebrow={text('Operación de planta','Plant operations')}")&&inventory.includes("title={text('Inventario','Inventory')}"),'Inventory must use the same localized plant-operating hierarchy')
assert(inventory.includes("aria-label={text('Prioridad de inventario','Inventory priority')}")&&inventory.includes('className="button primary"'),'Inventory must remain decision-first with one explicit primary action')

assert(lot.includes('>Preguntar al asistente</button>'),'Ficha 360 must use human-first assistant language')
assert(!lot.includes('>Preguntar IA</button>'),'Ficha 360 must not require AI terminology for the secondary help action')
assert(lot.includes('className="button primary" to={control.nextRoute}'),'Ficha 360 must preserve the canonical next operational action as primary')
assert(lot.includes('<details className="lot360-fold">'),'Ficha 360 must keep evidence and traceability progressively disclosed')

assert(receptions.includes('<details className="panel list-panel receptions-history">'),'Receptions must keep historical evidence behind progressive disclosure')
assert(receptions.includes('className="button primary" onClick={onNew}'),'Receptions must retain a single primary creation action for authorized operators')
assert(orders.includes("title={isEs?'Órdenes de venta':'Sales orders'}")&&orders.includes("{isEs?'Nueva orden':'New order'}"),'Sales orders must retain a clear localized commercial task and primary creation action')

if(failures.length){console.error('Task hierarchy smoke FAILED');failures.forEach(f=>console.error(`- ${f}`));process.exit(1)}
console.log('Task hierarchy smoke PASS: critical plant and lot surfaces expose one dominant task, human-first location context, progressive detail and no duplicated primary navigation')

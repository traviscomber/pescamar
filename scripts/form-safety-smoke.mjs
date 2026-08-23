import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [reception,credits,commercial,inventory,costs]=await Promise.all([
  readFile(new URL('../src/components/ReceptionModal.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/Credits.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/Commercial.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/Inventory.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/TransformationCosts.tsx',import.meta.url),'utf8'),
])

assert(reception.includes('const [guide,setGuide]=useState("")'),'reception weights must start empty')
assert(!reception.includes('useState(100)')&&!reception.includes('useState(4.2)'),'reception capture must not contain synthetic measurement defaults')
assert(reception.includes('setEvidence([])')&&reception.includes('setSupplier("")'),'reception capture must reset between openings')
assert(reception.includes('aria-labelledby="reception-modal-title"')&&reception.includes('event.key==="Escape"'),'reception capture must remain keyboard-safe')

assert(!credits.includes('requestedBy'),'credit requester must come from authenticated server context')
assert(credits.includes('setFisher(\'\')')&&credits.includes('setRecoveryValue(0)'),'credit capture must reset between openings')
assert(credits.includes('aria-labelledby="credit-modal-title"')&&credits.includes("event.key==='Escape'"),'credit capture must remain keyboard-safe')

assert(commercial.includes('aria-labelledby="commercial-modal-title"')&&commercial.includes("event.key==='Escape'"),'commercial capture must remain keyboard-safe')
assert(commercial.includes("document.body.style.overflow='hidden'"),'commercial modal must lock background scroll')
assert(!commercial.includes('actions={<div className="page-actions">'),'commercial header must not nest shared action wrappers')

assert(inventory.includes('aria-labelledby="inventory-modal-title"')&&inventory.includes("event.key==='Escape'"),'inventory capture must remain keyboard-safe')
assert(inventory.includes("document.body.style.overflow='hidden'"),'inventory modal must lock background scroll')
assert(!inventory.includes('actions={data?.permissions?.canWrite?<div className="page-actions">'),'inventory header must not nest shared action wrappers')

assert(costs.includes('function startCost()')&&costs.includes("setAmount('')"),'transformation cost capture must reset before every new entry')
assert(costs.includes('aria-labelledby="cost-modal-title"')&&costs.includes("event.key==='Escape'"),'transformation cost capture must remain keyboard-safe')
assert(costs.includes("document.body.style.overflow='hidden'"),'transformation cost modal must lock background scroll')

if(failures.length){
  console.error('Operational form safety FAILED')
  for(const failure of failures)console.error(`- ${failure}`)
  process.exit(1)
}
console.log('Operational form safety PASS: real-data defaults, authenticated identity, reset behavior and keyboard-safe modals verified')

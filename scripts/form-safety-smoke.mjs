import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [reception,receptionVision,credits,commercial,inventory,costs,salesOrders,settlements,creditsApi,settlementApi,approvalsApi]=await Promise.all([
  readFile(new URL('../src/components/ReceptionModal.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/components/ReceptionVisionUpload.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/Credits.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/Commercial.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/Inventory.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/TransformationCosts.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/SalesOrders.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/Settlements.tsx',import.meta.url),'utf8'),
  readFile(new URL('../api/credits.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/settlements.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/approvals.ts',import.meta.url),'utf8'),
])

assert(reception.includes('const [guide,setGuide]=useState("")'),'reception weights must start empty')
assert(!reception.includes('useState(100)')&&!reception.includes('useState(4.2)'),'reception capture must not contain synthetic measurement defaults')
assert(reception.includes('setEvidence([])')&&reception.includes('setSupplier("")'),'reception capture must reset between openings')
assert(reception.includes('aria-labelledby="reception-modal-title"')&&reception.includes('event.key==="Escape"'),'reception capture must remain keyboard-safe')
assert(receptionVision.includes('setProposal(payload.vision)'),'reception vision must stage extracted fields as a proposal')
assert(receptionVision.includes('function applyProposal()')&&receptionVision.includes('onExtract(documentaryFields(proposal))'),'reception vision must apply only confirmed documentary context')
assert(receptionVision.includes('gross:null,tare:null,drained:null,temperature:null'),'reception vision must never promote document-derived physical measurements into live capture')
assert(!receptionVision.includes('if(payload.vision){onExtract(payload.vision)'),'reception vision must never silently apply probabilistic extraction')
assert(receptionVision.includes('La evidencia queda guardada en ambos casos'),'reception vision must preserve evidence when a proposal is rejected')
assert(receptionVision.includes('Estas mediciones deben confirmarse físicamente en planta'),'reception vision must make the physical-confirmation boundary explicit')

assert(!credits.includes('requestedBy'),'credit requester must come from authenticated server context')
assert(credits.includes("setSupplier('')")&&credits.includes('setRecoveryValue(0)'),'credit capture must reset between openings')
assert(credits.includes("party.kind==='supplier'&&party.active")&&credits.includes("fetch('/api/partners'"),'credit capture must select active mastered suppliers')
assert(credits.includes('aria-labelledby="credit-modal-title"')&&credits.includes("event.key==='Escape'"),'credit capture must remain keyboard-safe')
assert(creditsApi.includes('requested_by_operator_id')&&creditsApi.includes('${operator.id}::uuid'),'credit requests must persist stable operator identity')

assert(commercial.includes('aria-labelledby="commercial-modal-title"')&&commercial.includes("event.key==='Escape'"),'commercial capture must remain keyboard-safe')
assert(commercial.includes("document.body.style.overflow='hidden'"),'commercial modal must lock background scroll')
assert(!commercial.includes('actions={<div className="page-actions">'),'commercial header must not nest shared action wrappers')

assert(inventory.includes('aria-labelledby="inventory-modal-title"')&&inventory.includes("event.key==='Escape'"),'inventory capture must remain keyboard-safe')
assert(inventory.includes("document.body.style.overflow='hidden'"),'inventory modal must lock background scroll')
assert(!inventory.includes('actions={data?.permissions?.canWrite?<div className="page-actions">'),'inventory header must not nest shared action wrappers')

assert(costs.includes('function startCost()')&&costs.includes("setAmount('')"),'transformation cost capture must reset before every new entry')
assert(costs.includes('aria-labelledby="cost-modal-title"')&&costs.includes("event.key==='Escape'"),'transformation cost capture must remain keyboard-safe')
assert(costs.includes("document.body.style.overflow='hidden'"),'transformation cost modal must lock background scroll')

assert(salesOrders.includes('function startCreate()')&&salesOrders.includes("setCommittedKg('')")&&salesOrders.includes("setPrice('')"),'sales order capture must reset every new commitment')
assert(salesOrders.includes('aria-labelledby="sales-order-modal-title"')&&salesOrders.includes("event.key==='Escape'"),'sales order capture must remain keyboard-safe')
assert(salesOrders.includes('max={maxAllocation||undefined}')&&salesOrders.includes('Number(allocatedKg)>maxAllocation'),'sales allocations must be bounded in the client before mutation')
assert(salesOrders.includes('min={today()}'),'new sales orders must not accept a past delivery date in the client')

assert(settlements.includes('<option value="">Seleccionar recepción</option>'),'settlement creation must require an explicit reception selection')
assert(settlements.includes('deductions<=gross'),'settlement UI must bound deductions by gross amount')
assert(settlementApi.includes('${otherDeductions}<=round(r.accepted_kg*${pricePerKg})'),'settlement API must reject deductions above gross amount')
assert(settlementApi.includes('created_by_operator_id')&&settlementApi.includes('${operator.id}::uuid'),'settlements must persist stable creator identity')
assert(approvalsApi.includes('requested_by_operator_id is not null'),'credit dual control must prefer stable operator identity')
assert(approvalsApi.includes('created_by_operator_id is not null'),'settlement dual control must prefer stable operator identity')
assert(approvalsApi.includes('acted_by_operator_id'),'approval actions must persist stable actor identity')
assert(approvalsApi.includes('approved_by_operator_id'),'settlement approval must persist stable approver identity')
assert(approvalsApi.includes('created_by_operator_id) select account_id,id'),'credit movements must persist stable actor identity')

if(failures.length){
  console.error('Operational form safety FAILED')
  for(const failure of failures)console.error(`- ${failure}`)
  process.exit(1)
}
console.log('Operational form safety PASS: real-data defaults, explicit human confirmation of AI documentary context, physical measurements kept human-confirmed, stable authenticated identity, mastered counterparties, bounded financial inputs, UUID dual control, reset behavior and keyboard-safe modals verified')

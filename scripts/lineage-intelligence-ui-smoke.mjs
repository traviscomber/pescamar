import {readFile} from 'node:fs/promises'
import process from 'node:process'

const [lineage,css]=await Promise.all([
  readFile(new URL('../src/pages/Lineage.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/lineage.css',import.meta.url),'utf8'),
])
const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}

assert(lineage.includes("type OperationalIntelligence="),'Lineage must type the operational intelligence response')
assert(lineage.includes("const intelligence=mode==='live'?data?.intelligence:undefined"),'Operational intelligence must be gated to live mode')
assert(lineage.includes("mode==='live'&&intelligence?<section className=\"panel lineage-intelligence\""),'Operational intelligence panel must render only in live mode')
assert(lineage.includes('Qué requiere atención'),'Lineage must expose a decision-first attention heading')
assert(lineage.includes('Orientan revisión humana; no modifican estado operacional.'),'UI must state the non-writing operational boundary')
assert(lineage.includes('Histórico canónico · solo lectura.'),'Historical lineage must remain explicitly read-only')
assert(lineage.includes("const priorityLabels:Record<1|2|3,string>={1:'P1 · Crítico',2:'P2 · Revisar',3:'P3 · Completar'}"),'Priority semantics must remain explicit')
assert(lineage.includes("const confidenceLabels:Record<OperationalSignal['confidence'],string>={observed:'Observado',derived:'Derivado'}"),'Observed versus derived confidence must remain visible')
assert(lineage.includes('signal.evidenceEventIds.map(id=>eventById.get(id))'),'Signals must resolve back to Event Graph evidence')
assert(lineage.includes('signal.blockers.length'),'Signal blockers must remain visible when present')
assert(!/method:\s*['\"](?:POST|PUT|PATCH|DELETE)['\"]/.test(lineage),'Lineage intelligence UI must remain read-only')
assert(css.includes('.lineage-signal.p1::before')&&css.includes('.lineage-signal.p2::before')&&css.includes('.lineage-signal.p3::before'),'Priority hierarchy styles are missing')
assert(css.includes('@media(max-width:560px)')&&css.includes('.lineage-signal-action,.lineage-signal-evidence,.lineage-signal-blockers{grid-template-columns:1fr'),'Mobile signal layout contract is missing')

if(failures.length){
  console.error('Lineage intelligence UI smoke FAILED')
  for(const failure of failures)console.error(`- ${failure}`)
  process.exit(1)
}
console.log('Lineage intelligence UI smoke PASS: live-only intelligence, evidence attribution, human-review boundary, priority semantics, historical isolation and mobile hierarchy verified')

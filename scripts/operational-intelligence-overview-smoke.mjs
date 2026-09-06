import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [endpoint,engine,brief,css]=await Promise.all([
 readFile(new URL('../api/operational-intelligence-overview.ts',import.meta.url),'utf8'),
 readFile(new URL('../api/_operational-intelligence.ts',import.meta.url),'utf8'),
 readFile(new URL('../src/components/ExecutiveDecisionBrief.tsx',import.meta.url),'utf8'),
 readFile(new URL('../src/components/executive-decision-brief.css',import.meta.url),'utf8'),
])

assert(endpoint.includes("schemaVersion:'seafood.operational-intelligence.overview.v1'"),'Control Tower operational overview must be versioned')
assert(endpoint.includes("import {buildOperationalIntelligence,type OperationalSignal} from './_operational-intelligence.js'"),'overview must reuse the central Operational Intelligence engine')
assert(endpoint.includes('buildOperationalIntelligence(ordered)'),'each live lot graph must be evaluated by the central engine')
assert(endpoint.includes('reception_id=any(${ids}::uuid[])'),'overview must use batch event retrieval instead of per-lot queries')
assert(endpoint.includes('limit 30'),'overview must bound the live lot scan')
assert(endpoint.includes('optionalVisionRows(ids)'),'overview must include Vision evidence when available')
assert(endpoint.includes("type:'vision'")&&endpoint.includes('suggestedGrade:text(row.suggested_grade)')&&endpoint.includes('operatorGrade:text(row.operator_grade)'),'overview must preserve Vision review fields used by the engine')
assert(endpoint.includes("boundary:{writesOperationalState:false,liveOnly:true,historicalIncluded:false"),'overview must remain live-only and read-only')
assert(!endpoint.includes('canonical_'),'live Control Tower overview must not mix canonical historical tables into operational priorities')
assert(!/\b(insert|update|delete)\s+(into|from|[a-z_]+\s+set)\b/i.test(endpoint),'overview endpoint must not mutate operational state')
assert(engine.includes("OPERATIONAL_INTELLIGENCE_SCHEMA='seafood.operational-intelligence.v1'"),'central Operational Intelligence schema must remain explicit')
assert(brief.includes("fetch('/api/operational-intelligence-overview'"),'Executive Decision Brief must consume the live overview')
assert(brief.includes('Prioridad operacional')&&brief.includes('topOperational.signal.action'),'Control Tower must surface one dominant operational priority and next action')
assert(brief.includes('topOperational.signal.blockers'),'Control Tower must expose blockers before continuation')
assert(brief.includes('operationalCounts.p1')&&brief.includes('operationalCounts.p2')&&brief.includes('operationalCounts.p3'),'Control Tower must show P1/P2/P3 counts')
assert(brief.includes('topOperational.path'),'dominant signal must link back to attributable lineage evidence')
assert(brief.includes('El Event Graph no genera P1/P2/P3'),'zero-signal state must be explicit rather than fabricated')
assert(css.includes('.decision-operational-priority.p1')&&css.includes('.decision-operational-priority.p2')&&css.includes('.decision-operational-priority.p3'),'priority hierarchy must have explicit P1/P2/P3 visual states')
assert(css.includes('@media(max-width:640px)'),'Control Tower priority surface must preserve mobile layout')

if(failures.length){
 console.error('Operational Intelligence overview smoke FAILED')
 for(const failure of failures)console.error(`- ${failure}`)
 process.exit(1)
}
console.log('Operational Intelligence overview smoke PASS: batch live Event Graph aggregation, central signal engine, read-only boundary, attributable priority UI and responsive states verified')

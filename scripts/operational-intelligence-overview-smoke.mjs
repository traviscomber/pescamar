import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [endpoint,engine,brief,css,today]=await Promise.all([
 readFile(new URL('../api/operational-intelligence-overview.ts',import.meta.url),'utf8'),
 readFile(new URL('../api/_operational-intelligence.ts',import.meta.url),'utf8'),
 readFile(new URL('../src/components/ExecutiveDecisionBrief.tsx',import.meta.url),'utf8'),
 readFile(new URL('../src/components/executive-decision-brief.css',import.meta.url),'utf8'),
 readFile(new URL('../src/pages/DailyClose.tsx',import.meta.url),'utf8'),
])

assert(endpoint.includes("schemaVersion:'seafood.operational-intelligence.overview.v1'"),'Control Tower operational overview must be versioned')
assert(endpoint.includes("import {buildOperationalIntelligence,type OperationalSignal} from './_operational-intelligence.js'"),'overview must reuse the central Operational Intelligence engine')
assert(endpoint.includes('buildOperationalIntelligence(ordered)'),'each live lot graph must be evaluated by the central engine')
assert(endpoint.includes('reception_id=any(${ids}::uuid[])'),'overview must use batch event retrieval instead of per-lot queries')
assert(endpoint.includes('limit 30'),'overview must bound the live lot scan')
assert(endpoint.includes('optionalVisionRows(ids)'),'overview must include Vision evidence when available')
assert(endpoint.includes("type:'vision'")&&endpoint.includes('suggestedGrade:text(row.suggested_grade)')&&endpoint.includes('operatorGrade:text(row.operator_grade)'),'overview must preserve Vision review fields used by the engine')
assert(endpoint.includes("boundary:{writesOperationalState:false,liveOnly:true,historicalIncluded:false"),'overview must remain live-only and read-only')
assert(endpoint.includes('request.query?.plantId')&&endpoint.includes("return response.status(403).json({ok:false,error:'Planta fuera de alcance'})"),'overview plant scope must fail closed for non-admin operators')
assert(endpoint.includes('where r.plant_id=${plantId}'),'overview must filter the graph by requested plant before ranking')
assert(endpoint.includes('scope:{plantId,role:operator.role}'),'overview must expose the resolved plant scope')
assert(!endpoint.includes('canonical_'),'live Control Tower overview must not mix canonical historical tables into operational priorities')
assert(!/\b(insert|update|delete)\s+(into|from|[a-z_]+\s+set)\b/i.test(endpoint),'overview endpoint must not mutate operational state')
assert(engine.includes("OPERATIONAL_INTELLIGENCE_SCHEMA='seafood.operational-intelligence.v1'"),'central Operational Intelligence schema must remain explicit')
assert(brief.includes("fetch('/api/operational-intelligence-overview'"),'Executive Decision Brief must consume the live overview')
assert(brief.includes('Prioridad operacional')&&brief.includes('topOperational.signal.action'),'Control Tower must surface one dominant operational priority and next action')
assert(brief.includes('topOperational.signal.blockers'),'Control Tower must expose blockers before continuation')
assert(brief.includes('operationalCounts.p1')&&brief.includes('operationalCounts.p2')&&brief.includes('operationalCounts.p3'),'Control Tower must show P1/P2/P3 counts')
assert(brief.includes('topOperational.path'),'dominant signal must link back to attributable lineage evidence')
assert(brief.includes('El Event Graph no genera P1/P2/P3'),'zero-signal state must be explicit rather than fabricated')
assert(today.includes("readJson<OperationalPayload>(`/api/operational-intelligence-overview"),'Today must consume the same Operational Intelligence overview as the executive Control Tower')
assert(!today.includes("readJson<TowerPayload>(`/api/control-tower"),'Today must not use the legacy parallel lot ranking as a priority source')
assert(today.includes("source:'event_graph' as const")&&today.includes("Operational Intelligence · Seafood Event Graph live"),'Today must label Event Graph priority provenance explicitly')
assert(today.includes('eventScore=(priority:OperationalSignal')&&today.includes("priority===1?1000:priority===2?700:400"),'Today must preserve P1 > P2 > P3 ordering')
assert(today.includes("operationalQuery.set('plantId',nextPlant)"),'Today must pass selected plant scope into Operational Intelligence')
assert(css.includes('.decision-operational-priority.p1')&&css.includes('.decision-operational-priority.p2')&&css.includes('.decision-operational-priority.p3'),'priority hierarchy must have explicit P1/P2/P3 visual states')
assert(css.includes('@media(max-width:640px)'),'Control Tower priority surface must preserve mobile layout')

if(failures.length){
 console.error('Operational Intelligence overview smoke FAILED')
 for(const failure of failures)console.error(`- ${failure}`)
 process.exit(1)
}
console.log('Operational Intelligence overview smoke PASS: one-source Event Graph priorities, plant scoping, batch live aggregation, read-only boundary and Control Tower consumers verified')

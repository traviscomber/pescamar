import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [endpoint,engine,copilot,brief,css,today,passCss]=await Promise.all([
 readFile(new URL('../api/operational-intelligence-overview.ts',import.meta.url),'utf8'),
 readFile(new URL('../api/_operational-intelligence.ts',import.meta.url),'utf8'),
 readFile(new URL('../api/_copilot-operational-intelligence.ts',import.meta.url),'utf8'),
 readFile(new URL('../src/components/ExecutiveDecisionBrief.tsx',import.meta.url),'utf8'),
 readFile(new URL('../src/components/executive-decision-brief.css',import.meta.url),'utf8'),
 readFile(new URL('../src/pages/DailyClose.tsx',import.meta.url),'utf8'),
 readFile(new URL('../src/control-tower-pass.css',import.meta.url),'utf8'),
])

assert(endpoint.includes("schemaVersion:'seafood.operational-intelligence.overview.v1'"),'Control Tower operational overview must be versioned')
assert(endpoint.includes("import {buildOperationalIntelligence,type OperationalSignal} from './_operational-intelligence.js'"),'overview must reuse the central Operational Intelligence engine')
assert(endpoint.includes('buildOperationalIntelligence(ordered,intelligenceCapabilities)'),'each live lot graph must be evaluated by the central engine with evidence-assessment capabilities')
assert(endpoint.includes("const intelligenceCapabilities={canAssessCommercialCommitment:commercialRole,canAssessSalesDispatch:commercialRole}"),'overview must derive commercial assessment capability from the authenticated role')
assert(endpoint.includes("commercialRole?sql`select a.reception_id")&&endpoint.includes("commercialRole?sql`select s.reception_id"),'overview must not fetch restricted commercial allocation/sale evidence for roles without commercial visibility')
assert(endpoint.includes('reglas que requieren evidencia oculta por rol se suprimen')||endpoint.includes('Reglas que requieren evidencia oculta por rol se suprimen'),'overview boundary must state that permission-hidden evidence is not interpreted as factual absence')
assert(endpoint.includes('reception_id=any(${ids}::uuid[])'),'overview must use batch event retrieval instead of per-lot queries')
assert(endpoint.includes('limit 30'),'overview must bound the live lot scan')
assert(endpoint.includes('optionalVisionRows(ids)'),'overview must include Vision evidence when available')
assert(endpoint.includes("type:'vision'")&&endpoint.includes('suggestedGrade:text(row.suggested_grade)')&&endpoint.includes('operatorGrade:text(row.operator_grade)'),'overview must preserve Vision review fields used by the engine')
assert(endpoint.includes("boundary:{writesOperationalState:false,liveOnly:true,historicalIncluded:false"),'overview must remain live-only and read-only')
assert(endpoint.includes('request.query?.plantId')&&endpoint.includes("return response.status(403).json({ok:false,error:'Planta fuera de alcance'})"),'overview plant scope must fail closed for non-admin operators')
assert(endpoint.includes('where r.plant_id=${plantId}'),'overview must filter the graph by requested plant before ranking')
assert(endpoint.includes('scope:{plantId,role:operator.role}'),'overview must expose the resolved plant scope')
assert(endpoint.includes('r.created_by_operator_id')&&endpoint.includes('actor:text(reception.created_by_operator_id)'),'overview must use the production reception operator column rather than a non-existent created_by field')
assert(!endpoint.includes('r.created_by,'),'overview must not regress to the non-existent receptions.created_by column')
assert(!endpoint.includes('canonical_'),'live Control Tower overview must not mix canonical historical tables into operational priorities')
assert(!/\b(insert|update|delete)\s+(into|from|[a-z_]+\s+set)\b/i.test(endpoint),'overview endpoint must not mutate operational state')
assert(engine.includes("OPERATIONAL_INTELLIGENCE_SCHEMA='seafood.operational-intelligence.v1'"),'central Operational Intelligence schema must remain explicit')
assert(engine.includes('type OperationalIntelligenceCapabilities')||engine.includes('export type OperationalIntelligenceCapabilities'),'central engine must model evidence-assessment capability explicitly')
assert(engine.includes('capabilities.canAssessCommercialCommitment&&dispatches.length&&!commitments.length'),'missing commercial commitment signal must require permission to assess commitments')
assert(engine.includes('capabilities.canAssessSalesDispatch&&sales.length&&!dispatches.length'),'missing dispatch signal must require permission to assess sale/dispatch evidence')
assert(engine.includes('capabilities.canAssessCommercialCommitment&&commitments.length&&!inventory.length'),'availability signal based on commitments must require commercial assessment capability')
assert(engine.includes('ausencia por permisos nunca se convierte en ausencia factual'),'central engine boundary must explicitly prohibit permission absence from becoming factual absence')
assert(copilot.includes("const intelligenceCapabilities={canAssessCommercialCommitment:commercialRole,canAssessSalesDispatch:commercialRole}"),'Seafood AI lot intelligence must derive the same assessment capabilities')
assert(copilot.includes('buildOperationalIntelligence(ordered,intelligenceCapabilities)'),'Seafood AI must use permission-aware Operational Intelligence')
assert(copilot.includes("commercialRole?sql`select a.id allocation_id")&&copilot.includes("commercialRole?sql`select s.id,s.dispatch_id"),'Seafood AI must not retrieve restricted commercial evidence merely to suppress a false positive')
assert(brief.includes("fetch('/api/operational-intelligence-overview'"),'Executive Decision Brief must consume the live overview')
assert(brief.includes('Prioridad operacional')&&brief.includes('topOperational.signal.action'),'Control Tower must surface one dominant operational priority and next action')
assert(brief.includes('ownerForPath')&&brief.includes('Responsable sugerido:'),'Control Tower must route the dominant exception to one responsible role without pretending an individual assignment')
assert(brief.includes("return 'Comercial / administrativo'")&&brief.includes("return 'Gerente / supervisor'")&&brief.includes("return 'Operador generalista'"),'responsible-role routing must preserve the minimum-team operating model')
assert(brief.includes('topOperational.signal.blockers'),'Control Tower must expose blockers before continuation')
assert(brief.includes('operationalCounts.p1')&&brief.includes('operationalCounts.p2')&&brief.includes('operationalCounts.p3'),'Control Tower must show P1/P2/P3 counts')
assert(brief.includes('topOperational.path'),'dominant signal must link back to attributable lineage evidence')
assert(brief.includes('El Event Graph no genera P1/P2/P3'),'zero-signal state must be explicit rather than fabricated')
assert(brief.includes('comparableCandidates=candidates.filter(item=>item.supplier.coverage>=40'),'supplier recommendation must not prefer raw high scores without minimum comparable coverage')
assert(brief.includes("preferred.supplier.coverage<40?'score observado':'score compra'")&&brief.includes('cobertura ${nf.format(preferred.supplier.coverage)}%')&&brief.includes('confianza ${preferred.supplier.confidence}'),'supplier score presentation must expose coverage and confidence')
assert(today.includes("readJson<OperationalPayload>(`/api/operational-intelligence-overview"),'Today must consume the same Operational Intelligence overview as the executive Control Tower')
assert(!today.includes("readJson<TowerPayload>(`/api/control-tower"),'Today must not use the legacy parallel lot ranking as a priority source')
assert(today.includes("source:'event_graph' as const")&&today.includes("Operational Intelligence · Seafood Event Graph live"),'Today must label Event Graph priority provenance explicitly')
assert(today.includes('eventScore=(priority:OperationalSignal')&&today.includes("priority===1?1000:priority===2?700:400"),'Today must preserve P1 > P2 > P3 ordering')
assert(today.includes("operationalQuery.set('plantId',nextPlant)"),'Today must pass selected plant scope into Operational Intelligence')
assert(today.includes('daily-clear-context')&&today.includes('Cobertura live')&&today.includes('Actividad del día')&&today.includes('Inventario ubicado'),'green Today state must preserve useful live context rather than render an empty success state')
assert(css.includes('.decision-operational-priority.p1')&&css.includes('.decision-operational-priority.p2')&&css.includes('.decision-operational-priority.p3'),'priority hierarchy must have explicit P1/P2/P3 visual states')
assert(css.includes('@media(max-width:640px)'),'Control Tower priority surface must preserve mobile layout')
assert(passCss.includes('.main-content:has(>.daily-cockpit)>.page-header')&&passCss.includes('.daily-clear-context'),'Today visual pass must keep a compact header and contextual clear state')
assert(passCss.includes('.main-content:has(>.platform-strip)>.import-history.panel')&&passCss.includes('.main-content:has(>.event-kind-tabs+.signal-grid)>.panel:has(.compact-ledger)')&&passCss.includes('.corporate-plant-card'),'secondary operational/admin surfaces must share the flatter OS visual language')
assert(passCss.includes('@media(max-width:620px)')&&passCss.includes('.daily-clear-context{grid-template-columns:1fr}'),'final polish must include explicit mobile behavior')

if(failures.length){
 console.error('Operational Intelligence overview smoke FAILED')
 for(const failure of failures)console.error(`- ${failure}`)
 process.exit(1)
}
console.log('Operational Intelligence overview smoke PASS: one-source Event Graph priorities, permission-aware evidence assessment, responsible-role routing, production-schema-safe provenance, confidence-aware supplier scoring, compact Today and useful green state verified')
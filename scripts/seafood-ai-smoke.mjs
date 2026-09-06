import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [handler,context,contextWithLot,operationalContext,policy,intelligence,page,authServer,authClient]=await Promise.all([
  readFile(new URL('../api/copilot.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/_copilot-context.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/_copilot-context-with-lot.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/_copilot-operational-intelligence.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/_seafood-ai-policy.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/_canonical-business-intelligence.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/Copilot.tsx',import.meta.url),'utf8'),
  readFile(new URL('../api/_auth.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/auth.tsx',import.meta.url),'utf8'),
])

assert(policy.includes("SEAFOOD_AI_POLICY_VERSION='seafood.ai.evidence.v6'"),'Seafood AI policy must be explicitly versioned at v6')
for(const [source,evidenceClass] of Object.entries({receptions:'live_observation',production:'derived_live',quality:'live_observation',inventory:'derived_live',orders:'live_observation',canonical_sources:'canonical_reference',canonical_inventory:'canonical_history',finance:'partial_financial',operational_intelligence:'derived_live'}))assert(policy.includes(`${source}:'${evidenceClass}'`),`${source} must have evidence class ${evidenceClass}`)
assert(policy.includes('Cálculo:')&&policy.includes('Inferencia:')&&policy.includes('Dato faltante:'),'Seafood AI must distinguish calculation, inference and missing evidence')
assert(policy.includes('Nunca afirmes que ejecutaste, aprobaste o modificaste algo'),'Seafood AI must remain read-only in its policy')
assert(policy.includes('missingGuidePrice')&&policy.includes('missingReceivedKg')&&policy.includes('missingProcessDate')&&policy.includes('missingProductionDate'),'Seafood AI policy must treat canonical production completeness gaps as missing evidence')
assert(policy.includes('transactionalRows incluye exclusivamente filas con fecha Y al menos un movimiento monetario'),'Seafood AI policy must define the audited ledger movement boundary')
assert(policy.includes('referenceRows son las demás filas preservadas'),'Seafood AI policy must preserve and classify ledger reference rows')
assert(policy.includes('Nunca llames transacción a referenceRows'),'Seafood AI must never promote reference rows into financial movements')
assert(policy.includes('operational_intelligence es la capa determinística de prioridades del Seafood Event Graph'),'Seafood AI must use Event Graph operational intelligence as its priority layer')
assert(policy.includes('No inventes una señal adicional ni cambies su prioridad'),'Seafood AI must preserve deterministic signal priority')
assert(policy.includes('boundary.writesOperationalState=false es vinculante'),'Seafood AI must preserve the read-only operational intelligence boundary')
assert(handler.includes('requireOperator(req)'),'Seafood AI implementation must require authenticated operator')
assert(handler.includes('operator.organizationId!==activeOrganization.organizationId'),'Seafood AI must enforce organization boundary before context retrieval')
assert(authServer.includes('organizationId: organization.organizationId'),'server auth must carry the resolved organization context')
assert(authClient.includes('organizationId: operator.organizationId || organizationContext.organizationId'),'client auth must preserve/normalize organization context')
assert(handler.includes('evidenceClassForSource(source.id)'),'every source returned to the model must be classified')
assert(handler.includes('unclassified_source:'),'unclassified evidence sources must fail closed')
assert(handler.includes('invalidSourceTags(answer,new Set(sources.map(source=>source.id)))'),'model citations must be validated against available evidence sources')
assert(handler.includes('invalid_source_tags:'),'invalid model evidence tags must fail closed')
assert(handler.includes("engine:seniorUrchin?'Asistente Senior de Erizo':'Seafood AI'")&&handler.includes('policyVersion:SEAFOOD_AI_POLICY_VERSION'),'API must expose engine mode and evidence policy version')
assert(context.includes('writesLiveInventory:false'),'canonical packing evidence must remain explicitly non-live inventory')
assert(contextWithLot.includes('buildCopilotOperationalIntelligence'),'lot-scoped context must attach Event Graph operational intelligence')
assert(contextWithLot.includes('operational_intelligence:operational.data'),'lot-scoped context must expose operational intelligence to the model')
assert(operationalContext.includes("import {buildOperationalIntelligence} from './_operational-intelligence.js'"),'copilot operational intelligence must reuse the canonical Event Graph intelligence engine')
assert(operationalContext.includes('evidenceEventIds')===false,'copilot bridge must not invent signal evidence ids; ids come from buildOperationalIntelligence')
assert(operationalContext.includes("id:'operational_intelligence'"),'copilot bridge must expose one classified operational intelligence source')
assert(operationalContext.includes('writesOperationalState')===false,'copilot bridge must not introduce an independent write boundary')
assert(operationalContext.includes('optionalVisionRows')&&operationalContext.includes("type:'vision'"),'copilot Event Graph bridge must include the same Vision evidence needed by lineage intelligence')
assert(operationalContext.includes('suggestedGrade:text(row.suggested_grade)')&&operationalContext.includes('operatorGrade:text(row.operator_grade)')&&operationalContext.includes('confirmedBy:text(row.confirmed_by)'),'copilot Vision evidence must preserve human-review fields used by operational intelligence')
assert(intelligence.includes("LEDGER_MOVEMENT_RULE='event_date is not null and (inflow_clp is not null or outflow_clp is not null)'"),'canonical intelligence must use dated monetary rows only as financial movements')
assert(intelligence.includes('reference_rows'),'canonical intelligence must expose preserved non-movement ledger rows')
assert(intelligence.includes("movementRule:'dated_monetary_row_only'"),'canonical intelligence must expose the finance grain contract')
assert(intelligence.includes('missing_guide_price')&&intelligence.includes('missing_received_kg')&&intelligence.includes('missing_process_date')&&intelligence.includes('missing_production_date'),'canonical intelligence must derive production completeness gaps deterministically')
assert(intelligence.includes('sum(inflow_clp) filter(where ${LEDGER_MOVEMENT_RULE})')&&intelligence.includes('sum(outflow_clp) filter(where ${LEDGER_MOVEMENT_RULE})'),'canonical financial totals must exclude reference rows')
assert(page.includes('Seafood AI · evidence-native'),'Pescamar IA must expose the reusable Seafood AI engine')
assert(page.includes('operational_intelligence'),'UI citation parser must support Event Graph operational intelligence evidence')
assert(page.includes('Event Graph + Lot Control'),'lot-scoped UI must expose the decision stack')
assert(page.includes('evidenceLabels'),'UI must expose evidence classes to the user')
assert(page.includes('Sin escrituras ni acciones'),'UI must keep the read-only trust boundary visible')
assert(!/\b(insert|update|delete)\s+(into|from|[a-z_]+\s+set)\b/i.test(`${handler}\n${context}\n${contextWithLot}\n${operationalContext}\n${policy}\n${intelligence}`),'Seafood AI path must not introduce data mutation')

if(failures.length){
 console.error('Seafood AI smoke FAILED')
 for(const failure of failures)console.error(`- ${failure}`)
 process.exit(1)
}
console.log('Seafood AI smoke PASS: evidence classes, organization scope, Event Graph operational priorities including Vision review, canonical production gaps, audited ledger grain, read-only policy and source validation verified')

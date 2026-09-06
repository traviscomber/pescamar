import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [handler,context,policy,intelligence,page,authServer,authClient]=await Promise.all([
  readFile(new URL('../api/copilot.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/_copilot-context.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/_seafood-ai-policy.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/_canonical-business-intelligence.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/Copilot.tsx',import.meta.url),'utf8'),
  readFile(new URL('../api/_auth.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/auth.tsx',import.meta.url),'utf8'),
])

assert(policy.includes("SEAFOOD_AI_POLICY_VERSION='seafood.ai.evidence.v5'"),'Seafood AI policy must be explicitly versioned at v5')
for(const [source,evidenceClass] of Object.entries({receptions:'live_observation',production:'derived_live',quality:'live_observation',inventory:'derived_live',orders:'live_observation',canonical_sources:'canonical_reference',canonical_inventory:'canonical_history',finance:'partial_financial'}))assert(policy.includes(`${source}:'${evidenceClass}'`),`${source} must have evidence class ${evidenceClass}`)
assert(policy.includes('Cálculo:')&&policy.includes('Inferencia:')&&policy.includes('Dato faltante:'),'Seafood AI must distinguish calculation, inference and missing evidence')
assert(policy.includes('Nunca afirmes que ejecutaste, aprobaste o modificaste algo'),'Seafood AI must remain read-only in its policy')
assert(policy.includes('missingGuidePrice')&&policy.includes('missingReceivedKg')&&policy.includes('missingProcessDate')&&policy.includes('missingProductionDate'),'Seafood AI policy must treat canonical production completeness gaps as missing evidence')
assert(policy.includes('transactionalRows incluye exclusivamente filas con fecha Y al menos un movimiento monetario'),'Seafood AI policy must define the audited ledger movement boundary')
assert(policy.includes('referenceRows son las demás filas preservadas'),'Seafood AI policy must preserve and classify ledger reference rows')
assert(policy.includes('Nunca llames transacción a referenceRows'),'Seafood AI must never promote reference rows into financial movements')
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
assert(intelligence.includes("LEDGER_MOVEMENT_RULE='event_date is not null and (inflow_clp is not null or outflow_clp is not null)'"),'canonical intelligence must use dated monetary rows only as financial movements')
assert(intelligence.includes('reference_rows'),'canonical intelligence must expose preserved non-movement ledger rows')
assert(intelligence.includes("movementRule:'dated_monetary_row_only'"),'canonical intelligence must expose the finance grain contract')
assert(intelligence.includes('missing_guide_price')&&intelligence.includes('missing_received_kg')&&intelligence.includes('missing_process_date')&&intelligence.includes('missing_production_date'),'canonical intelligence must derive production completeness gaps deterministically')
assert(intelligence.includes('sum(inflow_clp) filter(where ${LEDGER_MOVEMENT_RULE})')&&intelligence.includes('sum(outflow_clp) filter(where ${LEDGER_MOVEMENT_RULE})'),'canonical financial totals must exclude reference rows')
assert(page.includes('Seafood AI · evidence-native'),'Pescamar IA must expose the reusable Seafood AI engine')
assert(page.includes('canonical_inventory'),'UI citation parser must support canonical inventory evidence')
assert(page.includes('evidenceLabels'),'UI must expose evidence classes to the user')
assert(page.includes('Sin escrituras ni acciones'),'UI must keep the read-only trust boundary visible')
assert(!/\b(insert|update|delete)\s+(into|from|[a-z_]+\s+set)\b/i.test(`${handler}\n${context}\n${policy}\n${intelligence}`),'Seafood AI path must not introduce data mutation')

if(failures.length){
 console.error('Seafood AI smoke FAILED')
 for(const failure of failures)console.error(`- ${failure}`)
 process.exit(1)
}
console.log('Seafood AI smoke PASS: evidence classes, organization scope, canonical production gaps, audited ledger grain, read-only policy and source validation verified')

import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [handler,context,policy,page,authServer,authClient]=await Promise.all([
  readFile(new URL('../api/copilot.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/_copilot-context.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/_seafood-ai-policy.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/Copilot.tsx',import.meta.url),'utf8'),
  readFile(new URL('../api/_auth.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/auth.tsx',import.meta.url),'utf8'),
])

assert(policy.includes("SEAFOOD_AI_POLICY_VERSION='seafood.ai.evidence.v1'"),'Seafood AI policy must be explicitly versioned')
for(const [source,evidenceClass] of Object.entries({receptions:'live_observation',production:'derived_live',quality:'live_observation',inventory:'derived_live',orders:'live_observation',canonical_sources:'canonical_reference',canonical_inventory:'canonical_history',finance:'partial_financial'}))assert(policy.includes(`${source}:'${evidenceClass}'`),`${source} must have evidence class ${evidenceClass}`)
assert(policy.includes('Cálculo:')&&policy.includes('Inferencia:')&&policy.includes('Dato faltante:'),'Seafood AI must distinguish calculation, inference and missing evidence')
assert(policy.includes('Nunca afirmes que ejecutaste, aprobaste o modificaste algo'),'Seafood AI must remain read-only in its policy')
assert(handler.includes('requireOperator(req)'),'Seafood AI implementation must require authenticated operator')
assert(handler.includes('operator.organizationId!==activeOrganization.organizationId'),'Seafood AI must enforce organization boundary before context retrieval')
assert(authServer.includes('organizationId: activeOrganization.organizationId'),'server auth must carry organization context')
assert(authClient.includes('organizationId: operator.organizationId || organizationContext.organizationId'),'client auth must preserve/normalize organization context')
assert(handler.includes('evidenceClassForSource(source.id)'),'every source returned to the model must be classified')
assert(handler.includes('unclassified_source:'),'unclassified evidence sources must fail closed')
assert(handler.includes('invalidSourceTags(answer,new Set(sources.map(source=>source.id)))'),'model citations must be validated against available evidence sources')
assert(handler.includes('invalid_source_tags:'),'invalid model evidence tags must fail closed')
assert(handler.includes("engine:'Seafood AI'")&&handler.includes('policyVersion:SEAFOOD_AI_POLICY_VERSION'),'API must expose engine and evidence policy version')
assert(context.includes('writesLiveInventory:false'),'canonical packing evidence must remain explicitly non-live inventory')
assert(page.includes('Seafood AI · evidence-native'),'Pescamar IA must expose the reusable Seafood AI engine')
assert(page.includes('canonical_inventory'),'UI citation parser must support canonical inventory evidence')
assert(page.includes('evidenceLabels'),'UI must expose evidence classes to the user')
assert(page.includes('Sin escrituras ni acciones'),'UI must keep the read-only trust boundary visible')
assert(!/\b(insert|update|delete)\s+(into|from|[a-z_]+\s+set)\b/i.test(`${handler}\n${context}\n${policy}`),'Seafood AI path must not introduce data mutation')

if(failures.length){
 console.error('Seafood AI smoke FAILED')
 for(const failure of failures)console.error(`- ${failure}`)
 process.exit(1)
}
console.log('Seafood AI smoke PASS: evidence classes, organization scope, read-only policy, source validation, canonical inventory citation and UI trust boundaries verified')

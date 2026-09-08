import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [router,loader,handler,policy]=await Promise.all([
 readFile(new URL('../api/_seafood-query-router.ts',import.meta.url),'utf8'),
 readFile(new URL('../api/_copilot-route-evidence.ts',import.meta.url),'utf8'),
 readFile(new URL('../api/copilot.ts',import.meta.url),'utf8'),
 readFile(new URL('../api/_seafood-ai-policy.ts',import.meta.url),'utf8'),
])

assert(router.includes("SEAFOOD_QUERY_ROUTER_VERSION='seafood.router.v2'"),'query router must be explicitly versioned')
assert(router.includes('Pescamar is bilingual'),'router must preserve explicit bilingual routing intent')
for(const route of ['deterministic','fast_evidence','investigative'])assert(router.includes(`route:'${route}'`),`router must expose ${route} route`)
for(const capability of ['lot_control','operational_intelligence','receptions','production','quality','inventory','orders','historical_lineage','canonical_intelligence','finance','urchin_graph','photo_observation'])assert(router.includes(`${capability}:`)||router.includes(`'${capability}'`),`router catalog must include ${capability}`)
assert(router.includes('writesAllowed:false'),'all routes must remain read-only')
assert(router.includes("humanGate:'material_action_review'"),'material actions must preserve a human gate')
assert(router.includes('evaluateEvidenceSufficiency'),'router must expose an evidence sufficiency gate')
assert(router.includes("status:missing.length?'insufficient':empty.length?'limited':'sufficient'"),'evidence gate must distinguish missing and empty evidence')
assert(router.includes('historicalComparison'),'history/canonical evidence must be required by question semantics rather than every investigative route')
assert(router.includes('/\\bwhy\\b/')&&router.includes('/\\bcompare/')&&router.includes('/\\btraceab/'),'English investigative intent must have first-class routing coverage')
assert(router.includes('/\\bwhat blocks\\b/')&&router.includes('/\\bcan i ship\\b/')&&router.includes('/\\bjapan\\b/'),'English lot status and material-action language must route explicitly')
assert(loader.includes('const selected=[...route.requiredCapabilities]'),'loader must fetch required capabilities only')
assert(!loader.includes("route.route==='investigative'?unique"),'investigative routing must not silently load every optional capability')
assert(loader.includes("needBase?buildCopilotContext(operator,plantId):Promise.resolve(null)"),'deterministic lot routing must be able to skip the broad base context')
assert(loader.includes("selected.includes('historical_lineage')?buildHistoricalLineageEvidence"),'historical lineage must load only when routed')
assert(loader.includes("selected.includes('canonical_intelligence')?buildCanonicalBusinessIntelligence"),'canonical intelligence must load only when routed')
assert(loader.includes("selected.includes('urchin_graph')?buildSeaUrchinCopilotEvidence"),'urchin specialist must load only when routed')
assert(handler.includes('routeSeafoodQuery({question,hasLot,hasPhotos:hasPhotoEvidence,seniorUrchin})'),'copilot must route before evidence assembly')
assert(handler.includes('buildRoutedCopilotEvidence(operator,plantId,body.receptionId,queryRoute)'),'copilot must use routed evidence loading')
assert(handler.includes("queryRoute.route==='deterministic'&&lotControl"),'deterministic route must bypass the model when deterministic evidence is sufficient')
assert(handler.includes('routerVersion:SEAFOOD_QUERY_ROUTER_VERSION'),'API must expose router version')
assert(handler.includes('evidenceGate'),'API and model snapshot must expose evidence sufficiency')
assert(policy.includes("SEAFOOD_AI_POLICY_VERSION='seafood.ai.evidence.v9'"),'Seafood AI policy must be versioned at v9')
assert(policy.includes('Seafood AI Router decide qué capabilities cargar'),'policy must bind the model to router scope')
assert(policy.includes("evidenceGate es vinculante"),'policy must bind conclusions to evidence sufficiency')
assert(policy.includes("router.writesAllowed=false es vinculante"),'policy must preserve routed read-only boundary')
assert(policy.includes("router.humanGate='material_action_review'"),'policy must preserve human review for material actions')
assert(!/\b(insert|update|delete)\s+(into|from|[a-z_]+\s+set)\b/i.test(`${router}\n${loader}\n${handler}`),'router and routed evidence path must not introduce data mutation')

if(failures.length){
 console.error('Seafood AI router smoke FAILED')
 for(const failure of failures)console.error(`- ${failure}`)
 process.exit(1)
}
console.log('Seafood AI router smoke PASS: bilingual deterministic, fast-evidence and investigative routing, evidence-minimal loading, sufficiency gate, human review and read-only boundaries verified')

import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [foundation,endpoint,serverRegistry,clientRegistry]=await Promise.all([
  readFile(new URL('../api/_gdst2.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/gdst-capability.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/_integration.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/integrations.ts',import.meta.url),'utf8'),
])

assert(foundation.includes("GDST2_CAPABILITY_SCHEMA='seafood.gdst2-capability.v1'"),'GDST capability contract must be versioned')
assert(foundation.includes("GDST2_STANDARD_VERSION='2.0'"),'foundation must pin GDST 2.0')
assert(foundation.includes("https://ref.gs1.org/standards/epcis/epcis-context.jsonld"),'foundation must pin the EPCIS 2.0 JSON-LD context')
for(const parameter of ['LT_eventTime','LT_recordTime','EQ_bizStep','EQ_transformationID','EQ_bizLocation'])assert(foundation.includes(`'${parameter}'`),`foundation must track required GDST 2.0 query parameter ${parameter}`)

for(const contract of [
  ["seafoodEventType:'reception'","cte:'receiving'","epcisType:'ObjectEvent'","bizStep:'receiving'"],
  ["seafoodEventType:'production'","cte:'transformation'","epcisType:'TransformationEvent'","bizStep:'commissioning'"],
  ["seafoodEventType:'dispatch'","cte:'shipping'","epcisType:'ObjectEvent'","bizStep:'shipping'"],
])for(const marker of contract)assert(foundation.includes(marker),`GDST event mapping must include ${marker}`)

for(const type of ['packing','pallet','cold']){
  const mapping=foundation.split(`${type}:{seafoodEventType:'${type}'`)[1]?.split('},')[0]??''
  assert(mapping.includes("state:'supporting_evidence'"),`${type} must remain supporting evidence until an explicit GDST/EPCIS profile is implemented`)
  assert(mapping.includes('cte:null')&&mapping.includes('epcisType:null'),`${type} must not silently become a GDST CTE`)
}

assert(foundation.includes('Landing o transshipment requieren un CTE distinto'),'reception mapping must not silently reinterpret landing/transshipment as land receiving')
assert(foundation.includes("id:'gs1-identity-registry',state:'foundation'"),'GS1 identity registry may be foundation once validation/schema contract exists')
assert(foundation.includes('no implica que existan identificadores reales confirmados'),'GS1 foundation must not imply real confirmed identifiers')
assert(foundation.includes("id:'product-location-classification',state:'missing'"),'GDST 2.0 classification gap must remain explicit')
assert(foundation.includes("id:'decommission-event',state:'missing'"),'GDST 2.0 decommission gap must remain explicit')
assert(foundation.includes("id:'epcis-jsonld-serialization',state:'foundation'"),'implemented fail-closed serializer must be represented as foundation')
assert(foundation.includes('External export permanece OFF')&&foundation.includes('no se emiten eventos parciales'),'serializer foundation must preserve the external-export and partial-event boundary')
assert(foundation.includes("id:'epcis-query-interface',state:'missing'"),'query interface must remain missing until implemented')
assert(foundation.includes("id:'epcis-capture-write',state:'missing'"),'capture/write must remain missing until implemented')
assert(foundation.includes("id:'digital-link-resolver-1.2',state:'missing'"),'Digital Link Resolver must remain missing until implemented')
assert(foundation.includes("id:'master-data-resolution',state:'missing'"),'GS1 registry must not promote master data resolution before publication/resolution exists')
assert(foundation.includes("claim:'foundation_not_gdst_capable'"),'foundation must carry an explicit non-capability claim')
assert(foundation.includes('canClaimGdstCapable:false'),'foundation must forbid GDST Capable claim')
assert(foundation.includes('exportEnabled:false')&&foundation.includes('externalWriteEnabled:false')&&foundation.includes('writesOperationalState:false'),'GDST foundation must remain read-only and non-mutating')
assert(foundation.includes('externalCapabilityTestPassed:false'),'official Capability Test must remain false until independently passed')

assert(endpoint.includes("request.method!=='GET'"),'GDST capability endpoint must remain GET-only')
assert(endpoint.includes("requireOperator(request,['admin','operations'])"),'GDST capability endpoint must require operational administration')
assert(endpoint.includes('resolveRequestOrganization(request.headers,operator.organizationId)'),'GDST capability endpoint must bind organization to authenticated session')
assert(endpoint.includes('gdst2EventMappings')&&endpoint.includes('gdst2RequiredQueryParameters'),'GDST endpoint must expose mappings and tracked query parameters')

for(const registry of [serverRegistry,clientRegistry]){
  const adapter=registry.split("id:'traceability-epcis-gdst'")[1]?.split('},')[0]??''
  assert(adapter.includes("status:'foundation'"),'GDST adapter must remain foundation')
  assert(adapter.includes('GS1 identity registry foundation'),'GDST adapter must disclose GS1 identity readiness')
  assert(adapter.toLowerCase().includes('no se declara gdst capable'),'GDST adapter must state that capability is not claimed')
  assert(!adapter.includes("status:'evidenced'"),'GDST adapter must not be evidenced before official capability test')
}
assert(serverRegistry.split("id:'traceability-epcis-gdst'")[1]?.split('},')[0]?.includes('mutationEnabled:false'),'server GDST adapter must remain non-mutating')

if(failures.length){
  console.error('GDST 2.0 capability smoke FAILED')
  for(const failure of failures)console.error(`- ${failure}`)
  process.exit(1)
}
console.log('GDST 2.0 capability smoke PASS: Event Graph mappings, EPCIS serializer foundation and GS1 boundaries are explicit; Query/Capture/Resolver/master data remain missing and no GDST Capable claim is allowed')

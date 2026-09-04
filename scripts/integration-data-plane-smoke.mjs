import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [clientRegistry,serverRegistry,endpoint,page,app,access,os,vercel]=await Promise.all([
  readFile(new URL('../src/integrations.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/_integration.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/integrations.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/Integrations.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/App.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/access.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/os.ts',import.meta.url),'utf8'),
  readFile(new URL('../vercel.json',import.meta.url),'utf8'),
])

for(const id of ['pescamar-canonical-workbook','pescamar-univision','seafood-rest-inbound','seafood-webhook-inbound','seafood-event-export','mqtt-edge','industrial-opcua','industrial-modbus','vision-rtsp-onvif','traceability-epcis-gdst']){
 assert(clientRegistry.includes(`id:'${id}'`),`client integration registry must include ${id}`)
 assert(serverRegistry.includes(`id:'${id}'`),`server integration registry must include ${id}`)
}
assert(clientRegistry.includes("schemaVersion:'seafood.integration.v1'"),'client ingress contract must be versioned')
assert(serverRegistry.includes("SEAFOOD_INTEGRATION_SCHEMA='seafood.integration.v1'"),'server ingress contract must be versioned')
assert(clientRegistry.includes("status:'evidenced'")&&clientRegistry.includes("status:'foundation'")&&clientRegistry.includes("status:'planned'"),'registry must distinguish evidence, foundation and planned adapters')
assert(serverRegistry.match(/mutationEnabled:false/g)?.length===10,'all generic integration adapters must remain non-mutating in this foundation')
assert(endpoint.includes("request.method!=='GET'"),'integration registry endpoint must remain read-only')
assert(endpoint.includes("requireOperator(request,['admin','operations'])"),'integration registry must require operational administration')
assert(endpoint.includes('resolveRequestOrganization(request.headers,operator.organizationId)'),'integration registry must bind requested organization to authenticated session')
assert(endpoint.includes("genericInboundEnabled:false")&&endpoint.includes("webhookInboundEnabled:false")&&endpoint.includes("mqttEnabled:false")&&endpoint.includes("industrialGatewayEnabled:false"),'write plane must explicitly remain disabled')
assert(page.includes("fetch('/api/integrations'"),'integration UI must consume authenticated server registry')
assert(page.includes("'x-seafood-organization-id':organizationId"),'integration UI must carry organization context')
assert(page.includes("writeEnabled?'ON':'OFF'"),'integration UI must expose writer state instead of implying connectivity')
assert(app.includes('path="/integrations"'),'integration data plane page must be routed')
assert(access.includes('"/integrations":["admin","operations"]'),'integration data plane route must be restricted')
assert(os.includes("{path:'/integrations'")&&os.includes("Adapters, protocolos y contratos de interoperabilidad"),'OS map must retain integration data plane capability even when the user-facing label is simplified')
assert(vercel.includes('"source": "/integrations"'),'Vercel must deep-link the integration data plane route')

if(failures.length){
 console.error('Integration data plane smoke FAILED')
 for(const failure of failures)console.error(`- ${failure}`)
 process.exit(1)
}
console.log('Integration data plane smoke PASS: versioned adapter registry, authenticated organization boundary, disabled generic write plane, route/access and deep-link contracts verified')

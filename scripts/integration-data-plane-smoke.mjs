import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [clientRegistry,serverRegistry,endpoint,page,glossary,glossaryPanel,app,access,os,vercel]=await Promise.all([
  readFile(new URL('../src/integrations.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/_integration.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/integrations.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/Integrations.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/technicalTerms.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/components/TechnicalGlossary.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/App.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/access.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/os.ts',import.meta.url),'utf8'),
  readFile(new URL('../vercel.json',import.meta.url),'utf8'),
])

for(const id of ['pescamar-canonical-workbook','pescamar-univision','pescamar-cold-sensor-rest','seafood-rest-inbound','seafood-webhook-inbound','seafood-event-export','mqtt-edge','industrial-opcua','industrial-modbus','vision-rtsp-onvif','traceability-epcis-gdst']){
 assert(clientRegistry.includes(`id:'${id}'`),`client integration registry must include ${id}`)
 assert(serverRegistry.includes(`id:'${id}'`),`server integration registry must include ${id}`)
}
assert(clientRegistry.includes("schemaVersion:'seafood.integration.v1'"),'client ingress contract must be versioned')
assert(serverRegistry.includes("SEAFOOD_INTEGRATION_SCHEMA='seafood.integration.v1'"),'server ingress contract must be versioned')
assert(clientRegistry.includes("status:'evidenced'")&&clientRegistry.includes("status:'foundation'")&&clientRegistry.includes("status:'planned'"),'registry must distinguish evidence, foundation and planned adapters')
assert(!serverRegistry.includes('mutationEnabled:true'),'all integration registry adapters must remain non-mutating until a separately authorized write plane is evidenced')
assert(serverRegistry.match(/mutationEnabled:false/g)?.length===11,'every registered server adapter must declare mutation disabled explicitly')
assert(endpoint.includes("request.method!=='GET'"),'integration registry endpoint must remain read-only')
assert(endpoint.includes("requireOperator(request,['admin','operations'])"),'integration registry must require operational administration')
assert(endpoint.includes('resolveRequestOrganization(request.headers,operator.organizationId)'),'integration registry must bind requested organization to authenticated session')
assert(endpoint.includes("genericInboundEnabled:false")&&endpoint.includes("webhookInboundEnabled:false")&&endpoint.includes("mqttEnabled:false")&&endpoint.includes("industrialGatewayEnabled:false"),'generic write plane must explicitly remain disabled')

assert(page.includes("fetch('/api/integrations'"),'integration UI must consume authenticated server registry')
assert(page.includes("'x-seafood-organization-id':organizationId"),'integration UI must carry organization context')
assert(page.includes("writeEnabled?'ON':'OFF'"),'integration UI must expose writer state instead of implying connectivity')
assert(page.includes("title={en?'Connections with other systems':'Conexiones con otros sistemas'}"),'integration UI must lead with a human-readable purpose')
assert(page.includes("en?'External writes':'Escritura externa'"),'write plane must be described in operational language')
assert(page.includes("en?'What comes in, what goes out, and why':'Qué entra, qué sale y para qué sirve'"),'adapter direction must be explained in plain language')
assert(page.includes("en?'Technical field':'Campo técnico'"),'technical ingress field names must be secondary to human labels')
assert(page.includes("'traceability-epcis-gdst':{es:{label:'Trazabilidad internacional de seafood'"),'GDST/EPCIS adapter must have a plain-language primary label')
assert(page.includes('<TechnicalGlossary'),'integration UI must expose the reusable technical glossary')
for(const marker of [
 "code:'API',name:{es:'Application Programming Interface · interfaz entre sistemas'",
 "code:'MQTT',name:{es:'Protocolo liviano de mensajería para dispositivos'",
 "code:'OPC UA',name:{es:'Open Platform Communications Unified Architecture'",
 "code:'RTSP',name:{es:'Real-Time Streaming Protocol · transmisión de video'",
 "code:'ONVIF',name:{es:'Estándar abierto de interoperabilidad para cámaras IP'",
 "code:'CTE',name:{es:'Critical Tracking Event · evento crítico de trazabilidad'",
 "code:'KDE',name:{es:'Key Data Element · dato clave de trazabilidad'",
 "code:'JSON-LD',name:{es:'JSON for Linked Data · JSON para datos enlazados'",
])assert(glossary.includes(marker),`integration glossary missing ${marker}`)
assert(glossaryPanel.includes('¿Qué significan estas siglas?'),'technical glossary must explain acronyms explicitly')

assert(app.includes('path="/integrations"'),'integration data plane page must be routed')
assert(access.includes('"/integrations":["admin","operations"]'),'integration data plane route must be restricted')
assert(os.includes("{path:'/integrations'")&&os.includes("Adapters, protocolos y contratos de interoperabilidad"),'OS map must retain integration data plane capability even when the user-facing label is simplified')
assert(vercel.includes('"source": "/integrations"'),'Vercel must deep-link the integration data plane route')

if(failures.length){
 console.error('Integration data plane smoke FAILED')
 for(const failure of failures)console.error(`- ${failure}`)
 process.exit(1)
}
console.log('Integration data plane smoke PASS: connection state, safety boundaries and technical protocols remain explicit while every user-facing acronym is explained in plain language')

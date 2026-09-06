export const SEAFOOD_INTEGRATION_SCHEMA='seafood.integration.v1' as const

export type IntegrationAdapterStatus='evidenced'|'foundation'|'planned'
export type IntegrationAdapterDefinition={
  id:string
  label:string
  direction:'southbound'|'northbound'|'internal'
  protocol:string
  status:IntegrationAdapterStatus
  mapsTo:string
  idempotency:'implemented'|'required'|'not_applicable'
  evidence:string
  mutationEnabled:boolean
}

export const integrationAdapterRegistry:readonly IntegrationAdapterDefinition[]=[
  {id:'pescamar-canonical-workbook',label:'Pescamar · canonical workbook',direction:'southbound',protocol:'file',status:'evidenced',mapsTo:'canonical source evidence / historical lineage',idempotency:'implemented',evidence:'El core ya registra fuentes canónicas y protege replay por identidad/hash de fuente.',mutationEnabled:false},
  {id:'pescamar-univision',label:'Pescamar · Uni Vision',direction:'internal',protocol:'rest',status:'evidenced',mapsTo:'seafood.event.v1 · vision',idempotency:'required',evidence:'Capturas Uni Vision se proyectan al Seafood Event Graph con identidad de evidencia.',mutationEnabled:false},
  {id:'pescamar-cold-sensor-rest',label:'Pescamar · Cold sensor ingest',direction:'southbound',protocol:'rest',status:'foundation',mapsTo:'cold_observations · source=sensor',idempotency:'implemented',evidence:'Existe un endpoint machine-to-machine fail-closed con secreto dedicado, scope por ciclo/planta/estación e idempotencia. No se declara sensor, gateway ni secreto operacional configurado.',mutationEnabled:false},
  {id:'seafood-rest-inbound',label:'Generic REST inbound',direction:'southbound',protocol:'rest',status:'foundation',mapsTo:'seafood.integration.v1 → seafood.event.v1',idempotency:'required',evidence:'Contrato reusable definido; no existe todavía un endpoint de escritura genérico habilitado.',mutationEnabled:false},
  {id:'seafood-webhook-inbound',label:'Generic webhook inbound',direction:'southbound',protocol:'webhook',status:'foundation',mapsTo:'seafood.integration.v1 → seafood.event.v1',idempotency:'required',evidence:'Contrato reusable definido; firma, replay protection y writer permanecen pendientes.',mutationEnabled:false},
  {id:'seafood-event-export',label:'Canonical Event API',direction:'northbound',protocol:'event-api',status:'foundation',mapsTo:'seafood.event.v1',idempotency:'not_applicable',evidence:'El Event Graph ya expone lineage read-only; export reusable completo sigue pendiente.',mutationEnabled:false},
  {id:'mqtt-edge',label:'MQTT edge gateway',direction:'southbound',protocol:'mqtt',status:'planned',mapsTo:'telemetry / measurement events',idempotency:'required',evidence:'No se declara broker ni hardware operacional.',mutationEnabled:false},
  {id:'industrial-opcua',label:'OPC-UA gateway',direction:'southbound',protocol:'opc-ua',status:'planned',mapsTo:'machine / process events',idempotency:'required',evidence:'Se habilitará sólo con equipo y contrato real.',mutationEnabled:false},
  {id:'industrial-modbus',label:'Modbus gateway',direction:'southbound',protocol:'modbus',status:'planned',mapsTo:'machine / sensor events',idempotency:'required',evidence:'Se habilitará sólo con equipo y contrato real.',mutationEnabled:false},
  {id:'vision-rtsp-onvif',label:'RTSP / ONVIF vision gateway',direction:'southbound',protocol:'rtsp/onvif',status:'planned',mapsTo:'EdgeVision evidence',idempotency:'required',evidence:'No se declara cámara industrial conectada todavía.',mutationEnabled:false},
  {id:'traceability-epcis-gdst',label:'GS1 EPCIS / GDST export',direction:'northbound',protocol:'epcis/gdst',status:'planned',mapsTo:'external traceability events',idempotency:'not_applicable',evidence:'Pendiente de mapping y requisitos comerciales concretos antes de declarar conformidad.',mutationEnabled:false},
] as const

export const integrationGuardrails=[
  'authenticated organization context',
  'adapter allowlist',
  'idempotency before mutation',
  'schema validation',
  'dead-letter on rejected payload',
  'no silent unknown-to-zero coercion',
] as const
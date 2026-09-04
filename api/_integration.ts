export const SEAFOOD_INTEGRATION_SCHEMA='seafood.integration.v1' as const

export type IntegrationAdapterStatus='evidenced'|'foundation'|'planned'
export type IntegrationAdapterDefinition={
  id:string
  direction:'southbound'|'northbound'|'internal'
  protocol:string
  status:IntegrationAdapterStatus
  mapsTo:string
  mutationEnabled:boolean
}

export const integrationAdapterRegistry:readonly IntegrationAdapterDefinition[]=[
  {id:'pescamar-canonical-workbook',direction:'southbound',protocol:'file',status:'evidenced',mapsTo:'canonical source evidence / historical lineage',mutationEnabled:false},
  {id:'pescamar-univision',direction:'internal',protocol:'rest',status:'evidenced',mapsTo:'seafood.event.v1 · vision',mutationEnabled:false},
  {id:'seafood-rest-inbound',direction:'southbound',protocol:'rest',status:'foundation',mapsTo:'seafood.integration.v1 → seafood.event.v1',mutationEnabled:false},
  {id:'seafood-webhook-inbound',direction:'southbound',protocol:'webhook',status:'foundation',mapsTo:'seafood.integration.v1 → seafood.event.v1',mutationEnabled:false},
  {id:'seafood-event-export',direction:'northbound',protocol:'event-api',status:'foundation',mapsTo:'seafood.event.v1',mutationEnabled:false},
  {id:'mqtt-edge',direction:'southbound',protocol:'mqtt',status:'planned',mapsTo:'telemetry / measurement events',mutationEnabled:false},
  {id:'industrial-opcua',direction:'southbound',protocol:'opc-ua',status:'planned',mapsTo:'machine / process events',mutationEnabled:false},
  {id:'industrial-modbus',direction:'southbound',protocol:'modbus',status:'planned',mapsTo:'machine / sensor events',mutationEnabled:false},
  {id:'vision-rtsp-onvif',direction:'southbound',protocol:'rtsp/onvif',status:'planned',mapsTo:'EdgeVision evidence',mutationEnabled:false},
  {id:'traceability-epcis-gdst',direction:'northbound',protocol:'epcis/gdst',status:'planned',mapsTo:'external traceability events',mutationEnabled:false},
] as const

export const integrationGuardrails=[
  'authenticated organization context',
  'adapter allowlist',
  'idempotency before mutation',
  'schema validation',
  'dead-letter on rejected payload',
  'no silent unknown-to-zero coercion',
] as const

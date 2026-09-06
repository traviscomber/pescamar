export type IntegrationDirection='southbound'|'northbound'|'internal'
export type IntegrationProtocol='file'|'rest'|'webhook'|'mqtt'|'opc-ua'|'modbus'|'rtsp/onvif'|'event-api'|'epcis/gdst'
export type IntegrationStatus='evidenced'|'foundation'|'planned'

export type IntegrationAdapter={
  id:string
  label:string
  direction:IntegrationDirection
  protocol:IntegrationProtocol
  status:IntegrationStatus
  mapsTo:string
  idempotency:'implemented'|'required'|'not_applicable'
  evidence:string
}

export const integrationAdapters:readonly IntegrationAdapter[]=[
  {id:'pescamar-canonical-workbook',label:'Pescamar · canonical workbook',direction:'southbound',protocol:'file',status:'evidenced',mapsTo:'canonical source evidence / historical lineage',idempotency:'implemented',evidence:'El core ya registra fuentes canónicas y protege replay por identidad/hash de fuente.'},
  {id:'pescamar-univision',label:'Pescamar · Uni Vision',direction:'internal',protocol:'rest',status:'evidenced',mapsTo:'seafood.event.v1 · vision',idempotency:'required',evidence:'Capturas Uni Vision se proyectan al Seafood Event Graph con identidad de evidencia.'},
  {id:'pescamar-cold-sensor-rest',label:'Pescamar · Cold sensor ingest',direction:'southbound',protocol:'rest',status:'foundation',mapsTo:'cold_observations · source=sensor',idempotency:'implemented',evidence:'Existe un endpoint machine-to-machine fail-closed con secreto dedicado, scope por ciclo/planta/estación e idempotencia. No se declara sensor, gateway ni secreto operacional configurado.'},
  {id:'seafood-rest-inbound',label:'Generic REST inbound',direction:'southbound',protocol:'rest',status:'foundation',mapsTo:'seafood.integration.v1 → seafood.event.v1',idempotency:'required',evidence:'Contrato reusable definido; no existe todavía un endpoint de escritura genérico habilitado.'},
  {id:'seafood-webhook-inbound',label:'Generic webhook inbound',direction:'southbound',protocol:'webhook',status:'foundation',mapsTo:'seafood.integration.v1 → seafood.event.v1',idempotency:'required',evidence:'Contrato reusable definido; firma, replay protection y writer permanecen pendientes.'},
  {id:'seafood-event-export',label:'Canonical Event API',direction:'northbound',protocol:'event-api',status:'foundation',mapsTo:'seafood.event.v1',idempotency:'not_applicable',evidence:'El Event Graph ya expone lineage read-only; export reusable completo sigue pendiente.'},
  {id:'mqtt-edge',label:'MQTT edge gateway',direction:'southbound',protocol:'mqtt',status:'planned',mapsTo:'telemetry / measurement events',idempotency:'required',evidence:'No se declara broker ni hardware operacional.'},
  {id:'industrial-opcua',label:'OPC-UA gateway',direction:'southbound',protocol:'opc-ua',status:'planned',mapsTo:'machine / process events',idempotency:'required',evidence:'Se habilitará sólo con equipo y contrato real.'},
  {id:'industrial-modbus',label:'Modbus gateway',direction:'southbound',protocol:'modbus',status:'planned',mapsTo:'machine / sensor events',idempotency:'required',evidence:'Se habilitará sólo con equipo y contrato real.'},
  {id:'vision-rtsp-onvif',label:'RTSP / ONVIF vision gateway',direction:'southbound',protocol:'rtsp/onvif',status:'planned',mapsTo:'EdgeVision evidence',idempotency:'required',evidence:'No se declara cámara industrial conectada todavía.'},
  {id:'traceability-epcis-gdst',label:'GS1 EPCIS / GDST export',direction:'northbound',protocol:'epcis/gdst',status:'planned',mapsTo:'external traceability events',idempotency:'not_applicable',evidence:'Pendiente de mapping y requisitos comerciales concretos antes de declarar conformidad.'},
] as const

export const integrationContract={
  schemaVersion:'seafood.integration.v1',
  required:['organizationId','sourceSystem','adapterId','externalEventId','occurredAt','eventType','payload'] as const,
  provenance:['receivedAt','sourceReference','evidenceHash'] as const,
  safety:['authenticated organization context','adapter allowlist','idempotency before mutation','schema validation','dead-letter on rejected payload','no silent unknown-to-zero coercion'] as const,
} as const
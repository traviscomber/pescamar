import type {SeafoodEventType} from './_seafood-event.js'

export const GDST2_CAPABILITY_SCHEMA='seafood.gdst2-capability.v1' as const
export const GDST2_STANDARD_VERSION='2.0' as const
export const GDST2_EPCIS_CONTEXT='https://ref.gs1.org/standards/epcis/epcis-context.jsonld' as const

export type Gdst2MappingState='candidate'|'supporting_evidence'|'internal_only'
export type Gdst2CapabilityState='evidenced'|'foundation'|'missing'

export type Gdst2EventMapping={
  seafoodEventType:SeafoodEventType
  cte:'receiving'|'transformation'|'shipping'|null
  epcisType:'ObjectEvent'|'TransformationEvent'|null
  action:'OBSERVE'|null
  bizStep:'receiving'|'commissioning'|'shipping'|null
  state:Gdst2MappingState
  condition:string|null
  blockers:readonly string[]
}

const gdst2EventMappingByType:Record<SeafoodEventType,Gdst2EventMapping>={
  reception:{seafoodEventType:'reception',cte:'receiving',epcisType:'ObjectEvent',action:'OBSERVE',bizStep:'receiving',state:'candidate',condition:'Sólo aplica como receiving cuando el movimiento es land-facility → land-facility. Landing o transshipment requieren un CTE distinto y evidencia de origen/transporte.',blockers:['product EPC/lot identity','source and destination location identifiers','location classifications','readPoint','product owner / information provider master data']},
  evidence:{seafoodEventType:'evidence',cte:null,epcisType:null,action:null,bizStep:null,state:'supporting_evidence',condition:'Documento/provenance puede respaldar KDEs pero no constituye por sí solo un CTE.',blockers:[]},
  quality:{seafoodEventType:'quality',cte:null,epcisType:null,action:null,bizStep:null,state:'supporting_evidence',condition:'Control de calidad es evidencia operacional; sólo se exporta cuando un perfil GDST específico lo vincula a un CTE/KDE.',blockers:[]},
  production:{seafoodEventType:'production',cte:'transformation',epcisType:'TransformationEvent',action:null,bizStep:'commissioning',state:'candidate',condition:'Requiere identidad explícita de productos de entrada y salida; el yield por sí solo no crea una transformación GDST exportable.',blockers:['input product identity','output product identity','output product classification=Seafood+Processed','readPoint','product owner / information provider master data']},
  vision:{seafoodEventType:'vision',cte:null,epcisType:null,action:null,bizStep:null,state:'supporting_evidence',condition:'Uni Vision es evidencia complementaria y no reemplaza KDEs ni master data GDST.',blockers:[]},
  note:{seafoodEventType:'note',cte:null,epcisType:null,action:null,bizStep:null,state:'supporting_evidence',condition:'Notas permanecen como evidencia interna salvo mapping explícito.',blockers:[]},
  inventory:{seafoodEventType:'inventory',cte:null,epcisType:null,action:null,bizStep:null,state:'internal_only',condition:'Un movimiento interno de inventario no se convierte automáticamente en CTE GDST.',blockers:[]},
  commercial_commitment:{seafoodEventType:'commercial_commitment',cte:null,epcisType:null,action:null,bizStep:null,state:'internal_only',condition:'Una reserva/orden comercial no es por sí sola un evento EPCIS.',blockers:[]},
  dispatch:{seafoodEventType:'dispatch',cte:'shipping',epcisType:'ObjectEvent',action:'OBSERVE',bizStep:'shipping',state:'candidate',condition:'Requiere identificar producto/lote y origen/destino con master data resolvible.',blockers:['product EPC/lot identity','source and destination location identifiers','source and destination party identifiers','location classifications','readPoint','product owner / information provider master data']},
  sale:{seafoodEventType:'sale',cte:null,epcisType:null,action:null,bizStep:null,state:'internal_only',condition:'La venta puede aportar contexto de propiedad/comercial, pero no se exporta automáticamente como CTE.',blockers:[]},
}

export const gdst2EventMappings:readonly Gdst2EventMapping[]=Object.values(gdst2EventMappingByType)
export const gdst2RequiredQueryParameters=['LT_eventTime','LT_recordTime','EQ_bizStep','EQ_transformationID','EQ_bizLocation'] as const

export const gdst2CapabilityProfile={
  schemaVersion:GDST2_CAPABILITY_SCHEMA,
  standard:`GDST ${GDST2_STANDARD_VERSION}`,
  epcisVersion:'2.0',
  jsonLdContext:GDST2_EPCIS_CONTEXT,
  claim:'foundation_not_gdst_capable' as const,
  canClaimGdstCapable:false,
  capabilities:[
    {id:'seafood-event-graph',state:'evidenced' as const,evidence:'Seafood Event Graph v1 expone lineage lot-scoped y organization-scoped en modo read-only.'},
    {id:'event-profile-mapping',state:'foundation' as const,evidence:'Receiving, transformation y shipping tienen mapping candidato explícito; todos los SeafoodEventType requieren clasificación GDST explícita en compile-time.'},
    {id:'epcis-jsonld-serialization',state:'missing' as const,evidence:'No existe todavía serializer EPCIS 2.0 JSON-LD habilitado.'},
    {id:'epcis-query-interface',state:'missing' as const,evidence:'No existe endpoint EPCIS Query Interface compatible con el Capability Test.'},
    {id:'epcis-capture-write',state:'missing' as const,evidence:'No existe Capture Interface GDST; el write plane externo permanece OFF.'},
    {id:'digital-link-resolver-1.2',state:'missing' as const,evidence:'No existe resolver RFC 9264 Linkset para gs1:epcis / gs1:masterData.'},
    {id:'master-data-resolution',state:'missing' as const,evidence:'Productos, locations y parties aún no se publican como GS1 Web Vocabulary JSON-LD resolvible.'},
    {id:'product-location-classification',state:'missing' as const,evidence:'El modelo interno no declara todavía productClassification/locationClassification GDST 2.0.'},
    {id:'decommission-event',state:'missing' as const,evidence:'Seafood Event Graph v1 no proyecta todavía el nuevo CTE decommission.'},
    {id:'required-query-parameters',state:'missing' as const,evidence:`Pendiente soporte ${gdst2RequiredQueryParameters.join(', ')} y demás parámetros exigidos por Capability Test.`},
  ],
  boundary:{
    readOnlyAssessment:true,
    exportEnabled:false,
    externalWriteEnabled:false,
    writesOperationalState:false,
    externalCapabilityTestPassed:false,
    humanValidationRequired:true,
    rule:'Foundation técnica solamente. No declarar GDST Capable/compliant hasta implementar read+write y aprobar el Capability Test oficial.',
  },
} as const

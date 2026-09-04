export type EdgeVisionCapabilityId=
  |'count'
  |'calibre'
  |'size'
  |'color'
  |'defects'
  |'classification'
  |'biomass'
  |'process_control'
  |'anomaly'

export type EdgeVisionCapabilityStatus='available_in_pescamar'|'foundation'|'planned'

export type EdgeVisionCapability={
  id:EdgeVisionCapabilityId
  label:string
  outcome:string
  status:EdgeVisionCapabilityStatus
  currentEvidence:string
}

export const edgeVisionCapabilities:readonly EdgeVisionCapability[]=[
  {id:'count',label:'Conteo',outcome:'Unidades observadas por lote, estación o ventana de proceso.',status:'planned',currentEvidence:'Sin modelo operacional conectado todavía.'},
  {id:'calibre',label:'Calibre',outcome:'Distribución de calibre atribuible al lote.',status:'planned',currentEvidence:'Sin modelo operacional conectado todavía.'},
  {id:'size',label:'Tamaño',outcome:'Medidas dimensionales y distribución.',status:'planned',currentEvidence:'Sin modelo operacional conectado todavía.'},
  {id:'color',label:'Color',outcome:'Medición objetiva de color con evidencia visual.',status:'available_in_pescamar',currentEvidence:'Uni Vision mide CIELAB sobre captura atribuida y conserva hash de evidencia.'},
  {id:'defects',label:'Defectos',outcome:'Detección y cuantificación de defectos visibles.',status:'planned',currentEvidence:'Requiere dataset real y taxonomía aprobada.'},
  {id:'classification',label:'Clasificación',outcome:'Grade o clase sugerida con revisión humana.',status:'available_in_pescamar',currentEvidence:'Uni Vision puede sugerir Grade A–E por referencia de planta; el operador confirma.'},
  {id:'biomass',label:'Biomasa',outcome:'Estimación de biomasa cuando el escenario físico lo permita.',status:'planned',currentEvidence:'No se declara precisión sin caso y dataset reales.'},
  {id:'process_control',label:'Control visual',outcome:'Señales visuales ligadas a una etapa de proceso.',status:'foundation',currentEvidence:'El Seafood Event Graph ya puede proyectar evidencia Vision ligada al lote.'},
  {id:'anomaly',label:'Anomalías',outcome:'Desviaciones visuales contra una condición operacional definida.',status:'planned',currentEvidence:'Requiere baseline real antes de automatizar alertas.'},
] as const

export type EdgeVisionAdapter={
  id:string
  label:string
  implementation:string
  evidenceEntity:string
  capabilities:readonly EdgeVisionCapabilityId[]
  executionMode:string
  decisionAuthority:'human_required'|'advisory'|'automatic'
  modelVersioning:'implemented'|'pending'
  notes:string
}

export const edgeVisionAdapters:readonly EdgeVisionAdapter[]=[
  {
    id:'pescamar-univision-color',
    label:'Uni Vision · color',
    implementation:'Pescamar',
    evidenceEntity:'sea_urchin_color_capture',
    capabilities:['color','classification'],
    executionMode:'Medición browser-assisted sobre cámara o imagen cargada.',
    decisionAuthority:'human_required',
    modelVersioning:'pending',
    notes:'Es el primer adapter real del OS. La clasificación se basa en referencias de planta y no se presenta como modelo autónomo.',
  },
] as const

export const edgeVisionEvidenceContract=[
  'organization / implementation',
  'site / station',
  'lot / process context',
  'capturedAt',
  'media hash / evidence id',
  'capture source / device',
  'capability',
  'measurement',
  'model or measurement-engine version',
  'confidence / review status',
  'human override / decision',
] as const

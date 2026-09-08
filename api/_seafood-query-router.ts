export const SEAFOOD_QUERY_ROUTER_VERSION='seafood.router.v1' as const

export type SeafoodQueryRouteName='deterministic'|'fast_evidence'|'investigative'
export type SeafoodCapability=
 |'lot_control'
 |'operational_intelligence'
 |'receptions'
 |'production'
 |'quality'
 |'inventory'
 |'orders'
 |'canonical_sources'
 |'canonical_inventory'
 |'historical_lineage'
 |'canonical_intelligence'
 |'finance'
 |'urchin_graph'
 |'photo_observation'

export type SeafoodQueryRoute={
 version:typeof SEAFOOD_QUERY_ROUTER_VERSION
 route:SeafoodQueryRouteName
 intent:string
 requiredCapabilities:SeafoodCapability[]
 optionalCapabilities:SeafoodCapability[]
 writesAllowed:false
 humanGate:'none'|'material_action_review'
}

export type SeafoodEvidenceSource={id:string;rows:number}
export type SeafoodEvidenceGate={
 status:'sufficient'|'limited'|'insufficient'
 required:string[]
 available:string[]
 missing:string[]
 empty:string[]
 coveragePct:number
}

export const seafoodCapabilityCatalog={
 lot_control:{sourceId:'lot_control',layer:'operational_core'},
 operational_intelligence:{sourceId:'operational_intelligence',layer:'operational_intelligence'},
 receptions:{sourceId:'receptions',layer:'operational_core'},
 production:{sourceId:'production',layer:'operational_core'},
 quality:{sourceId:'quality',layer:'operational_core'},
 inventory:{sourceId:'inventory',layer:'operational_core'},
 orders:{sourceId:'orders',layer:'operational_core'},
 canonical_sources:{sourceId:'canonical_sources',layer:'canonical_evidence'},
 canonical_inventory:{sourceId:'canonical_inventory',layer:'canonical_evidence'},
 historical_lineage:{sourceId:'historical_lineage',layer:'seafood_event_graph'},
 canonical_intelligence:{sourceId:'canonical_intelligence',layer:'operational_intelligence'},
 finance:{sourceId:'finance',layer:'operational_core'},
 urchin_graph:{sourceId:'urchin_graph',layer:'specialist'},
 photo_observation:{sourceId:'photo_observation',layer:'edgevision'},
} as const satisfies Record<SeafoodCapability,{sourceId:string;layer:string}>

function normalize(value:string){return value.toLocaleLowerCase('es-CL').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim()}
function unique<T>(items:T[]){return [...new Set(items)]}
function hasAny(value:string,patterns:RegExp[]){return patterns.some(pattern=>pattern.test(value))}

const investigationPatterns=[
 /\bpor que\b/,/\bporque\b/,/\bexplica/,/\bcompar/,/\bhistor/,/\btendenc/,/\bcausa/,/\brelacion/,/\bcorrel/,/\binvestig/,/\banomali/,/\bdesviacion/,/\bevolucion/,/\brentabil/,/\btrazab/,/\blinaje/,/\bmejor\b.*\bproveedor/,/\bpeor\b.*\bproveedor/,/\bmejor\b.*\brendimiento/,/\bpeor\b.*\brendimiento/
]
const historicalComparisonPatterns=[
 /\bcompar/,/\bhistor/,/\btendenc/,/\bproveedor/,/\bevolucion/,/\brentabil/,/\btrazab/,/\blinaje/,/\bmejor\b/,/\bpeor\b/
]
const deterministicLotPatterns=[
 /\bque bloquea/,/\bbloqueo/,/\bestado\b/,/\bsiguiente accion/,/\bque hago/,/\bque sigue/,/\blisto\b/,/\bapto\b/,/\bjapon\b/,/\bliberad/,/\bgrade\b/,/\bcolor\b/,/\bxray\b/,/\brayos? x/,/\bhold\b/,/\bpuedo despachar/
]

function fastCapabilities(question:string,hasLot:boolean):SeafoodCapability[]{
 const capabilities:SeafoodCapability[]=[]
 if(/\bstock\b|\binventario\b|\bsaldo\b|\bdisponib/.test(question))capabilities.push('inventory')
 if(/\brecepcion|\brecib|\bingreso/.test(question))capabilities.push('receptions')
 if(/\bproduccion|\bproceso\b|\byield\b|\brendimiento\b|\bkilos? procesad/.test(question))capabilities.push('production')
 if(/\bcalidad\b|\bhold\b|\balerta\b|\brechazo/.test(question))capabilities.push('quality')
 if(/\borden|\bpedido|\bcliente|\bcompromiso|\bventa\b|\bdespacho/.test(question))capabilities.push('orders')
 if(/\bliquidacion|\bfinanz|\bmonto\b|\bcosto\b|\bcuenta\b|\bpago\b/.test(question))capabilities.push('finance')
 if(/\bfuente|\barchivo|\bcobertura\b|\bplanilla/.test(question))capabilities.push('canonical_sources')
 if(/\bpacking\b|\bcaja\b|\binventario histor/.test(question))capabilities.push('canonical_inventory')
 if(!hasLot&&/\batencion\b|\bprioridad\b|\bpendiente\b|\bbloque/.test(question))capabilities.push('quality','orders','inventory')
 return unique(capabilities)
}

export function routeSeafoodQuery(input:{question:string;hasLot:boolean;hasPhotos:boolean;seniorUrchin:boolean}):SeafoodQueryRoute{
 const question=normalize(input.question)
 const investigative=hasAny(question,investigationPatterns)
 const historicalComparison=hasAny(question,historicalComparisonPatterns)
 const urchinSpecific=input.seniorUrchin||/\berizo|\burchin|\bjapon\b|\bgrade\b|\bxray\b|\brayos? x|\bcolor\b/.test(question)
 if(input.hasLot&&!input.hasPhotos&&!investigative&&hasAny(question,deterministicLotPatterns)){
  const required:SeafoodCapability[]=['lot_control','operational_intelligence']
  if(input.seniorUrchin||/\bxray\b|\brayos? x/.test(question))required.push('urchin_graph')
  return {version:SEAFOOD_QUERY_ROUTER_VERSION,route:'deterministic',intent:urchinSpecific?'lot_specialist_status':'lot_operational_status',requiredCapabilities:unique(required),optionalCapabilities:urchinSpecific&&!required.includes('urchin_graph')?['urchin_graph']:[],writesAllowed:false,humanGate:/\bjapon\b|\bliberad|\bdespach|\brechaz|\bgrade\b/.test(question)?'material_action_review':'none'}
 }
 const fast=fastCapabilities(question,input.hasLot)
 if(input.hasPhotos&&!investigative){
  const required:SeafoodCapability[]=['photo_observation']
  if(input.hasLot)required.push('lot_control','operational_intelligence')
  if(urchinSpecific)required.push('urchin_graph')
  return {version:SEAFOOD_QUERY_ROUTER_VERSION,route:'fast_evidence',intent:'visual_evidence_review',requiredCapabilities:unique(required),optionalCapabilities:fast,writesAllowed:false,humanGate:'material_action_review'}
 }
 if(!investigative&&fast.length){
  const required=[...fast]
  if(input.hasLot)required.push('lot_control')
  return {version:SEAFOOD_QUERY_ROUTER_VERSION,route:'fast_evidence',intent:fast.length===1?`direct_${fast[0]}`:'direct_cross_domain',requiredCapabilities:unique(required),optionalCapabilities:[],writesAllowed:false,humanGate:/\bdespach|\bliberad|\brechaz|\baprobar/.test(question)?'material_action_review':'none'}
 }
 const required:SeafoodCapability[]=[...fast]
 const optional:SeafoodCapability[]=[]
 if(input.hasLot)required.push('lot_control','operational_intelligence')
 if(historicalComparison)required.push('historical_lineage','canonical_intelligence')
 else optional.push('historical_lineage','canonical_intelligence')
 if(!input.hasLot&&!required.length)required.push('canonical_intelligence')
 if(urchinSpecific)required.push('urchin_graph')
 if(input.hasLot)optional.push('receptions','production','quality','inventory','orders')
 else optional.push('receptions','production','quality','inventory')
 return {version:SEAFOOD_QUERY_ROUTER_VERSION,route:'investigative',intent:historicalComparison?'investigate_historical_comparison':fast.length?`investigate_${fast.join('_')}`:'investigate_cross_domain',requiredCapabilities:unique(required),optionalCapabilities:unique(optional.filter(capability=>!required.includes(capability))),writesAllowed:false,humanGate:'material_action_review'}
}

export function evaluateEvidenceSufficiency(route:SeafoodQueryRoute,sources:SeafoodEvidenceSource[]):SeafoodEvidenceGate{
 const required=unique(route.requiredCapabilities.map(capability=>seafoodCapabilityCatalog[capability].sourceId))
 const byId=new Map(sources.map(source=>[source.id,source]))
 const available=required.filter(id=>byId.has(id))
 const missing=required.filter(id=>!byId.has(id))
 const empty=available.filter(id=>(byId.get(id)?.rows??0)<=0)
 const coveragePct=required.length?Math.round(available.length/required.length*100):100
 return {status:missing.length?'insufficient':empty.length?'limited':'sufficient',required,available,missing,empty,coveragePct}
}

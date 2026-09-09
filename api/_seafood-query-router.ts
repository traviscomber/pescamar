export const SEAFOOD_QUERY_ROUTER_VERSION='seafood.router.v2' as const

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
 focusHistoricalLotCode?:string|null
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
function explicitLotCode(value:string){
 const tail=value.match(/\b(?:lote|lot)\s+(.{1,80})/i)?.[1]??''
 return tail.split(/\s+/).slice(0,4).find(token=>/^[a-z0-9][a-z0-9-]{5,31}$/i.test(token)&&/\d/.test(token))??null
}

// Pescamar is bilingual. Router semantics must remain equivalent in Spanish and English.
const investigationPatterns=[
 /\bpor que\b/,/\bporque\b/,/\bexplica/,/\bwhy\b/,/\bexplain/,
 /\bcompar/,/\bcompare/,/\bhistor/,/\btendenc/,/\btrend/,
 /\bcausa/,/\bcause/,/\brelacion/,/\brelationship/,/\bcorrel/,
 /\binvestig/,/\banomali/,/\bdesviacion/,/\bdeviat/,/\bevolucion/,/\bevolution/,
 /\brentabil/,/\bprofitabil/,/\btrazab/,/\btraceab/,/\blinaje/,/\blineage/,
 /\bmejor\b.*\bproveedor/,/\bpeor\b.*\bproveedor/,/\bbest\b.*\bsupplier/,/\bworst\b.*\bsupplier/,
 /\bmejor\b.*\brendimiento/,/\bpeor\b.*\brendimiento/,/\bbest\b.*\byield/,/\bworst\b.*\byield/
]
const historicalComparisonPatterns=[
 /\bcompar/,/\bcompare/,/\bhistor/,/\btendenc/,/\btrend/,/\bproveedor/,/\bsupplier/,
 /\bevolucion/,/\bevolution/,/\brentabil/,/\bprofitabil/,/\btrazab/,/\btraceab/,/\blinaje/,/\blineage/,
 /\bmejor\b/,/\bpeor\b/,/\bbest\b/,/\bworst\b/,/\bprevious\b/,/\bprior\b/,/\bover time\b/,
 /\blast (week|month|year|season)\b/,/\bsemana pasada\b/,/\bmes pasado\b/,/\bano pasado\b/
]
const deterministicLotPatterns=[
 /\bque bloquea/,/\bwhat blocks\b/,/\bbloqueo/,/\bblocked\b/,/\bestado\b/,/\bstatus\b/,
 /\bsiguiente accion/,/\bnext action\b/,/\bque hago/,/\bwhat should i do\b/,/\bque sigue/,/\bwhat next\b/,
 /\blisto\b/,/\bready\b/,/\bapto\b/,/\bfit for\b/,/\bjapon\b/,/\bjapan\b/,
 /\bliberad/,/\brelease status\b/,/\breleased\b/,/\bgrade\b/,/\bcolor\b/,/\bxray\b/,/\bx-ray\b/,/\brayos? x/,
 /\bhold\b/,/\bpuedo despachar/,/\bcan i dispatch\b/,/\bcan i ship\b/
]
const materialActionPatterns=[
 /\bjapon\b/,/\bjapan\b/,/\bliberad/,/\breleas/,/\bdespach/,/\bdispatch/,/\bship(?:ment|ping)?\b/,
 /\brechaz/,/\breject/,/\bgrade\b/,/\baprobar/,/\bapprove/
]

function fastCapabilities(question:string,hasLot:boolean):SeafoodCapability[]{
 const capabilities:SeafoodCapability[]=[]
 if(/\bstock\b|\binventar|\binventory\b|\bsaldo\b|\bbalance\b|\bdisponib|\bavailab/.test(question))capabilities.push('inventory')
 if(/\brecepcion|\brecib|\breceiv|\bingreso|\bintake\b|\blanding\b|\bdescarga/.test(question))capabilities.push('receptions')
 if(/\bproduccion|\bproduction\b|\bproceso\b|\bprocess\b|\byield\b|\brendimiento\b|\bkilos? procesad|\bprocessed kg\b|\bthroughput\b|\bmerma\b|\bshrinkage\b|\bwaste\b/.test(question))capabilities.push('production')
 if(/\bcalidad\b|\bquality\b|\bhold\b|\balerta\b|\balert\b|\brechazo|\breject|\bdefect|\bconformidad\b|\bcompliance\b/.test(question))capabilities.push('quality')
 if(/\borden|\border\b|\bpedido|\bcustomer\b|\bcliente|\bcommitment\b|\bcompromiso|\bsale\b|\bventa\b|\bdispatch\b|\bdespacho|\bshipment\b/.test(question))capabilities.push('orders')
 if(/\bliquidacion|\bsettlement\b|\bfinanz|\bfinance\b|\bmonto\b|\bamount\b|\bcosto\b|\bcost\b|\bcuenta\b|\baccount\b|\bpago\b|\bpayment\b|\bmargen\b|\bmargin\b/.test(question))capabilities.push('finance')
 if(/\bfuente|\bsource\b|\barchivo|\bfile\b|\bcobertura\b|\bcoverage\b|\bplanilla|\bspreadsheet\b|\bdocumento|\bdocument\b|\bprovenance\b/.test(question))capabilities.push('canonical_sources')
 if(/\bpacking\b|\bcaja\b|\bbox\b|\bcarton\b|\bpackage\b|\binventario histor|\bhistorical inventory\b/.test(question))capabilities.push('canonical_inventory')
 if(!hasLot&&!capabilities.length&&/\batencion\b|\battention\b|\bprioridad\b|\bpriority\b|\bpendient|\bpending\b|\bbloque|\bblocker/.test(question))capabilities.push('quality','orders','inventory')
 return unique(capabilities)
}

export function routeSeafoodQuery(input:{question:string;hasLot:boolean;hasPhotos:boolean;seniorUrchin:boolean}):SeafoodQueryRoute{
 const question=normalize(input.question)
 const historicalLotCode=input.hasLot?null:explicitLotCode(question)
 const investigative=hasAny(question,investigationPatterns)||Boolean(historicalLotCode)
 const historicalComparison=hasAny(question,historicalComparisonPatterns)||Boolean(historicalLotCode)
 const urchinSpecific=input.seniorUrchin||/\berizo|\burchin|\buni\b|\broe\b|\bjapon\b|\bjapan\b|\bgrade\b|\bxray\b|\bx-ray\b|\brayos? x|\bcolor\b/.test(question)
 if(input.hasLot&&!input.hasPhotos&&!investigative&&hasAny(question,deterministicLotPatterns)){
  const required:SeafoodCapability[]=['lot_control','operational_intelligence']
  if(input.seniorUrchin||/\bxray\b|\bx-ray\b|\brayos? x/.test(question))required.push('urchin_graph')
  return {version:SEAFOOD_QUERY_ROUTER_VERSION,route:'deterministic',intent:urchinSpecific?'lot_specialist_status':'lot_operational_status',requiredCapabilities:unique(required),optionalCapabilities:urchinSpecific&&!required.includes('urchin_graph')?['urchin_graph']:[],writesAllowed:false,humanGate:hasAny(question,materialActionPatterns)?'material_action_review':'none'}
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
  return {version:SEAFOOD_QUERY_ROUTER_VERSION,route:'fast_evidence',intent:fast.length===1?`direct_${fast[0]}`:'direct_cross_domain',requiredCapabilities:unique(required),optionalCapabilities:[],writesAllowed:false,humanGate:hasAny(question,materialActionPatterns)?'material_action_review':'none'}
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
 return {version:SEAFOOD_QUERY_ROUTER_VERSION,route:'investigative',intent:historicalLotCode?'investigate_historical_lot':historicalComparison?'investigate_historical_comparison':fast.length?`investigate_${fast.join('_')}`:'investigate_cross_domain',requiredCapabilities:unique(required),optionalCapabilities:unique(optional.filter(capability=>!required.includes(capability))),writesAllowed:false,humanGate:'material_action_review',focusHistoricalLotCode:historicalLotCode}
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

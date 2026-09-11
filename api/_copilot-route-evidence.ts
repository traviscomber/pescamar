import type {SessionOperator} from './_auth.js'
import {buildCanonicalBusinessIntelligence} from './_canonical-business-intelligence.js'
import {buildCanonicalSourceHealth} from './_canonical-source-health.js'
import {buildCopilotContext,type CopilotContext,type CopilotSource} from './_copilot-context.js'
import {buildCopilotOperationalIntelligence} from './_copilot-operational-intelligence.js'
import {buildHistoricalLineageEvidence} from './_copilot-historical-lineage.js'
import {buildSeaUrchinCopilotEvidence} from './_copilot-sea-urchin.js'
import {getSql} from './_db.js'
import {buildLotControlCard} from './_lot-control-card.js'
import {allowedPlantIds} from './_plants.js'
import type {SeafoodCapability,SeafoodQueryRoute} from './_seafood-query-router.js'

const baseCapabilities=new Set<SeafoodCapability>(['receptions','production','quality','inventory','orders','canonical_sources','canonical_inventory','finance'])

type BaseCapability='receptions'|'production'|'quality'|'inventory'|'orders'|'canonical_sources'|'canonical_inventory'|'finance'
type SupplierSupportMatchStatus='exact_both'|'guide_only'|'lot_only'|'conflict'|'ambiguous'|'unmatched'

type SupplierSupportHeader={
 sheet_name:unknown
 source_block:unknown
 family_key:unknown
 supplier_name:unknown
 guide_number:unknown
 lot_reference:unknown
 observation_count:unknown
}

type SupplierMainRow={source_row:unknown;supplier:unknown;process_site:unknown;guide_number:unknown;lot_code:unknown}

const text=(value:unknown)=>String(value??'').trim()
const normalized=(value:unknown)=>text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')
const numberValue=(value:unknown)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:0}
const percent=(part:number,total:number)=>total?Number((part/total*100).toFixed(1)):null

function supplierFamily(site:string,lot:string){
 const normalizedLot=lot.toLowerCase(),normalizedSite=site.toLowerCase()
 if(normalizedLot.startsWith('ig')||normalizedSite==='curanue')return'IG'
 if(normalizedLot.startsWith('mdq')||normalizedSite==='santa rosa')return'MDQ'
 if(normalizedLot.startsWith('mi')||normalizedSite==='candelaria')return'MI'
 return'RF'
}

async function buildSupplierSupportEvidence(){
 const sql=getSql()
 let headers:SupplierSupportHeader[]=[]
 try{
  const headerRaw=await sql`select sheet_name,source_block,family_key,supplier_name,guide_number,lot_reference,observation_count
   from canonical_production_support_blocks
   where parser_version='production-support-v2'
    and source_file_hash in(select file_hash from canonical_source_files where canonical and (source_kind like '%production%' or file_name ilike '%produccion 2026%'))
   order by sheet_name,source_block`
  headers=(Array.isArray(headerRaw)?headerRaw:[]) as SupplierSupportHeader[]
 }catch(error){
  const message=error instanceof Error?error.message:''
  if(message.includes('canonical_production_support_blocks')||message.includes('42P01'))return {status:'migration_required' as const,validationCase:'PV-006' as const,maturity:'implemented' as const,historicalOnly:true,summary:{blocks:0,observations:0,autoLinkedBlocks:0,exceptions:0,coveragePct:null},exceptions:[]}
  throw error
 }
 if(!headers.length)return {status:'not_imported' as const,validationCase:'PV-006' as const,maturity:'implemented' as const,historicalOnly:true,summary:{blocks:0,observations:0,autoLinkedBlocks:0,exceptions:0,coveragePct:null},exceptions:[]}

 const mainRaw=await sql`select h.source_row,
   coalesce(nullif(btrim(h.supplier_name),''),nullif(btrim(h.supplier_original),''),'Sin proveedor') supplier,
   coalesce(nullif(btrim(h.process_site_original),''),nullif(btrim(h.plant_id),''),'Sin planta') process_site,
   h.guide_number,h.lot_code
  from historical_production_records h
  where h.record_status='operational'
   and h.source_file_hash in(select file_hash from canonical_source_files where canonical and (source_kind like '%production%' or file_name ilike '%produccion 2026%'))
   and (lower(coalesce(h.process_site_original,h.plant_id,'')) in ('curanue','santa rosa','candelaria')
    or lower(h.lot_code) like 'ig%' or lower(h.lot_code) like 'mdq%' or lower(h.lot_code) like 'mi%')`
 const main=(Array.isArray(mainRaw)?mainRaw:[]) as SupplierMainRow[]
 const candidates=main.map(row=>({sourceRow:numberValue(row.source_row),supplier:text(row.supplier),familyKey:supplierFamily(text(row.process_site),text(row.lot_code)),guide:text(row.guide_number),lot:text(row.lot_code)}))

 const blocks=headers.map(header=>{
  const supplier=text(header.supplier_name)||'Proveedor no identificado',familyKey=text(header.family_key),guide=text(header.guide_number),lotReference=text(header.lot_reference)
  const supplierCandidates=candidates.filter(row=>row.familyKey===familyKey&&normalized(row.supplier)===normalized(supplier))
  const guideCandidates=guide?supplierCandidates.filter(row=>row.guide===guide):[]
  const lotToken=normalized(lotReference),lotCandidates=lotToken?supplierCandidates.filter(row=>normalized(row.lot).startsWith(lotToken)):[]
  const guideIds=new Set(guideCandidates.map(row=>row.sourceRow)),lotIds=new Set(lotCandidates.map(row=>row.sourceRow)),intersection=[...guideIds].filter(id=>lotIds.has(id))
  let matchStatus:SupplierSupportMatchStatus='unmatched'
  if(intersection.length===1)matchStatus='exact_both'
  else if(guideIds.size&&lotIds.size)matchStatus=intersection.length>1?'ambiguous':'conflict'
  else if(guideIds.size===1)matchStatus='guide_only'
  else if(lotIds.size===1)matchStatus='lot_only'
  else if(guideIds.size||lotIds.size)matchStatus='ambiguous'
  return {supplier,sheetName:text(header.sheet_name),sourceBlock:numberValue(header.source_block),guide:guide||null,lotReference:lotReference||null,observations:numberValue(header.observation_count),matchStatus}
 })
 const autoLinkedStatuses=new Set<SupplierSupportMatchStatus>(['exact_both','guide_only','lot_only'])
 const autoLinkedBlocks=blocks.filter(block=>autoLinkedStatuses.has(block.matchStatus)).length
 const exceptions=blocks.filter(block=>!autoLinkedStatuses.has(block.matchStatus)).map(block=>({supplier:block.supplier,sheetName:block.sheetName,sourceBlock:block.sourceBlock,guide:block.guide,lotReference:block.lotReference,status:block.matchStatus,confidence:'needs-human-validation' as const}))
 const observations=blocks.reduce((sum,block)=>sum+block.observations,0)
 return {
  status:'ready' as const,
  validationCase:'PV-006' as const,
  maturity:'pilot-evidence' as const,
  historicalOnly:true,
  writesLive:false,
  confidence:exceptions.length?'needs-human-validation' as const:'observed' as const,
  rule:'Las hojas auxiliares Isla Guafo, Diaz termiando y Cesar son evidencia física secundaria. Mejoran trazabilidad cuando guía y/o lote identifican una única fila principal; nunca duplican producción ni promueven datos históricos a operación live.',
  summary:{blocks:blocks.length,observations,autoLinkedBlocks,exceptions:exceptions.length,coveragePct:percent(autoLinkedBlocks,blocks.length)},
  exceptions
 }
}

function scopeFor(operator:SessionOperator,plantId:string|null):CopilotContext['scope']{
 const allowed=allowedPlantIds(operator)
 return {
  plantId,
  plantIds:plantId?[plantId]:allowed,
  role:operator.role,
  financial:['admin','finance','operations'].includes(operator.role),
  corporateHistory:operator.role==='admin'||allowed.length>=6,
 }
}

function selectBaseCapabilities(capabilities:SeafoodCapability[]):BaseCapability[]{
 return capabilities.filter((capability):capability is BaseCapability=>baseCapabilities.has(capability))
}

function mergeSources(...groups:Array<Array<CopilotSource|undefined|null>>){
 const byId=new Map<string,CopilotSource>()
 for(const source of groups.flat())if(source)byId.set(source.id,source)
 return [...byId.values()]
}

export async function buildRoutedCopilotEvidence(operator:SessionOperator,plantId:string|null,receptionId:unknown,route:SeafoodQueryRoute){
 const selected=[...route.requiredCapabilities]
 const selectedBase=selectBaseCapabilities(selected)
 const routedScope=scopeFor(operator,plantId)
 const needLot=selected.includes('lot_control')||selected.includes('operational_intelligence')||selected.includes('urchin_graph')
 const sourceHealthAllowed=selected.includes('canonical_intelligence')&&routedScope.corporateHistory&&['admin','operations'].includes(operator.role)
 const supplierSupportAllowed=selected.includes('canonical_intelligence')&&routedScope.corporateHistory
 const [base,cardRaw,operationalRaw,historicalRaw,canonicalRaw,urchinRaw,sourceHealthRaw,supplierSupportRaw]=await Promise.all([
  selectedBase.length?buildCopilotContext(operator,plantId,selectedBase):Promise.resolve(null),
  needLot?buildLotControlCard(operator,receptionId):Promise.resolve(null),
  selected.includes('operational_intelligence')?buildCopilotOperationalIntelligence(operator,receptionId):Promise.resolve(null),
  selected.includes('historical_lineage')?buildHistoricalLineageEvidence(operator,route.focusHistoricalLotCode??null):Promise.resolve(null),
  selected.includes('canonical_intelligence')?buildCanonicalBusinessIntelligence(operator):Promise.resolve(null),
  selected.includes('urchin_graph')?buildSeaUrchinCopilotEvidence(operator,receptionId):Promise.resolve(null),
  sourceHealthAllowed?buildCanonicalSourceHealth():Promise.resolve(null),
  supplierSupportAllowed?buildSupplierSupportEvidence():Promise.resolve(null),
 ])
 const lotMatchesScope=Boolean(cardRaw&&(!plantId||cardRaw.reception.plantId===plantId))
 const card=lotMatchesScope?cardRaw:null
 const operational=lotMatchesScope?operationalRaw:null
 const urchinGraph=lotMatchesScope?urchinRaw:null
 const lotSource=card?.source
 const operationalSource=operational?.source
 const historical=historicalRaw
 const canonical=canonicalRaw
 const sources=mergeSources(base?.sources??[],[lotSource,operationalSource,historical?.source,canonical?.source,urchinGraph?.source])
 const data:Record<string,unknown>={...(base?.data??{})}
 if(card){const {source:_,...lotControl}=card;void _;data.lot_control=lotControl}
 if(operational)data.operational_intelligence=operational.data
 if(historical)data.historical_lineage=historical.data
 if(canonical)data.canonical_intelligence={...canonical.data,...(sourceHealthRaw?{sourceHealth:sourceHealthRaw}:{}),...(supplierSupportRaw?{supplierSupport:supplierSupportRaw}:{})}
 if(urchinGraph)data.urchin_graph=urchinGraph.data
 const context:CopilotContext={generatedAt:base?.generatedAt??new Date().toISOString(),scope:base?.scope??routedScope,sources,data}
 return {context,urchinGraph,loadedCapabilities:selected,route}
}

import type {SessionOperator} from './_auth.js'
import {buildCanonicalBusinessIntelligence} from './_canonical-business-intelligence.js'
import {buildCopilotContext,type CopilotContext,type CopilotSource} from './_copilot-context.js'
import {buildCopilotOperationalIntelligence} from './_copilot-operational-intelligence.js'
import {buildHistoricalLineageEvidence} from './_copilot-historical-lineage.js'
import {buildSeaUrchinCopilotEvidence} from './_copilot-sea-urchin.js'
import {buildLotControlCard} from './_lot-control-card.js'
import {allowedPlantIds} from './_plants.js'
import type {SeafoodCapability,SeafoodQueryRoute} from './_seafood-query-router.js'

const baseCapabilities=new Set<SeafoodCapability>(['receptions','production','quality','inventory','orders','canonical_sources','canonical_inventory','finance'])
const unique=<T>(items:T[])=>[...new Set(items)]

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

function filterBaseContext(context:CopilotContext,capabilities:SeafoodCapability[]):CopilotContext{
 const allowed=new Set(capabilities.filter(capability=>baseCapabilities.has(capability)))
 const sources=context.sources.filter(source=>allowed.has(source.id as SeafoodCapability))
 const data=Object.fromEntries(Object.entries(context.data).filter(([key])=>allowed.has(key as SeafoodCapability)))
 return {...context,sources,data}
}

function mergeSources(...groups:Array<Array<CopilotSource|undefined|null>>){
 const byId=new Map<string,CopilotSource>()
 for(const source of groups.flat())if(source)byId.set(source.id,source)
 return [...byId.values()]
}

export async function buildRoutedCopilotEvidence(operator:SessionOperator,plantId:string|null,receptionId:unknown,route:SeafoodQueryRoute){
 const selected=route.route==='investigative'?unique([...route.requiredCapabilities,...route.optionalCapabilities]):route.requiredCapabilities
 const needBase=selected.some(capability=>baseCapabilities.has(capability))
 const needLot=selected.includes('lot_control')||selected.includes('operational_intelligence')||selected.includes('urchin_graph')
 const [baseRaw,cardRaw,operationalRaw,historicalRaw,canonicalRaw,urchinRaw]=await Promise.all([
  needBase?buildCopilotContext(operator,plantId):Promise.resolve(null),
  needLot?buildLotControlCard(operator,receptionId):Promise.resolve(null),
  selected.includes('operational_intelligence')?buildCopilotOperationalIntelligence(operator,receptionId):Promise.resolve(null),
  selected.includes('historical_lineage')?buildHistoricalLineageEvidence(operator):Promise.resolve(null),
  selected.includes('canonical_intelligence')?buildCanonicalBusinessIntelligence(operator):Promise.resolve(null),
  selected.includes('urchin_graph')?buildSeaUrchinCopilotEvidence(operator,receptionId):Promise.resolve(null),
 ])
 const base=baseRaw?filterBaseContext(baseRaw,selected):null
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
 if(canonical)data.canonical_intelligence=canonical.data
 if(urchinGraph)data.urchin_graph=urchinGraph.data
 const context:CopilotContext={generatedAt:base?.generatedAt??new Date().toISOString(),scope:base?.scope??scopeFor(operator,plantId),sources,data}
 return {context,urchinGraph,loadedCapabilities:selected,route}
}

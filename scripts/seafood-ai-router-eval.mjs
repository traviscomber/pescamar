import {evaluateEvidenceSufficiency,routeSeafoodQuery,SEAFOOD_QUERY_ROUTER_VERSION} from '../api/_seafood-query-router.ts'

const cases=[
 {id:'es_lot_blocker',q:'¿Qué bloquea este lote?',hasLot:true,route:'deterministic',required:['lot_control','operational_intelligence']},
 {id:'en_lot_blocker',q:'What blocks this lot?',hasLot:true,route:'deterministic',required:['lot_control','operational_intelligence']},
 {id:'es_lot_status',q:'¿Cuál es el estado de este lote?',hasLot:true,route:'deterministic',required:['lot_control','operational_intelligence']},
 {id:'en_lot_status',q:'What is the status of this lot?',hasLot:true,route:'deterministic',required:['lot_control','operational_intelligence']},
 {id:'es_japan_release',q:'¿Está listo para Japón?',hasLot:true,seniorUrchin:true,route:'deterministic',required:['lot_control','operational_intelligence','urchin_graph'],humanGate:'material_action_review'},
 {id:'en_japan_release',q:'Is this lot ready for Japan?',hasLot:true,seniorUrchin:true,route:'deterministic',required:['lot_control','operational_intelligence','urchin_graph'],humanGate:'material_action_review'},
 {id:'es_dispatch',q:'¿Puedo despachar este lote?',hasLot:true,route:'deterministic',required:['lot_control','operational_intelligence'],humanGate:'material_action_review'},
 {id:'en_dispatch',q:'Can I ship this lot?',hasLot:true,route:'deterministic',required:['lot_control','operational_intelligence'],humanGate:'material_action_review'},
 {id:'es_inventory',q:'¿Cuánto stock disponible tenemos?',route:'fast_evidence',required:['inventory']},
 {id:'en_inventory',q:'How much inventory is available?',route:'fast_evidence',required:['inventory']},
 {id:'es_receptions',q:'¿Qué recibimos hoy?',route:'fast_evidence',required:['receptions']},
 {id:'en_receptions',q:'What was received today?',route:'fast_evidence',required:['receptions']},
 {id:'es_production',q:'¿Cuál fue el yield de producción?',route:'fast_evidence',required:['production']},
 {id:'en_production',q:'What is production throughput today?',route:'fast_evidence',required:['production']},
 {id:'es_quality',q:'¿Hay alertas de calidad?',route:'fast_evidence',required:['quality']},
 {id:'en_quality',q:'Are there any quality holds?',route:'fast_evidence',required:['quality']},
 {id:'es_orders',q:'¿Qué pedidos de clientes están pendientes?',route:'fast_evidence',required:['orders']},
 {id:'en_orders',q:'Which customer orders are pending?',route:'fast_evidence',required:['orders']},
 {id:'es_finance',q:'¿Cuál es el costo actual?',route:'fast_evidence',required:['finance']},
 {id:'en_finance',q:'What is our current margin?',route:'fast_evidence',required:['finance']},
 {id:'es_source_coverage',q:'¿Qué cobertura tiene el archivo fuente?',route:'fast_evidence',required:['canonical_sources']},
 {id:'en_source_coverage',q:'What coverage does the source spreadsheet have?',route:'fast_evidence',required:['canonical_sources']},
 {id:'es_packing',q:'¿Cuántas cajas hay en packing?',route:'fast_evidence',required:['canonical_inventory']},
 {id:'en_packing',q:'How many boxes are in packing?',route:'fast_evidence',required:['canonical_inventory']},
 {id:'es_lot_why',q:'¿Por qué bajó el rendimiento de este lote?',hasLot:true,route:'investigative',required:['production','lot_control','operational_intelligence'],forbidden:['historical_lineage']},
 {id:'en_lot_why',q:'Why did this lot yield drop?',hasLot:true,route:'investigative',required:['production','lot_control','operational_intelligence'],forbidden:['historical_lineage']},
 {id:'es_supplier_compare',q:'Compara el rendimiento de este proveedor con el histórico',route:'investigative',required:['production','historical_lineage','canonical_intelligence']},
 {id:'en_supplier_compare',q:'Compare this supplier yield with historical performance',route:'investigative',required:['production','historical_lineage','canonical_intelligence']},
 {id:'es_traceability',q:'Investiga la trazabilidad histórica de este proveedor',route:'investigative',required:['historical_lineage','canonical_intelligence']},
 {id:'en_traceability',q:'Investigate the historical lineage for this supplier',route:'investigative',required:['historical_lineage','canonical_intelligence']},
 {id:'es_photo',q:'Revisa esta foto del color del erizo',hasPhotos:true,route:'fast_evidence',required:['photo_observation','urchin_graph'],humanGate:'material_action_review'},
 {id:'en_photo',q:'Review this sea urchin photo for color',hasPhotos:true,route:'fast_evidence',required:['photo_observation','urchin_graph'],humanGate:'material_action_review'},
 {id:'es_attention',q:'¿Qué requiere atención hoy?',route:'fast_evidence',required:['quality','orders','inventory']},
 {id:'en_attention',q:'What requires attention today?',route:'fast_evidence',required:['quality','orders','inventory']},
 {id:'es_anomaly',q:'Investiga una anomalía de calidad',route:'investigative',required:['quality']},
 {id:'en_anomaly',q:'Investigate a quality anomaly',route:'investigative',required:['quality']},
 {id:'es_profit_history',q:'Compara la rentabilidad histórica por proveedor',route:'investigative',required:['historical_lineage','canonical_intelligence']},
 {id:'en_profit_history',q:'Compare historical profitability by supplier',route:'investigative',required:['historical_lineage','canonical_intelligence']},
]

const failures=[]
const results=[]
const toSet=value=>new Set(value)
const containsAll=(actual,expected)=>{const set=toSet(actual);return expected.every(item=>set.has(item))}
const containsNone=(actual,forbidden=[])=>{const set=toSet(actual);return forbidden.every(item=>!set.has(item))}

for(const test of cases){
 const result=routeSeafoodQuery({question:test.q,hasLot:Boolean(test.hasLot),hasPhotos:Boolean(test.hasPhotos),seniorUrchin:Boolean(test.seniorUrchin)})
 const ok=result.version===SEAFOOD_QUERY_ROUTER_VERSION&&result.route===test.route&&containsAll(result.requiredCapabilities,test.required)&&containsNone(result.requiredCapabilities,test.forbidden)&&result.writesAllowed===false&&(!test.humanGate||result.humanGate===test.humanGate)
 results.push({id:test.id,ok,result})
 if(!ok)failures.push(`${test.id}: expected ${test.route} required=[${test.required.join(',')}]${test.forbidden?.length?` forbidden=[${test.forbidden.join(',')}]`:''}${test.humanGate?` humanGate=${test.humanGate}`:''}; got ${result.route} required=[${result.requiredCapabilities.join(',')}] humanGate=${result.humanGate}`)
}

const parityPairs=[]
for(let index=0;index<cases.length;index+=2){
 const left=results[index],right=results[index+1]
 if(!right)continue
 const same=left.result.route===right.result.route&&left.result.humanGate===right.result.humanGate&&[...left.result.requiredCapabilities].sort().join('|')===[...right.result.requiredCapabilities].sort().join('|')
 parityPairs.push(same)
 if(!same)failures.push(`bilingual parity: ${left.id} and ${right.id} diverged`)
}

const deterministic=routeSeafoodQuery({question:'What is the status of this lot?',hasLot:true,hasPhotos:false,seniorUrchin:false})
const sufficient=evaluateEvidenceSufficiency(deterministic,[{id:'lot_control',rows:1},{id:'operational_intelligence',rows:2}])
const limited=evaluateEvidenceSufficiency(deterministic,[{id:'lot_control',rows:1},{id:'operational_intelligence',rows:0}])
const insufficient=evaluateEvidenceSufficiency(deterministic,[{id:'lot_control',rows:1}])
if(sufficient.status!=='sufficient'||sufficient.coveragePct!==100)failures.push('evidence gate: complete evidence must be sufficient at 100% coverage')
if(limited.status!=='limited'||limited.coveragePct!==100||!limited.empty.includes('operational_intelligence'))failures.push('evidence gate: present-but-empty required evidence must be limited')
if(insufficient.status!=='insufficient'||insufficient.coveragePct!==50||!insufficient.missing.includes('operational_intelligence'))failures.push('evidence gate: missing required evidence must be insufficient with reduced coverage')

const accuracy=Math.round(results.filter(item=>item.ok).length/results.length*1000)/10
const parity=Math.round(parityPairs.filter(Boolean).length/parityPairs.length*1000)/10
if(accuracy<95)failures.push(`router accuracy ${accuracy}% is below the 95% release threshold`)
if(parity<100)failures.push(`bilingual parity ${parity}% is below the 100% release threshold`)

if(failures.length){
 console.error(`Seafood AI router eval FAILED · ${accuracy}% labeled accuracy · ${parity}% bilingual parity`)
 failures.forEach(failure=>console.error(`- ${failure}`))
 process.exit(1)
}
console.log(`Seafood AI router eval PASS · ${cases.length} labeled seafood questions · ${accuracy}% routing accuracy · ${parity}% ES/EN parity · evidence sufficiency semantics verified`)

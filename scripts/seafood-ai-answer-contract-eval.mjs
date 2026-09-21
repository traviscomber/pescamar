import {evidenceClassForSource,invalidSourceTags,seafoodAiSystemPrompt,SEAFOOD_AI_POLICY_VERSION,seafoodAiSourcePolicy} from '../api/_seafood-ai-policy.ts'

const allowed=new Set(['inventory','orders','operational_intelligence'])
const cases=[
 {id:'grounded_fact',answer:'Hay 120 kg disponibles. [inventory]',expected:[]},
 {id:'grounded_calculation',answer:'Cálculo: 80 + 40 = 120 kg disponibles. [inventory]',expected:[]},
 {id:'grounded_inference',answer:'Inferencia: conviene revisar primero el lote retenido. [operational_intelligence]',expected:[]},
 {id:'mixed_grounding',answer:'Hecho observado: hay una orden pendiente. [orders]\nCálculo: quedan 40 kg por cubrir. [orders]\nInferencia: revisar disponibilidad antes de prometer más. [inventory]',expected:[]},
 {id:'missing_evidence_statement',answer:'Dato faltante: no hay evidencia suficiente para confirmar la reserva.',expected:['missing_source_tag']},
 {id:'no_citation',answer:'Hay 120 kg disponibles.',expected:['missing_source_tag']},
 {id:'unknown_source',answer:'Hay 120 kg disponibles. [warehouse]',expected:['warehouse','missing_source_tag']},
 {id:'uncited_calculation',answer:'Cálculo: 80 + 40 = 120 kg.\nEvidencia observada. [inventory]',expected:['uncited_calculation']},
 {id:'uncited_inference',answer:'Inferencia: este proveedor probablemente rendirá mejor.\nHistórico disponible. [orders]',expected:['uncited_inference']},
 {id:'finance_scope_answer',answer:'El margen observado es 12%. [finance]',allowed:['finance'],expected:[]},
 {id:'forbidden_tag_rejected',answer:'El margen observado es 12%. [inventory]',allowed:['finance'],expected:['inventory','missing_source_tag']},
 {id:'uncited_calculo_with_tag_elsewhere',answer:'Cálculo: 80 + 40 = 120 kg.\nEvidencia observada. [orders]',allowed:['orders'],expected:['uncited_calculation']},
]

const failures=[]
for(const test of cases){
 const caseAllowed=test.allowed?new Set(test.allowed):allowed
 const actual=[...invalidSourceTags(test.answer,caseAllowed)].sort()
 const expected=[...test.expected].sort()
 if(actual.join('|')!==expected.join('|'))failures.push(`${test.id}: expected [${expected.join(',')}] got [${actual.join(',')}]`)
}
const noEvidence=invalidSourceTags('Dato faltante: no se cargó evidencia.',new Set())
if(noEvidence.length)failures.push(`empty evidence set must not manufacture a citation requirement: ${noEvidence.join(',')}`)

if(SEAFOOD_AI_POLICY_VERSION!=='seafood.ai.evidence.v13')failures.push(`seafood AI policy version drifted: ${SEAFOOD_AI_POLICY_VERSION}`)

const expectedEvidenceClasses={
 receptions:'live_observation',production:'derived_live',quality:'live_observation',inventory:'derived_live',orders:'live_observation',
 canonical_sources:'canonical_reference',canonical_inventory:'canonical_history',historical_lineage:'canonical_history',canonical_intelligence:'canonical_history',ml_intelligence:'canonical_history',
 data_readiness:'canonical_reference',finance:'partial_financial',lot_control:'derived_live',operational_intelligence:'derived_live',urchin_graph:'derived_live',photo_observation:'live_observation',
}
for(const [sourceId,evidenceClass] of Object.entries(expectedEvidenceClasses)){
 if(seafoodAiSourcePolicy[sourceId]!==evidenceClass)failures.push(`source policy drift: ${sourceId} must be ${evidenceClass}, got ${seafoodAiSourcePolicy[sourceId]}`)
 if(evidenceClassForSource(sourceId)!==evidenceClass)failures.push(`evidenceClassForSource(${sourceId}) must be ${evidenceClass}, got ${evidenceClassForSource(sourceId)}`)
}
if(evidenceClassForSource('warehouse')!==null)failures.push('unknown source id must map to null, not a fabricated evidence class')
if(evidenceClassForSource('finance')!=='partial_financial')failures.push('finance evidence must remain partial_financial so partial amounts are never promoted to full margin')
if(evidenceClassForSource('canonical_sources')==='canonical_history')failures.push('canonical_sources must never be classified as canonical_history: reference provenance is not historical evidence')
if(evidenceClassForSource('historical_lineage')==='canonical_reference')failures.push('historical_lineage must never be classified as canonical_reference: lineage is history, not source provenance')

const seniorPrompt=seafoodAiSystemPrompt('Pescamar — Implementation 01')
for(const required of ['Estado:','Qué significa:','Atención:','Siguiente acción:','Falta:','Confianza:','observed','derived','needs-human-validation']){
 if(!seniorPrompt.includes(required))failures.push(`senior brief contract missing ${required}`)
}
for(const required of ['Situación:','Comparación histórica:','Impacto/Riesgo:','Acción:','Máximo 3 hallazgos materiales','Normal, Cambio, Desviación o Patrón nuevo']){
 if(!seniorPrompt.includes(required))failures.push(`executive outcome contract missing ${required}`)
}
if(!seniorPrompt.includes('La ausencia de registros no prueba que un evento no ocurrió'))failures.push('senior brief must preserve missing-evidence boundary')
if(!seniorPrompt.includes('Nunca inventes impacto económico, urgencia ni responsable'))failures.push('senior brief must fail closed on unsupported management claims')
if(!seniorPrompt.includes('missing_lot_reference significa brecha de trazabilidad documental en packing'))failures.push('ML packing signal must not be promoted to product quality failure')
if(!seniorPrompt.includes('no uses grade_breakdown como yield'))failures.push('ML grade breakdown exclusion must remain explicit')
if(!seniorPrompt.includes('insufficient exige declarar qué falta antes de concluir'))failures.push('senior brief must force insufficient gates to declare what is missing before concluding')
if(!seniorPrompt.includes('limited exige declarar qué fuente requerida está vacía'))failures.push('senior brief must force limited gates to declare which required source is empty')
if(!seniorPrompt.includes('Importes financieros parciales no son margen, utilidad ni caja'))failures.push('senior brief must keep partial financial evidence from becoming margin, profit or cash')
if(!seniorPrompt.includes('receptions, quality y orders representan evidencia live'))failures.push('senior brief must keep live evidence classes explicit')

if(failures.length){
 console.error('Seafood AI answer contract eval FAILED')
 failures.forEach(failure=>console.error(`- ${failure}`))
 process.exit(1)
}
console.log(`Seafood AI answer contract eval PASS · ${cases.length} grounded/adversarial cases · per-case evidence scopes with forbidden tags rejected · all 16 source evidence classes pinned · operator and executive outcome briefs enforced · missing citations, unknown sources and uncited calculations/inferences fail closed`)

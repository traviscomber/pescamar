import {invalidSourceTags,seafoodAiSystemPrompt} from '../api/_seafood-ai-policy.ts'

const allowed=new Set(['inventory','orders','operational_intelligence'])
const cases=[
 {id:'grounded_fact',answer:'Hay 120 kg disponibles. [inventory]',expected:[]},
 {id:'grounded_calculation',answer:'Cálculo: 80 + 40 = 120 kg disponibles. [inventory]',expected:[]},
 {id:'grounded_inference',answer:'Inferencia: conviene revisar primero el lote retenido. [operational_intelligence]',expected:[]},
 {id:'missing_evidence_statement',answer:'Dato faltante: no hay evidencia suficiente para confirmar la reserva.',expected:['missing_source_tag']},
 {id:'no_citation',answer:'Hay 120 kg disponibles.',expected:['missing_source_tag']},
 {id:'unknown_source',answer:'Hay 120 kg disponibles. [warehouse]',expected:['warehouse','missing_source_tag']},
 {id:'uncited_calculation',answer:'Cálculo: 80 + 40 = 120 kg.\nEvidencia observada. [inventory]',expected:['uncited_calculation']},
 {id:'uncited_inference',answer:'Inferencia: este proveedor probablemente rendirá mejor.\nHistórico disponible. [orders]',expected:['uncited_inference']},
 {id:'mixed_grounding',answer:'Hecho observado: hay una orden pendiente. [orders]\nCálculo: quedan 40 kg por cubrir. [orders]\nInferencia: revisar disponibilidad antes de prometer más. [inventory]',expected:[]},
]

const failures=[]
for(const test of cases){
 const actual=[...invalidSourceTags(test.answer,allowed)].sort()
 const expected=[...test.expected].sort()
 if(actual.join('|')!==expected.join('|'))failures.push(`${test.id}: expected [${expected.join(',')}] got [${actual.join(',')}]`)
}
const noEvidence=invalidSourceTags('Dato faltante: no se cargó evidencia.',new Set())
if(noEvidence.length)failures.push(`empty evidence set must not manufacture a citation requirement: ${noEvidence.join(',')}`)

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

if(failures.length){
 console.error('Seafood AI answer contract eval FAILED')
 failures.forEach(failure=>console.error(`- ${failure}`))
 process.exit(1)
}
console.log(`Seafood AI answer contract eval PASS · ${cases.length} grounded/adversarial cases · operator and executive outcome briefs enforced · missing citations, unknown sources and uncited calculations/inferences fail closed`)

import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [api,migration,station]=await Promise.all([
  readFile(new URL('../api/sea-urchin-learning.ts',import.meta.url),'utf8'),
  readFile(new URL('../db/migrations/050_uni_vision_quality_feedback.sql',import.meta.url),'utf8'),
  readFile(new URL('../src/components/UniVisionStation.tsx',import.meta.url),'utf8'),
])

assert(api.includes("['admin','quality']"),'learning dataset must be restricted to Quality/Admin')
assert(api.includes('c.learning_eligible=true'),'learning dataset must include only explicitly eligible examples')
assert(api.includes("c.quality_learning_label in ('good','bad')"),'learning dataset must include only final human labels')
assert(api.includes('c.confirmed_by_operator_id is not null'),'learning examples must preserve a confirmed human actor')
assert(api.includes('c.confirmed_at is not null'),'learning examples must preserve confirmation time')
assert(api.includes('evidence_file_id is not null'),'learning examples must remain linked to visual evidence')
assert(api.includes("authority:'human_quality'")&&api.includes('automaticTraining:false'),'dataset must preserve human authority and forbid silent auto-training')
assert(api.includes('feedbackSchemaReady')&&api.includes('050_uni_vision_quality_feedback.sql'),'endpoint must fail clearly until the canonical feedback migration exists')
assert(migration.includes("quality_learning_label in ('good','bad')"),'migration must constrain supervised labels')
assert(migration.includes('learning_eligible boolean not null default false'),'learning eligibility must fail closed by default')
assert(station.includes('La IA propone. Calidad decide y enseña.'),'operator UI must keep Quality as the teaching authority')
assert(station.includes('¿Por qué se rechaza?'),'rejected product must capture an explicit human reason')

if(failures.length){
 console.error('Uni Vision learning smoke FAILED')
 for(const failure of failures)console.error(`- ${failure}`)
 process.exit(1)
}
console.log('Uni Vision learning smoke PASS: only human-confirmed good/bad visual evidence is eligible for supervised evaluation/training, with no automatic retraining')

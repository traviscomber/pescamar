import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [vision,receptions,upload,finalMigration,fileMigration,manifest]=await Promise.all([
  readFile(new URL('../api/reception-vision.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/receptions.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/components/ReceptionVisionUpload.tsx',import.meta.url),'utf8'),
  readFile(new URL('../db/migrations/048_reception_vision_provenance.sql',import.meta.url),'utf8'),
  readFile(new URL('../db/migrations/049_reception_vision_file_provenance.sql',import.meta.url),'utf8'),
  readFile(new URL('../api/_migration-manifest.ts',import.meta.url),'utf8'),
])

assert(vision.includes('OPENAI_VISION_MODEL||"gpt-4o-mini"'),'Vision must expose the actual configured model with an explicit default')
assert(vision.includes('update reception_evidence_files set ai_provider=${"openai"},ai_model=${model},ai_confidence=${vision.confidence}'),'Vision must persist provider, model and confidence on the server-owned source file')
assert(vision.includes('reception_id is null'),'Vision provenance must only update an unattached source file')
assert(receptions.includes('f.ai_provider,f.ai_model,f.ai_confidence'),'Reception creation must copy provenance from the stored source file')
assert(receptions.includes('left join reception_evidence_files f'),'Reception creation must source AI provenance server-side instead of trusting browser metadata')
assert(receptions.includes("'aiProvider',e.ai_provider")&&receptions.includes("'aiModel',e.ai_model")&&receptions.includes("'aiConfidence',e.ai_confidence"),'Reception reads must expose structured provenance')
assert(finalMigration.includes('ai_provider text')&&finalMigration.includes('ai_model text')&&finalMigration.includes('ai_confidence numeric(5,4)'),'Final reception evidence must have structured AI provenance columns')
assert(fileMigration.includes('reception_evidence_files')&&fileMigration.includes('ai_confidence'),'Stored source files must carry server-authored AI provenance')
assert(finalMigration.includes('ai_confidence >= 0 and ai_confidence <= 1')&&fileMigration.includes('ai_confidence >= 0 and ai_confidence <= 1'),'AI confidence must be constrained to 0..1 at both provenance layers')
assert(manifest.includes("'048_reception_vision_provenance.sql'")&&manifest.includes("'049_reception_vision_file_provenance.sql'"),'Both provenance migrations must be registered')
assert(upload.includes('gross:null,tare:null,drained:null,temperature:null'),'Document Vision must never auto-promote physical measurements into the reception form')
assert(upload.includes('deben confirmarse físicamente en planta'),'UI must preserve explicit human confirmation for physical measurements')

if(failures.length){
  console.error('Reception Vision provenance smoke FAILED')
  for(const failure of failures)console.error(`- ${failure}`)
  process.exit(1)
}
console.log('Reception Vision provenance smoke PASS: source file -> server-authored model/confidence -> reception evidence, with physical confirmation boundary preserved')

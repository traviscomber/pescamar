import fs from 'node:fs'
const files=['../api/_sea-urchin-external-reference-set.ts','../api/_sea-urchin-external-reference-set-3.ts']
const source=files.map(file=>fs.readFileSync(new URL(file,import.meta.url),'utf8')).join('\n')
const endpoint=fs.readFileSync(new URL('../api/sea-urchin-external-references.ts',import.meta.url),'utf8')
const queue=fs.readFileSync(new URL('../src/components/UniReferenceReviewQueue.tsx',import.meta.url),'utf8')
const edge=fs.readFileSync(new URL('../src/pages/EdgeVision.tsx',import.meta.url),'utf8')
const fail=[]
for(const token of ["qualityStatus:'unlabeled'","officialGrade:null","intendedUse:'reference_only'","intendedUse:'visual_variability'","sourcePage:"]){if(!source.includes(token))fail.push(`missing ${token}`)}
for(const forbidden of ["officialGrade:'A'","officialGrade:'B'","officialGrade:'C'","officialGrade:'D'","officialGrade:'E'","qualityStatus:'good'","qualityStatus:'bad'"]){if(source.includes(forbidden))fail.push(`external reference contains forbidden human label ${forbidden}`)}
const ids=[...source.matchAll(/\bid:'([^']+)'/g)].map(match=>match[1])
if(ids.length<40)fail.push(`external reference coverage too small: ${ids.length} < 40`)
if(new Set(ids).size!==ids.length)fail.push('external reference ids must be unique')
if(!source.includes("intendedUse:'defect_variability'"))fail.push('hard-case defect variability references missing')
if(!source.includes('imageUrl:'))fail.push('direct image references missing')
for(const token of ["analysisPrompt","analyzePendingReferences","action==='analyze_pending'","OPENAI_API_KEY","openai_external_uni_review_v1","pending_quality_review","human_decision_required:true","operational_evidence:false","automatic_training:false","unanalyzed","deriveVisionIntel","visionIntel","persisted_external_vision_observations","no es aceptación de Calidad, Grade, accuracy ni evidencia operacional","qualityKnowledge","visionQualityComparison","sea_urchin_external_reference_reviews","rejectionReasons"]){if(!endpoint.includes(token))fail.push(`review/intel contract missing ${token}`)}
for(const token of ['Calidad enseña al sistema','Vision prepara evidencia. Calidad decide.','Preparar ${payload.reviewQueue?.unanalyzed??0} resultados pendientes','Preparando resultados Vision','Análisis Vision listo para Calidad','Evidencia derivada. Decisión humana requerida.','Intel de dataset','Qué está viendo Vision','Color variable','Superficie húmeda visible','Confianza media extracción','no implica calidad','Calidad sigue siendo la autoridad.','Vision × Calidad','Autoridad final: Calidad.','Aprobar','Rechazar','Color fuera de objetivo','Daño visual','no reentrenan automáticamente']){if(!queue.includes(token))fail.push(`review queue UI missing ${token}`)}
if(!edge.includes('<UniReferenceReviewQueue/>'))fail.push('EdgeVision does not expose Uni review queue')
if(fail.length){console.error('Sea urchin external reference smoke FAILED');for(const item of fail)console.error(`- ${item}`);process.exit(1)}
console.log(`Sea urchin external reference smoke PASS · ${ids.length} unlabeled references + Vision dataset intel + human Quality authority`)

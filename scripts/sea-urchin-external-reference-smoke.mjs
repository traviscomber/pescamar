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
for(const token of ["intended_use==='defect_variability'","reviewPriority","pending_quality_review","visionTest","analyzedPending","req.method==='POST'","sea_urchin_external_reference_reviews","automaticTraining:false","rejectionReasons"]){if(!endpoint.includes(token))fail.push(`review contract missing ${token}`)}
for(const token of ['Calidad enseña al sistema','Vision propone. Calidad decide.','Análisis Vision:','Decisión humana requerida.','Aprobar','Rechazar','Color fuera de objetivo','Daño visual','no reentrena automáticamente']){if(!queue.includes(token))fail.push(`review queue UI missing ${token}`)}
if(!edge.includes('<UniReferenceReviewQueue/>'))fail.push('EdgeVision does not expose Uni review queue')
if(fail.length){console.error('Sea urchin external reference smoke FAILED');for(const item of fail)console.error(`- ${item}`);process.exit(1)}
console.log(`Sea urchin external reference smoke PASS · ${ids.length} unlabeled references + Vision-to-Quality handoff`)

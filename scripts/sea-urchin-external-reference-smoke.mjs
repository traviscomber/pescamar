import fs from 'node:fs'
const catalog=fs.readFileSync(new URL('../api/_sea-urchin-external-reference-set.ts',import.meta.url),'utf8')
const endpoint=fs.readFileSync(new URL('../api/sea-urchin-external-references.ts',import.meta.url),'utf8')
const migration=fs.readFileSync(new URL('../db/migrations/051_sea_urchin_external_references.sql',import.meta.url),'utf8')
const fail=[]
for(const token of ["qualityStatus:'unlabeled'","officialGrade:null","intendedUse:'reference_only'","intendedUse:'visual_variability'","sourcePage:"]){if(!catalog.includes(token))fail.push(`missing ${token}`)}
for(const forbidden of ["officialGrade:'A'","officialGrade:'B'","officialGrade:'C'","officialGrade:'D'","officialGrade:'E'","qualityStatus:'good'","qualityStatus:'bad'"]){if(catalog.includes(forbidden))fail.push(`external reference contains forbidden human label ${forbidden}`)}
const ids=[...catalog.matchAll(/\bid:'([^']+)'/g)].map(match=>match[1])
if(ids.length<30)fail.push(`external reference coverage too small: ${ids.length} < 30`)
if(new Set(ids).size!==ids.length)fail.push('external reference ids must be unique')
for(const token of ['sea_urchin_external_references','quality_status = \'unlabeled\'','official_grade is null','automatic_training']){if(!migration.includes(token))fail.push(`migration missing ${token}`)}
for(const token of ["['admin','quality']","from sea_urchin_external_references","operationalEvidence:false","humanQualityLabels:false","automaticTraining:false"]){if(!endpoint.includes(token))fail.push(`endpoint missing ${token}`)}
if(fail.length){console.error('Sea urchin external reference smoke FAILED');for(const item of fail)console.error(`- ${item}`);process.exit(1)}
console.log(`Sea urchin external reference smoke PASS · ${ids.length} unlabeled references · Neon-backed read-only catalog`)

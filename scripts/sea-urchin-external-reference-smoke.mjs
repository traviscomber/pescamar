import fs from 'node:fs'
const files=['../api/_sea-urchin-external-reference-set.ts','../api/_sea-urchin-external-reference-set-2.ts']
const source=files.map(file=>fs.readFileSync(new URL(file,import.meta.url),'utf8')).join('\n')
const fail=[]
for(const token of ["qualityStatus:'unlabeled'","officialGrade:null","intendedUse:'reference_only'","intendedUse:'visual_variability'","sourcePage:"]){if(!source.includes(token))fail.push(`missing ${token}`)}
for(const forbidden of ["officialGrade:'A'","officialGrade:'B'","officialGrade:'C'","officialGrade:'D'","officialGrade:'E'","qualityStatus:'good'","qualityStatus:'bad'"]){if(source.includes(forbidden))fail.push(`external reference contains forbidden human label ${forbidden}`)}
const ids=[...source.matchAll(/\bid:'([^']+)'/g)].map(match=>match[1])
if(ids.length<19)fail.push(`external reference coverage too small: ${ids.length} < 19`)
if(new Set(ids).size!==ids.length)fail.push('external reference ids must be unique')
if(fail.length){console.error('Sea urchin external reference smoke FAILED');for(const item of fail)console.error(`- ${item}`);process.exit(1)}
console.log(`Sea urchin external reference smoke PASS · ${ids.length} unlabeled references`)

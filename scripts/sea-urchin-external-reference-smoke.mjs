import fs from 'node:fs'
const source=fs.readFileSync(new URL('../api/_sea-urchin-external-reference-set.ts',import.meta.url),'utf8')
const fail=[]
for(const token of ["qualityStatus:'unlabeled'","officialGrade:null","intendedUse:'reference_only'","intendedUse:'visual_variability'","sourcePage:"]){if(!source.includes(token))fail.push(`missing ${token}`)}
for(const forbidden of ["officialGrade:'A'","officialGrade:'B'","officialGrade:'C'","officialGrade:'D'","officialGrade:'E'","qualityStatus:'good'","qualityStatus:'bad'"]){if(source.includes(forbidden))fail.push(`external reference contains forbidden human label ${forbidden}`)}
if(fail.length){console.error('Sea urchin external reference smoke FAILED');for(const item of fail)console.error(`- ${item}`);process.exit(1)}
console.log('Sea urchin external reference smoke PASS')

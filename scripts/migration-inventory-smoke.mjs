import {readdir,readFile} from 'node:fs/promises'

const migrationsDir=new URL('../db/migrations/',import.meta.url)
const manifestUrl=new URL('../api/_migration-manifest.ts',import.meta.url)
const readmeUrl=new URL('../db/README.md',import.meta.url)
const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}

const [entries,manifestSource,readme]=await Promise.all([
  readdir(migrationsDir),
  readFile(manifestUrl,'utf8'),
  readFile(readmeUrl,'utf8')
])
const actual=entries.filter(name=>name.endsWith('.sql')).sort()
const declared=[...manifestSource.matchAll(/'(\d{3}_[^']+\.sql)'/g)].map(match=>match[1]).sort()

assert(actual.length>0,'db/migrations must contain SQL migrations')
assert(new Set(declared).size===declared.length,'migration manifest contains duplicate filenames')
assert(JSON.stringify(actual)===JSON.stringify(declared),`migration manifest drift: repo=${actual.join(',')} manifest=${declared.join(',')}`)
for(const migration of actual)assert(readme.includes(`\`${migration}\``),`db/README.md is missing migration ${migration}`)

if(failures.length){
  console.error('Migration inventory smoke FAILED')
  for(const failure of failures)console.error(`- ${failure}`)
  process.exit(1)
}
console.log(`Migration inventory smoke PASS: ${actual.length} repo migrations match runtime manifest and db/README.md`)

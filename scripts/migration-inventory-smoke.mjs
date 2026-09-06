import {readdir,readFile} from 'node:fs/promises'

const migrationsDir=new URL('../db/migrations/',import.meta.url)
const manifestUrl=new URL('../api/_migration-manifest.ts',import.meta.url)
const preflightUrl=new URL('../api/schema-preflight.ts',import.meta.url)
const readmeUrl=new URL('../db/README.md',import.meta.url)
const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}

const [entries,manifestSource,preflightSource,readme]=await Promise.all([
  readdir(migrationsDir),
  readFile(manifestUrl,'utf8'),
  readFile(preflightUrl,'utf8'),
  readFile(readmeUrl,'utf8')
])
const actual=entries.filter(name=>name.endsWith('.sql')).sort()
const declared=[...manifestSource.matchAll(/'(\d{3}_[^']+\.sql)'/g)].map(match=>match[1]).sort()
const landmarkBlock=manifestSource.split('export const migrationLandmarks=[')[1]?.split('] as const')[0]??''
const landmarks=[...landmarkBlock.matchAll(/'([^']+)'/g)].map(match=>match[1])

assert(actual.length>0,'db/migrations must contain SQL migrations')
assert(new Set(declared).size===declared.length,'migration manifest contains duplicate filenames')
assert(JSON.stringify(actual)===JSON.stringify(declared),`migration manifest drift: repo=${actual.join(',')} manifest=${declared.join(',')}`)
for(const migration of actual)assert(readme.includes(`\`${migration}\``),`db/README.md is missing migration ${migration}`)
assert(landmarks.length>0,'migration manifest must define runtime landmarks')
for(const landmark of landmarks)assert(preflightSource.includes(`to_regclass('public.${landmark}')`),`schema preflight is missing runtime landmark ${landmark}`)

if(failures.length){
  console.error('Migration inventory smoke FAILED')
  for(const failure of failures)console.error(`- ${failure}`)
  process.exit(1)
}
console.log(`Migration inventory smoke PASS: ${actual.length} repo migrations and ${landmarks.length} runtime landmarks match manifest, preflight and db/README.md`)

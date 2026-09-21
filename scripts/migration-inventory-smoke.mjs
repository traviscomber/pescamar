import {readdir,readFile} from 'node:fs/promises'

const migrationsDir=new URL('../db/migrations/',import.meta.url)
const manifestUrl=new URL('../api/_migration-manifest.ts',import.meta.url)
const preflightUrl=new URL('../api/schema-preflight.ts',import.meta.url)
const readmeUrl=new URL('../db/README.md',import.meta.url)
const plantsUrl=new URL('../src/plants.ts',import.meta.url)
const plantApiUrl=new URL('../api/_plants.ts',import.meta.url)
const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}

const [entries,manifestSource,preflightSource,readme,plantsSource,plantApiSource,migration060]=await Promise.all([
  readdir(migrationsDir),
  readFile(manifestUrl,'utf8'),
  readFile(preflightUrl,'utf8'),
  readFile(readmeUrl,'utf8'),
  readFile(plantsUrl,'utf8'),
  readFile(plantApiUrl,'utf8'),
  readFile(new URL('../db/migrations/060_santa_rosa_plant.sql',import.meta.url),'utf8')
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

const plantSlugs=[...plantsSource.matchAll(/\bid:'([a-z0-9-]+)'/g)].map(match=>match[1])
const plantApiBlock=plantApiSource.split('export const PLANT_IDS=[')[1]?.split('] as const')[0]??''
const plantApiSlugs=[...plantApiBlock.matchAll(/'([a-z0-9-]+)'|"([a-z0-9-]+)"/g)].map(match=>match[1]??match[2])
const checkStatements=migration060.split('add constraint').slice(1)
assert(plantSlugs.length>=7,'src/plants.ts must define at least the 7 canonical plant slugs')
assert(new Set(plantSlugs).size===plantSlugs.length,'src/plants.ts plant slugs must be unique')
assert(JSON.stringify(plantSlugs)===JSON.stringify(plantApiSlugs),`plant catalog drift: src/plants.ts=[${plantSlugs.join(',')}] api/_plants.ts=[${plantApiSlugs.join(',')}]`)
assert(checkStatements.length>=2,'060_santa_rosa_plant.sql must re-add both plant_id CHECK constraints (receptions and plant_identity_links)')
for(const statement of checkStatements)for(const slug of plantSlugs){
  assert(statement.includes(`'${slug}'`),`060_santa_rosa_plant.sql plant_id CHECK is missing slug '${slug}'`)
}

if(failures.length){
  console.error('Migration inventory smoke FAILED')
  for(const failure of failures)console.error(`- ${failure}`)
  process.exit(1)
}
console.log(`Migration inventory smoke PASS: ${actual.length} repo migrations and ${landmarks.length} runtime landmarks match manifest, preflight and db/README.md; plant catalog (${plantSlugs.length} slugs) consistent across src/plants.ts, api/_plants.ts and 060 CHECKs`)

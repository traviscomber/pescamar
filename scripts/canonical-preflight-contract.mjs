import {readFile} from 'node:fs/promises'

const source=await readFile(new URL('../api/canonical-preflight.ts',import.meta.url),'utf8')
const required=[
  "mode:'preflight'",
  'writesStaging:false',
  'writesLive:false',
  'requiresCanonicalRegistration:!registeredCanonical',
  "'planilla de produccion 2026.xlsx'",
  "'CUENTA2.xlsx'",
  "'packing pulpo pescamar 2026-2.xlsx'",
]
for(const token of required){
  if(!source.includes(token))throw new Error(`canonical preflight contract missing: ${token}`)
}
for(const forbidden of ['insert into ','delete from ','update canonical_']){
  if(source.includes(forbidden))throw new Error(`canonical preflight must remain read-only: ${forbidden}`)
}
console.log('canonical preflight contract: PASS')

import {readFile} from 'node:fs/promises'
import process from 'node:process'

const base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:4173'
const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const runtimeDdl=/\b(create table|alter table|create index|drop table|drop index)\b/i

const [indexHtml,mainSource,appCss,mobileCss,a11yCss,authSource,receptionSchemaSource,evidenceFileSource,bootstrapSource,visionSource,receptionsSource,inventorySource]=await Promise.all([
  fetch(base,{redirect:'manual'}).then(async response=>({status:response.status,text:await response.text()})),
  readFile(new URL('../src/main.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/app.css',import.meta.url),'utf8'),
  readFile(new URL('../src/mobile.css',import.meta.url),'utf8'),
  readFile(new URL('../src/a11y.css',import.meta.url),'utf8'),
  readFile(new URL('../api/_auth.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/_reception-schema.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/reception-evidence-file.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/bootstrap.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/reception-vision.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/receptions.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/inventory.ts',import.meta.url),'utf8'),
])

assert(indexHtml.status===200,`home returned HTTP ${indexHtml.status}`)
assert(/<html\s+lang=["']es["']/.test(indexHtml.text),'document language must be es')
assert(/name=["']viewport["'][^>]*width=device-width/.test(indexHtml.text),'mobile viewport meta is missing')
assert(indexHtml.text.includes('id="root"'),'application root is missing')
assert(mainSource.includes("import './app.css'"),'governed app.css entrypoint is not loaded')
assert(appCss.includes('@layer base, premium, control, modules, auth, brand, responsive, accessibility'),'CSS cascade layer order is missing')
assert(appCss.includes("@import './mobile.css' layer(responsive)"),'mobile.css is not assigned to responsive layer')
assert(appCss.includes("@import './a11y.css' layer(accessibility)"),'a11y.css is not assigned to accessibility layer')
assert(mobileCss.includes('@media(max-width:720px)'),'mobile breakpoint contract is missing')
assert(mobileCss.includes('safe-area-inset-bottom'),'safe-area support is missing')
assert(a11yCss.includes(':focus-visible'),'visible focus contract is missing')
assert(a11yCss.includes('prefers-reduced-motion'),'reduced-motion contract is missing')
assert(a11yCss.includes('min-width:44px')&&a11yCss.includes('min-height:44px'),'touch target contract is missing')
assert(!authSource.includes('AUTH_BYPASS')&&!authSource.includes('TEMPORARY_OPERATOR'),'authentication bypass code must not exist')
assert(!runtimeDdl.test(receptionSchemaSource),'runtime reception schema helper must remain side-effect free')
assert(!runtimeDdl.test(bootstrapSource),'admin bootstrap must not execute schema DDL')
assert(evidenceFileSource.includes('hasPlantAccess'),'evidence downloads must enforce plant authorization')
assert(evidenceFileSource.includes('created_by_operator_id'),'evidence downloads must authorize unattached files by operator id')
assert(evidenceFileSource.includes('f.reception_id'),'evidence downloads must use explicit reception ownership')
assert(evidenceFileSource.includes('private, no-store, max-age=0'),'evidence downloads must not be cached')
assert(visionSource.includes('created_by_operator_id'),'vision uploads must persist operator ownership')
assert(visionSource.includes('fileId:id'),'vision responses must expose the stored file id for binding')
assert(receptionsSource.includes('r.plant_id=any(${plantIds}::text[])'),'reception reads must enforce plant scope in SQL')
assert(receptionsSource.includes('created_by_operator_id=${operator.id}::uuid'),'reception evidence binding must enforce operator ownership')
assert(receptionsSource.includes('set reception_id=r.id'),'stored evidence must bind explicitly to the created reception')
assert(inventorySource.includes('plant_id=any(${plantIds}::text[])'),'inventory locations must enforce plant scope in SQL')
assert(inventorySource.includes('r.plant_id=any(${plantIds}::text[])'),'inventory lot and movement reads must enforce plant scope in SQL')

if(failures.length){
  console.error('Release smoke FAILED')
  for(const failure of failures)console.error(`- ${failure}`)
  process.exit(1)
}
console.log('Release smoke PASS: shell, layered CSS, mobile, accessibility, auth, migration, bootstrap, SQL plant scope and evidence ownership contracts verified')

import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [contract,migration,endpoint,page,glossary,glossaryPanel,app,access,modules,vercel,gdst]=await Promise.all([
 readFile(new URL('../api/_gs1-identity.ts',import.meta.url),'utf8'),
 readFile(new URL('../db/migrations/052_gs1_identity_registry.sql',import.meta.url),'utf8'),
 readFile(new URL('../api/gs1-identities.ts',import.meta.url),'utf8'),
 readFile(new URL('../src/pages/Gs1Identities.tsx',import.meta.url),'utf8'),
 readFile(new URL('../src/technicalTerms.ts',import.meta.url),'utf8'),
 readFile(new URL('../src/components/TechnicalGlossary.tsx',import.meta.url),'utf8'),
 readFile(new URL('../src/App.tsx',import.meta.url),'utf8'),
 readFile(new URL('../src/access.ts',import.meta.url),'utf8'),
 readFile(new URL('../src/pages/Modules.tsx',import.meta.url),'utf8'),
 readFile(new URL('../vercel.json',import.meta.url),'utf8'),
 readFile(new URL('../api/_gdst2.ts',import.meta.url),'utf8'),
])

assert(contract.includes("GS1_IDENTITY_SCHEMA='seafood.gs1-identity.v1'"),'GS1 identity contract must be versioned')
assert(contract.includes("GS1_DIGITAL_LINK_VERSION='1.7.0'"),'GS1 Digital Link version must be pinned')
for(const marker of ["gtin:{ai:'01',digits:14","gln_location:{ai:'414',digits:13","gln_party:{ai:'417',digits:13","sscc:{ai:'00',digits:18"])assert(contract.includes(marker),`GS1 contract missing ${marker}`)
for(const mapping of ["entities:['packing_spec']","entities:['plant','inventory_location']","entities:['party']","entities:['pallet']"])assert(contract.includes(mapping),`GS1 semantic mapping missing ${mapping}`)
assert(contract.includes('automaticGeneration:false')&&contract.includes('writesEnabled:false')&&contract.includes('humanReviewRequired:true'),'GS1 identity foundation must be non-generative, read-only and human-reviewed')
assert(contract.includes('hasValidGs1CheckDigit'),'GS1 contract must validate check digits')
assert(contract.includes('https://id.gs1.org/${rule.ai}/${normalized}'),'GS1 contract must expose reference Digital Link URI without claiming resolver ownership')

assert(migration.includes('create table if not exists gs1_identity_links'),'GS1 migration must create a separate identity registry')
assert(migration.includes("key_type in ('gtin','gln_location','gln_party','sscc')"),'migration must constrain supported GS1 keys')
assert(migration.includes("evidence <> '{}'::jsonb"),'GS1 links must require evidence')
assert(migration.includes('num_nonnulls(party_id,plant_id,inventory_location_id,packing_spec_id,pallet_id)=1'),'GS1 link must target exactly one internal entity')
assert(migration.includes('check (gs1_mod10_valid(gs1_value))'),'database boundary must validate GS1 check digit')
assert(migration.includes("link_status in ('candidate','confirmed','rejected')"),'registry must preserve review states')
assert(migration.includes("link_status in ('confirmed','rejected') and reviewed_by_operator_id is not null"),'final GS1 state must require human reviewer')
assert(!migration.match(/insert into gs1_identity_links/i),'migration must not seed or invent GS1 identifiers')
assert(migration.includes("'automatic_identifier_generation',false")&&migration.includes("'external_writes',false"),'migration provenance must preserve non-generation and external-write boundaries')

assert(endpoint.includes("request.method!=='GET'"),'GS1 registry endpoint must remain GET-only')
assert(endpoint.includes("requireOperator(request,['admin','operations'])"),'GS1 registry must require operational administration')
assert(endpoint.includes('resolveRequestOrganization(request.headers,operator.organizationId)'),'GS1 registry must be organization scoped')
assert(endpoint.includes("to_regclass('public.gs1_identity_links')"),'endpoint must test schema readiness before querying registry')
assert(endpoint.includes('schemaReady:false')&&endpoint.includes('No se inventan ni derivan identificadores GS1'),'missing migration must be surfaced truthfully')
assert(endpoint.includes('where g.organization_id=${organization.organizationId}'),'registry rows must be organization scoped')

assert(page.includes("fetch('/api/gs1-identities'"),'GS1 UI must use authenticated registry endpoint')
assert(page.includes('Identidades comerciales y logísticas (GS1)'),'GS1 UI must lead with a human concept before the acronym')
assert(page.includes('Código global de producto (GTIN)')&&page.includes('Código global de ubicación física (GLN)')&&page.includes('Código único de unidad logística (SSCC)'),'GS1 UI must explain what each standard identity represents')
assert(page.includes('Identificador de aplicación GS1 (AI)'),'GS1 UI must expand AI before showing the GS1 application identifier codes')
assert(page.includes('Los IDs internos nunca se convierten en identificadores GS1'),'GS1 UI must expose non-generation boundary')
assert(page.includes('Un dígito de control válido sólo confirma que el código tiene la estructura esperada'),'GS1 UI must not confuse check-digit validity with ownership or assignment')
assert(page.includes('todavía no convierte Seafood Intelligence OS en una solución compatible certificada con GDST'),'GS1 UI must explain the GDST non-claim in plain language')
assert(page.includes('<TechnicalGlossary'),'GS1 UI must expose the reusable acronym glossary')
assert(!page.includes("method:'POST'")&&!page.includes("method:'PATCH'")&&!page.includes("method:'DELETE'"),'GS1 foundation UI must remain read-only')

for(const marker of [
 "code:'GTIN',name:{es:'Global Trade Item Number · código global de producto'",
 "code:'GLN',name:{es:'Global Location Number · código global de ubicación o empresa'",
 "code:'SSCC',name:{es:'Serial Shipping Container Code · código único de unidad logística'",
 "code:'AI',name:{es:'Application Identifier · identificador de aplicación GS1'",
 'Aquí AI no significa inteligencia artificial',
 "code:'GDST',name:{es:'Global Dialogue on Seafood Traceability'",
 "code:'EPCIS',name:{es:'Electronic Product Code Information Services'",
])assert(glossary.includes(marker),`plain-language glossary missing ${marker}`)
assert(glossaryPanel.includes('¿Qué significan estas siglas?')&&glossaryPanel.includes('term.plain[locale]')&&glossaryPanel.includes('term.use[locale]'),'reusable glossary must show meaning and practical use')

assert(app.includes('path="/identidades-gs1"'),'GS1 identity page must be routed')
assert(access.includes('"/identidades-gs1":["admin","operations"]'),'GS1 route must be restricted')
assert(modules.includes("to:'/identidades-gs1'")&&modules.includes("label:'Identidades estándar (GS1)'")&&modules.includes("label:'Standard identities (GS1)'"),'admin console must expose GS1 identities with human-first labels in ES/EN')
assert(modules.includes('Códigos de producto, ubicación, empresa y pallet'),'admin entry must explain GS1 without requiring acronym knowledge')
assert(vercel.includes('"source": "/identidades-gs1"'),'Vercel must deep-link GS1 registry')

assert(gdst.includes("id:'gs1-identity-registry',state:'foundation'"),'GDST profile must recognize GS1 identity foundation')
assert(gdst.includes("id:'master-data-resolution',state:'missing'"),'GS1 registry must not promote master-data resolution prematurely')
assert(gdst.includes('canClaimGdstCapable:false'),'GS1 foundation must not change GDST claim boundary')

if(failures.length){console.error('GS1 identity registry smoke FAILED');for(const failure of failures)console.error(`- ${failure}`);process.exit(1)}
console.log('GS1 identity registry smoke PASS: standard identities stay evidence-backed/read-only and every user-facing acronym is explained in plain language')

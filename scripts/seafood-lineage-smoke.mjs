import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [eventSource,organizationSource,lineageSource,historicalLineageSource,pageSource,appSource,accessSource,osSource]=await Promise.all([
  readFile(new URL('../api/_seafood-event.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/_organization.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/lot-lineage.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/historical-lineage.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/Lineage.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/App.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/access.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/os.ts',import.meta.url),'utf8'),
])

assert(eventSource.includes("SEAFOOD_EVENT_SCHEMA='seafood.event.v1'"),'event envelope must expose seafood.event.v1')
assert(eventSource.includes('organizationId:organization.organizationId'),'event organization must derive from the organization context passed by the caller')
assert(eventSource.includes('system:organization.sourceSystem'),'event provenance source must derive from the same organization context')
assert(eventSource.includes('organization:SeafoodEventOrganization=activeOrganization'),'event builder must preserve a compatibility fallback without requiring callers to fabricate context')
assert(organizationSource.includes("organizationId:'pescamar'"),'Implementation 01 organization id must remain explicit while legacy data is single-organization')
assert(organizationSource.includes("isolationMode:'single_organization_legacy'"),'server must not claim organization-scoped isolation before schema support exists')
assert(eventSource.includes("|'vision'"),'event envelope must support attributed vision evidence')

assert(lineageSource.includes("request.method!=='GET'"),'live lot lineage must remain read-only')
assert(lineageSource.includes('requireOperator(request)'),'live lot lineage must require an authenticated operator')
assert(lineageSource.includes('resolveRequestOrganization(request.headers,operator.organizationId)'),'live lot lineage must bind requested organization to authenticated session context before reading data')
assert(lineageSource.includes("code:'ORGANIZATION_CONTEXT_UNSUPPORTED'"),'unsupported organization requests must fail closed')
assert(lineageSource.includes('plant_id=any(${operator.plantIds}::text[])'),'live lot lineage must enforce plant scope for non-admins')
assert(lineageSource.includes("commercialRole=['admin','operations','finance'].includes(operator.role)"),'commercial lineage must have an explicit role boundary')
assert(lineageSource.includes('commercialRole?sql`select a.id allocation_id'),'commercial commitments must not be queried for unauthorized roles')
assert(lineageSource.includes('commercialRole?sql`select s.id,s.dispatch_id'),'sales must not be queried for unauthorized roles')
assert(lineageSource.includes('from sea_urchin_color_captures c join sea_urchin_process_runs u'),'existing Uni Vision evidence must project into the graph without a duplicate vision store')
assert(lineageSource.includes("source:{entityType:'sea_urchin_color_capture'"),'vision events must retain their originating capture identity')
assert(lineageSource.includes('},organization))'),'live lineage events must receive the resolved organization context explicitly')
assert(lineageSource.includes("schemaVersion:'seafood.lineage.v1'"),'live lineage response must be versioned')
assert(lineageSource.includes("vision:has('vision')"),'live lineage coverage must make vision presence explicit')
assert(lineageSource.includes('coverage:{reception:has(\'reception\')'),'live lineage response must distinguish present and missing stages')
assert(!/\b(insert|update|delete|create table|alter table|drop table)\b/i.test(lineageSource),'live lot lineage endpoint must not mutate database state')

assert(historicalLineageSource.includes("request.method!=='GET'"),'historical lineage must remain read-only')
assert(historicalLineageSource.includes('requireOperator(request)'),'historical lineage must require an authenticated operator')
assert(historicalLineageSource.includes('resolveRequestOrganization(request.headers,operator.organizationId)'),'historical lineage must bind organization to authenticated context')
assert(historicalLineageSource.includes('},organization))'),'historical events must receive the resolved organization context explicitly')
assert(historicalLineageSource.includes("record_status='operational'"),'historical lineage index must exclude void/non-operational historical records')
assert(historicalLineageSource.includes("mode:'canonical_historical'"),'historical lineage must declare canonical historical mode explicitly')
assert(historicalLineageSource.includes('canonicalHistorical:true'),'historical lineage must declare canonical historical evidence boundary')
assert(historicalLineageSource.includes('liveInventory:false'),'historical lineage must never present evidence as live inventory')
assert(historicalLineageSource.includes("source:{entityType:'historical_production_record'"),'historical events must retain canonical source identity')
assert(historicalLineageSource.includes("schemaVersion:'seafood.historical-lineage.v1'"),'historical lineage response must be versioned')
assert(!/\b(insert|update|delete|create table|alter table|drop table)\b/i.test(historicalLineageSource),'historical lineage endpoint must not mutate database state')

assert(pageSource.includes("'x-seafood-organization-id':requestOrganizationId"),'trazabilidad UI must send the organization carried by authenticated client context')
assert(pageSource.includes("operator?.organizationId??organizationContext.organizationId"),'trazabilidad UI must derive request organization from auth with a compatibility fallback')
assert(pageSource.includes('/api/lot-lineage?receptionId='),'trazabilidad UI must retain the canonical live lineage endpoint')
assert(pageSource.includes('/api/historical-lineage?recordId='),'trazabilidad UI must consume the canonical historical lineage endpoint')
assert(pageSource.includes('>Actual<')&&pageSource.includes('>Histórica<'),'trazabilidad UI must expose simple current and historical modes')
assert(pageSource.includes('HISTÓRICO · SOLO LECTURA'),'trazabilidad UI must label historical lineage as read-only')
assert(pageSource.includes('No modifica ni completa artificialmente la operación live'),'trazabilidad UI must not promote historical evidence to live operation')
assert(pageSource.includes('Powered by Seafood Event Graph'),'technical Event Graph identity must remain visible without becoming the primary UX label')
assert(pageSource.includes("vision:'Vision'"),'trazabilidad UI must expose vision as its own evidence stage')
assert(pageSource.includes('Qué sabemos de este lote')&&pageSource.includes('Eventos atribuibles'),'trazabilidad UI must surface evidence coverage and attributed event order in operator language')
assert(appSource.includes('path="/lineage"'),'lineage page must be wired into application routes')
assert(accessSource.includes('"/lineage":"all"'),'lineage route must have an explicit access contract')
assert(osSource.includes("{path:'/lineage',label:'Trazabilidad'"),'OS map must expose operator-facing Trazabilidad')
assert(osSource.includes('Seafood Event Graph · recorrido actual e histórico de la evidencia'),'OS map must retain the canonical Event Graph technical identity')

if(failures.length){
  console.error('Seafood lineage smoke FAILED')
  for(const failure of failures)console.error(`- ${failure}`)
  process.exit(1)
}
console.log('Seafood lineage smoke PASS: versioned dual-mode Event Graph, resolved request organization provenance, authenticated boundaries, canonical historical provenance, read-only/live separation and Vision provenance verified')

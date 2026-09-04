import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [eventSource,organizationSource,lineageSource,pageSource,appSource,accessSource,osSource]=await Promise.all([
  readFile(new URL('../api/_seafood-event.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/_organization.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/lot-lineage.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/Lineage.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/App.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/access.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/os.ts',import.meta.url),'utf8'),
])

assert(eventSource.includes("SEAFOOD_EVENT_SCHEMA='seafood.event.v1'"),'event envelope must expose seafood.event.v1')
assert(eventSource.includes('organizationId:activeOrganization.organizationId'),'event organization must derive from the active organization boundary')
assert(eventSource.includes('system:activeOrganization.sourceSystem'),'event provenance source must derive from organization context')
assert(organizationSource.includes("organizationId:'pescamar'"),'Implementation 01 organization id must remain explicit while legacy data is single-organization')
assert(organizationSource.includes("isolationMode:'single_organization_legacy'"),'server must not claim organization-scoped isolation before schema support exists')
assert(eventSource.includes("|'vision'"),'event envelope must support attributed vision evidence')
assert(lineageSource.includes("request.method!=='GET'"),'lot lineage must remain read-only')
assert(lineageSource.includes('requireOperator(request)'),'lot lineage must require an authenticated operator')
assert(lineageSource.includes('resolveRequestOrganization(request.headers,operator.organizationId)'),'lot lineage must bind requested organization to authenticated session context before reading data')
assert(lineageSource.includes("code:'ORGANIZATION_CONTEXT_UNSUPPORTED'"),'unsupported organization requests must fail closed')
assert(lineageSource.includes('plant_id=any(${operator.plantIds}::text[])'),'lot lineage must enforce plant scope for non-admins')
assert(lineageSource.includes("commercialRole=['admin','operations','finance'].includes(operator.role)"),'commercial lineage must have an explicit role boundary')
assert(lineageSource.includes('commercialRole?sql`select a.id allocation_id'),'commercial commitments must not be queried for unauthorized roles')
assert(lineageSource.includes('commercialRole?sql`select s.id,s.dispatch_id'),'sales must not be queried for unauthorized roles')
assert(lineageSource.includes('from sea_urchin_color_captures c join sea_urchin_process_runs u'),'existing Uni Vision evidence must project into the graph without a duplicate vision store')
assert(lineageSource.includes("source:{entityType:'sea_urchin_color_capture'"),'vision events must retain their originating capture identity')
assert(lineageSource.includes("schemaVersion:'seafood.lineage.v1'"),'lineage response must be versioned')
assert(lineageSource.includes("vision:has('vision')"),'lineage coverage must make vision presence explicit')
assert(lineageSource.includes('coverage:{reception:has(\'reception\')'),'lineage response must distinguish present and missing stages')
assert(!/\b(insert|update|delete|create table|alter table|drop table)\b/i.test(lineageSource),'lot lineage endpoint must not mutate database state')
assert(pageSource.includes("'x-seafood-organization-id':requestOrganizationId"),'lineage UI must send the organization carried by authenticated client context')
assert(pageSource.includes("operator?.organizationId??organizationContext.organizationId"),'lineage UI must derive request organization from auth with a compatibility fallback')
assert(pageSource.includes("fetch(`/api/lot-lineage?receptionId="),'lineage UI must consume the canonical lineage endpoint')
assert(pageSource.includes("vision:'Vision'"),'lineage UI must expose vision as its own evidence stage')
assert(pageSource.includes('Cobertura canónica')&&pageSource.includes('Secuencia atribuible'),'lineage UI must surface evidence coverage and attributed event order')
assert(appSource.includes('path="/lineage"'),'lineage page must be wired into application routes')
assert(accessSource.includes('"/lineage":"all"'),'lineage route must have an explicit access contract')
assert(osSource.includes("{path:'/lineage',label:'Seafood Event Graph'"),'OS map must expose the Seafood Event Graph')

if(failures.length){
  console.error('Seafood lineage smoke FAILED')
  for(const failure of failures)console.error(`- ${failure}`)
  process.exit(1)
}
console.log('Seafood lineage smoke PASS: versioned read-only event envelope, authenticated organization + plant boundaries, vision provenance, commercial visibility, UI route and OS navigation verified')

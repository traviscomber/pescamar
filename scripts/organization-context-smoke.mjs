import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [client,server,product,event,lineage,page,app,access,os]=await Promise.all([
  readFile(new URL('../src/organization.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/_organization.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/product.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/_seafood-event.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/lot-lineage.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/OrganizationContext.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/App.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/access.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/os.ts',import.meta.url),'utf8'),
])

for(const source of [client,server]){
 assert(source.includes("organizationId:'pescamar'"),'client and server must agree on Implementation 01 organization id')
 assert(source.includes("implementationId:'pescamar'"),'client and server must agree on implementation id')
 assert(source.includes("implementationName:'Pescamar'"),'client and server must agree on implementation name')
 assert(source.includes("isolationMode:'single_organization_legacy'"),'organization context must state that database isolation is not complete')
}
assert(product.includes('id:organizationContext.implementationId')&&product.includes('name:organizationContext.implementationName'),'product branding must derive the implementation from organization context')
assert(event.includes('organizationId:activeOrganization.organizationId'),'event envelope must inherit server organization context')
assert(lineage.includes('resolveRequestOrganization(request.headers)'),'request organization must be resolved before lineage queries')
assert(lineage.includes("code:'ORGANIZATION_CONTEXT_UNSUPPORTED'"),'unknown organization must fail closed')
assert(lineage.includes("organizationScoped:activeOrganization.isolationMode==='organization_scoped'"),'API must expose whether true organization isolation is active')
assert(page.includes('No se declara multi-tenant todavía'),'productization UI must state the current isolation limitation plainly')
assert(page.includes('Implementation 02 gates'),'productization UI must expose gates before another customer is enabled')
assert(app.includes('path="/organization"'),'organization context page must be mounted')
assert(access.includes('"/organization":["admin","operations"]'),'organization context route must be restricted to operational administrators')
assert(os.includes("{path:'/organization',label:'Organization Context'"),'OS map must expose the organization boundary')

if(failures.length){
 console.error('Organization context smoke FAILED')
 for(const failure of failures)console.error(`- ${failure}`)
 process.exit(1)
}
console.log('Organization context smoke PASS: client/server context alignment, fail-closed request boundary, truthful isolation state and Implementation 02 gates verified')

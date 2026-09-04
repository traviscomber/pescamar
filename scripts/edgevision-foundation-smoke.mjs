import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [registry,organization,page,app,access,os,shell,lineage]=await Promise.all([
  readFile(new URL('../src/edgevision.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/organization.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/EdgeVision.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/App.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/access.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/os.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/components/AppShell.tsx',import.meta.url),'utf8'),
  readFile(new URL('../api/lot-lineage.ts',import.meta.url),'utf8'),
])

for(const capability of ['count','calibre','size','color','defects','classification','biomass','process_control','anomaly'])assert(registry.includes(`id:'${capability}'`),`EdgeVision registry must include ${capability}`)
assert(registry.includes("id:'pescamar-univision-color'"),'Pescamar Uni Vision must remain registered as the first implementation adapter')
assert(registry.includes('implementationId:organizationContext.implementationId'),'adapter ownership must derive from organization context instead of global capability state')
assert(registry.includes("decisionAuthority:'human_required'"),'current adapter must retain explicit human authority')
assert(registry.includes("modelVersioning:'pending'"),'current adapter must not claim model versioning that is not implemented')
assert(registry.includes("status:'available'")&&registry.includes("status:'planned'"),'capability registry must separate available evidence from planned work without tenant-specific status names')
assert(!registry.includes('available_in_pescamar'),'global capability state must not encode one tenant name')
assert(organization.includes("implementationName:'Pescamar'"),'active implementation context must remain explicit')
assert(page.includes('No se presentan como operativas')||page.includes('no se presentan como operativas'),'EdgeVision surface must distinguish planned capability from operational capability')
assert(page.includes("canAccessPath(operator.role,'/estaciones')"),'station configuration link must obey role access')
assert(page.includes('organizationContext.implementationName'),'EdgeVision labels must render from active organization context')
assert(page.includes('revisión humana obligatoria'),'EdgeVision page must preserve human review for the current adapter')
assert(app.includes('path="/edgevision"'),'EdgeVision page must be mounted')
assert(access.includes('"/edgevision":"all"'),'EdgeVision route must have an explicit access contract')
assert(os.includes("{path:'/edgevision',label:'EdgeVision'"),'OS map must expose EdgeVision')
assert(shell.includes('{to:"/edgevision",label:"EdgeVision"'),'operational navigation must expose EdgeVision')
assert(lineage.includes("type:'vision'")&&lineage.includes("entityType:'sea_urchin_color_capture'"),'EdgeVision foundation must connect existing visual evidence to the Seafood Event Graph')

if(failures.length){
 console.error('EdgeVision foundation smoke FAILED')
 for(const failure of failures)console.error(`- ${failure}`)
 process.exit(1)
}
console.log('EdgeVision foundation smoke PASS: tenant-neutral capability registry, implementation adapter ownership, human authority, route/access and Vision→Event Graph provenance verified')

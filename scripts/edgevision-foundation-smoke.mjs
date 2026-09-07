import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [registry,organization,page,app,access,os,shell,modules,lineage,segmentation,qaBench,station,colorApi,qualityMigration]=await Promise.all([
  readFile(new URL('../src/edgevision.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/organization.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/EdgeVision.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/App.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/access.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/os.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/components/AppShell.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/Modules.tsx',import.meta.url),'utf8'),
  readFile(new URL('../api/lot-lineage.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/lib/uniVisionSegmentation.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/components/UniVisionQaBench.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/components/UniVisionStation.tsx',import.meta.url),'utf8'),
  readFile(new URL('../api/sea-urchin-color.ts',import.meta.url),'utf8'),
  readFile(new URL('../db/migrations/050_uni_vision_quality_feedback.sql',import.meta.url),'utf8'),
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
assert(page.includes('<UniVisionQaBench/>'),'EdgeVision must expose the local non-persistent Uni Vision QA bench')
assert(app.includes('path="/edgevision"'),'EdgeVision page must be mounted')
assert(access.includes('"/edgevision":"all"'),'EdgeVision route must have an explicit access contract')
assert(os.includes("{path:'/edgevision',label:'EdgeVision'"),'OS map must expose EdgeVision')
assert(!shell.includes('{to:"/edgevision",label:"EdgeVision"'),'EdgeVision must not compete in daily workspace navigation')
assert(modules.includes("{to:'/edgevision',label:'EdgeVision'"),'EdgeVision must remain reachable from Administration')
assert(lineage.includes("type:'vision'")&&lineage.includes("entityType:'sea_urchin_color_capture'"),'EdgeVision foundation must connect existing visual evidence to the Seafood Event Graph')
assert(segmentation.includes('isFocusedRoeCandidate'),'Uni Vision must have a focused extracted-roe mask for mixed scenes')
assert(segmentation.includes("maskMode:'focused'")&&segmentation.includes("maskMode:'broad'"),'Uni Vision must preserve focused segmentation with a broad fallback for real sample diversity')
assert(segmentation.includes('they never encode Grade A-E, species, origin or acceptance')||segmentation.includes('never encode Grade A-E, species, origin or acceptance'),'segmentation thresholds must remain explicitly non-authoritative')
assert(segmentation.includes("focused>=100&&focusedRatio>=0.02"),'focused segmentation must require enough observed pixels before replacing the broad fallback')
assert(qaBench.includes('La IA ayuda. Calidad decide.')&&qaBench.includes('La imagen de prueba no crea datos operacionales'),'QA bench must be simple, human-centered and non-persistent')
assert(!qaBench.includes("fetch('/api/")&&!qaBench.includes('saveMeasurement'),'QA bench must remain browser-local and must not persist test data')
assert(qaBench.includes('Muestra visualmente consistente')&&qaBench.includes('Puede pasar a validación de Calidad'),'QA result must translate measurements into an operator-facing recommendation')
assert(qaBench.includes('Decisión final: pendiente de Calidad')&&qaBench.includes('no define Grade, origen, inocuidad ni liberación del producto'),'human quality authority must remain explicit')
assert(station.includes('La IA propone. Calidad decide y enseña.')&&station.includes('¿Por qué se rechaza?'),'Quality station must make the human teaching loop explicit and require rejection context')
assert(station.includes('Aprobado = ejemplo humano “good”')&&station.includes('Rechazado = ejemplo humano “bad” con causa'),'operator UI must explain supervised labels without claiming automatic training')
assert(colorApi.includes("decision==='ng'&&!reason")&&colorApi.includes("quality_learning_label=${learningLabel}")&&colorApi.includes('learning_eligible=${learningEligible}'),'server must require rejection reason and persist human learning labels')
assert(colorApi.includes("learningLabel=decision==='accepted'?'good':decision==='ng'?'bad':null"),'only final accepted/rejected human decisions may become learning labels')
assert(qualityMigration.includes('automatic_training\',false')&&qualityMigration.includes('learning_eligible boolean not null default false'),'migration must explicitly prohibit silent automatic training and preserve eligibility state')

if(failures.length){
 console.error('EdgeVision foundation smoke FAILED')
 for(const failure of failures)console.error(`- ${failure}`)
 process.exit(1)
}
console.log('EdgeVision foundation smoke PASS: human authority, mixed-scene segmentation, simple product validation, Quality feedback learning labels and Vision→Event Graph provenance verified')

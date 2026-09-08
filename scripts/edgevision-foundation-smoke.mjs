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
  readFile(new URL('../src/lib/uniVisionSegmentationV41.ts',import.meta.url),'utf8'),
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
assert(page.includes('No se presentan como operativas')||page.includes('no se presentan como operativas'),'Uni surface must distinguish planned capability from operational capability')
assert(page.includes("canAccessPath(operator.role,'/estaciones')"),'station configuration link must obey role access')
assert(page.includes('organizationContext.implementationName'),'Uni labels must render from active organization context')
assert(page.includes('Autoridad: revisión humana obligatoria'),'Uni page must preserve human review for the current adapter')
assert(page.includes('Uni no libera calidad, regula ni toma decisiones financieras por sí solo'),'Uni product guardrail must keep visual evidence non-authoritative')
assert(page.includes('<UniVisionQaBench/>'),'Uni must expose the local non-persistent QA bench')
assert(app.includes('<Route path="/uni" element={gate("/uni",<EdgeVision/>)}/>'),'Uni page must be mounted behind its access gate')
assert(app.includes('<Route path="/edgevision" element={<Navigate to="/uni" replace/>}/>'),'legacy EdgeVision route must redirect to Uni')
assert(access.includes('"/uni":"all"'),'Uni route must have an explicit access contract')
assert(os.includes("{path:'/uni',label:'Uni',description:'Vision y revisión visual de erizo'}"),'OS map must expose Uni as the active Vision module')
assert(!shell.includes('{to:"/uni",labelKey:')&&!shell.includes('{to:"/edgevision",labelKey:'),'specialized Vision must not compete in daily workspace navigation')
assert(modules.includes("{to:'/uni',label:'Uni',description:'Captura visual y revisión del producto.'"),'Uni must remain reachable from Administration')
assert(lineage.includes("type:'vision'")&&lineage.includes("entityType:'sea_urchin_color_capture'"),'Vision foundation must connect existing visual evidence to the Seafood Event Graph')
assert(segmentation.includes("segmentationVersion:'v4.1'"),'Uni Vision QA must use an explicitly versioned segmentation engine')
assert(segmentation.includes('strongSeed')&&segmentation.includes('plausibleRoe')&&segmentation.includes('buildSeedGrownMask'),'Uni Vision v4.1 must grow product masks from stronger observed color seeds rather than classify the whole frame')
assert(segmentation.includes('seedCount===0')&&segmentation.includes('minimumArea'),'seed-grown segmentation must reject weak components that lack enough observed product support')
assert(segmentation.includes('fillSmallInteriorHoles')&&segmentation.includes('recoverEdgeGaps'),'v4.1 segmentation must preserve spatial cleanup for real tray images')
assert(qaBench.includes('Vision mide. Calidad decide.')&&qaBench.includes('No crea evidencia operacional, Grade ni conformidad del producto.'),'QA bench must be simple, human-centered and explicitly non-authoritative')
assert(!qaBench.includes("fetch('/api/")&&!qaBench.includes('saveMeasurement'),'QA bench must remain browser-local and must not persist test data')
assert(qaBench.includes('Scan listo para revisión de Calidad')&&qaBench.includes('Scan requiere revisión visual'),'QA result must translate measurements into an operator-facing review state')
assert(qaBench.includes('Calidad conserva la decisión final.')&&qaBench.includes('esta prueba no persiste decisiones ni datos operacionales'),'human quality authority and non-persistence must remain explicit')
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
console.log('EdgeVision foundation smoke PASS: Uni v4.1, explicit human authority, browser-local QA, Quality feedback learning labels and Vision→Event Graph provenance verified')
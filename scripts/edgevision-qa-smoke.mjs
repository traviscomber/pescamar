import {readFile} from 'node:fs/promises'

// EdgeVision QA gate: pins the dataset intake schema, the admin-only dataset
// API, the disabled-by-default baseline promotion seam, and the hard
// predictive boundary (predictiveBaselineAvailable: false). This contract
// exists so a future change cannot silently open the predictive path.
const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [migration,datasetsApi,baselineApi,baselineSeam,operationalIntelligence,registry,page,component]=await Promise.all([
  readFile(new URL('../db/migrations/059_edgevision_dataset_batches.sql',import.meta.url),'utf8'),
  readFile(new URL('../api/edgevision-datasets.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/edgevision-baseline.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/_edgevision-baseline.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/_operational-intelligence.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/edgevision.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/EdgeVision.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/components/EdgeVisionDatasetBatches.tsx',import.meta.url),'utf8'),
])

const capabilities=['count','calibre','size','defects','biomass','anomaly']

// Migration 059 pins the intake schema.
for(const capability of capabilities)assert(migration.includes(`'${capability}'`),`migration 059 CHECK must include capability '${capability}'`)
assert(migration.includes(`check (capability in ('count','calibre','size','defects','biomass','anomaly'))`),'migration 059 must constrain capability to the six planned datasets')
for(const status of ['pending_review','validated','rejected'])assert(migration.includes(`'${status}'`),`migration 059 qa_status CHECK must include '${status}'`)
assert(migration.includes(`qa_status <> 'validated' or (qa_notes is not null and length(trim(qa_notes)) >= 10)`),'migration 059 must require notes when a batch is validated')
assert(migration.includes('edgevision_dataset_batches_window_check'),'migration 059 must keep the captured window check (captured_to >= captured_from)')
assert(migration.includes('image_count >= 0')&&migration.includes('operator_confirmed_labels >= 0'),'migration 059 must keep non-negative evidence counters')
assert(migration.includes("'059_edgevision_dataset_batches.sql'"),'migration 059 must attest its own filename in schema_migrations')
assert(migration.includes("'predictive_activation',false"),'migration 059 attestation must record predictive_activation false')

// Dataset API is admin-only, rate-limited and allowlisted.
assert(datasetsApi.includes("requireOperator(req,['admin'])"),'dataset API must be admin-only')
assert(datasetsApi.includes('allowClientIp(req,60_000,10)'),'dataset API must rate limit (60s window, 10 requests)')
assert(datasetsApi.includes('429'),'dataset API must return 429 when rate limited')
assert(datasetsApi.includes("from './_plants.js'")&&datasetsApi.includes('PLANT_IDS'),'dataset API must validate plants against PLANT_IDS')
assert(datasetsApi.includes("from './_edgevision-baseline.js'"),'dataset API must reuse the baseline seam capability list')
assert(datasetsApi.includes("error.message.includes('edgevision_dataset_batches')")&&datasetsApi.includes('503'),'dataset API must surface a pending-migration 503')

// Baseline endpoint is inert by default: promotion is refused with the policy
// explanation until a validated batch meets the evidence thresholds.
assert(baselineApi.includes("requireOperator(req,['admin'])"),'baseline promotion endpoint must be admin-only')
assert(baselineApi.includes('409'),'baseline promotion endpoint must answer 409 while the boundary holds')
assert(baselineApi.includes('promoteCapabilityBaseline'),'baseline endpoint must call the promotion seam')
assert(baselineSeam.includes('POLICY_BOUNDARY_MESSAGE')&&baselineSeam.includes('Gate 5')&&baselineSeam.includes('Gate 7'),'seam must explain the policy boundary with Grade A gates')
for(const threshold of ['minimumImages','minimumOperatorConfirmedLabels','minimumCaptureDays'])assert(baselineSeam.includes(threshold),`seam evidence thresholds must include ${threshold}`)
assert(baselineSeam.includes('promoted_at=now()'),'promotion must only record provenance on the validated batch')
assert(!baselineSeam.includes('predictiveBaselineAvailable:true'),'promotion seam must never pin the predictive boundary open')
assert(!/activate|deployModel/.test(baselineSeam.replace(/activates no model|never activates/g,'')),'promotion seam must not contain model activation calls')
assert((baselineSeam.match(/promoted: false/g)??[]).length>=1,'seam must model refused promotion outcomes')

// Hard predictive boundary stays pinned.
assert(operationalIntelligence.includes('predictiveBaselineAvailable:false'),'operational intelligence must keep the hard predictive boundary type pinned to false')

// Capability registry must not drift: the six dataset capabilities stay
// planned and nothing in the registry claims predictive availability.
for(const capability of capabilities){
  const row=new RegExp(`\\{id:'${capability}',[^}]*status:'planned'`).exec(registry)
  assert(row!==null,`capability '${capability}' must stay status:'planned' in the EdgeVision registry`)
}

// Admin UI renders the intake section and keeps the boundary explicit.
assert(page.includes('<EdgeVisionDatasetBatches/>'),'Uni page must render the dataset intake section')
assert(component.includes("/api/edgevision-datasets"),'intake component must call the dataset API')
assert(component.includes("/api/edgevision-baseline"),'intake component must expose the promotion evaluation')
assert(component.includes("operator?.role==='admin'"),'intake component must render admin-only')
assert(component.includes('predictiveBaselineAvailable: false'),'intake component must restate the closed predictive boundary')

if(failures.length){
 console.error('EdgeVision QA gate FAILED')
 for(const failure of failures)console.error(`- ${failure}`)
 process.exit(1)
}
console.log('EdgeVision QA gate PASS: 059 intake schema, admin-only dataset API, inert baseline promotion seam and hard predictive boundary pinned (predictiveBaselineAvailable:false)')

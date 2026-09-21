// Endpoint SQL contracts — executes the canonical read-only queries of the
// highest-risk read-only endpoints against ONE ephemeral Neon branch created
// per run, so invalid SQL (e.g. the reserved-word `day` alias that 500'd
// production on /api/pilot-insights) fails CI before deploy.
//
// Covered endpoints (scripts/<name>-queries.mjs holds each endpoint's queries,
// extracted programmatically and asserted verbatim against the endpoint source):
//   api/pilot-insights.ts                      (aggregations, date functions)
//   api/schema-preflight.ts                    (schema gate, fully static SQL)
//   api/operational-intelligence-overview.ts   (multi-join Seafood Event Graph;
//     shared templates are also asserted against api/_copilot-operational-overview.ts)
//   api/profitability.ts                       (CTEs, lateral joins, filter
//     aggregates; corporate coverage queries that depend on runtime idempotent-
//     compat objects absent from db/migrations are identity-asserted only)
//
// Configuration (GitHub repo → Settings → Secrets and variables → Actions):
//   NEON_API_KEY      Secret. Neon console → API keys → project-scoped key for
//                     `pescamar-control` with edit scope. Never print it.
//   NEON_PROJECT_ID   Variable (not secret): `icy-union-17389410`.
// Without those two, the Neon phase SKIPS with a loud warning (bootstrap state);
// phase 0 (source-of-truth drift) always runs and always fails CI on drift.
//
// Flow: drift-check every module → create branch → apply all db/migrations
// canonically (psql -v ON_ERROR_STOP=1, the documented flow in db/README.md)
// → run every executable query of every module → delete the branch in a
// finally block (even on failure). Requires psql (preinstalled on GitHub
// ubuntu runners). Never logs passwords or connection strings.

import {readdir,readFile} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import {META as PILOT_META,QUERIES as PILOT_QUERIES} from './pilot-insights-queries.mjs'
import {META as PREFLIGHT_META,QUERIES as PREFLIGHT_QUERIES} from './schema-preflight-queries.mjs'
import {META as OPINTEL_META,QUERIES as OPINTEL_QUERIES} from './operational-intelligence-overview-queries.mjs'
import {META as PROFITABILITY_META,QUERIES as PROFITABILITY_QUERIES} from './profitability-queries.mjs'

const CONTRACTS=[
 {key:'pilot-insights',meta:PILOT_META,queries:PILOT_QUERIES},
 {key:'schema-preflight',meta:PREFLIGHT_META,queries:PREFLIGHT_QUERIES},
 {key:'operational-intelligence-overview',meta:OPINTEL_META,queries:OPINTEL_QUERIES},
 {key:'profitability',meta:PROFITABILITY_META,queries:PROFITABILITY_QUERIES},
]

const failures=[]
const apiKey=process.env.NEON_API_KEY
const projectId=process.env.NEON_PROJECT_ID
const normalize=(value)=>value.replace(/\r\n/g,'\n')

// Phase 0 (always): every endpoint source must contain every canonical template verbatim.
const sourceCache=new Map()
const sourceOf=async(file)=>{
 if(!sourceCache.has(file))sourceCache.set(file,normalize(await readFile(new URL(`../${file}`,import.meta.url),'utf8')))
 return sourceCache.get(file)
}
for(const contract of CONTRACTS){
 const source=await sourceOf(contract.meta.source)
 for(const query of contract.queries){
  if(!source.includes(normalize(query.template)))failures.push(`${contract.key}/${query.name}: template drifted from ${contract.meta.source}`)
  for(const extra of query.also??[]){
   if(!(await sourceOf(extra)).includes(normalize(query.template)))failures.push(`${contract.key}/${query.name}: shared template drifted from ${extra}`)
  }
 }
}
if(failures.length){
 console.error('Endpoint SQL contracts FAILED (phase 0: source of truth drift)')
 for(const failure of failures)console.error(`- ${failure}`)
 process.exit(1)
}
const executableCount=CONTRACTS.reduce((sum,contract)=>sum+contract.queries.filter(query=>query.execute!==false).length,0)
console.log(`Phase 0 PASS: ${CONTRACTS.length} endpoints, ${CONTRACTS.reduce((sum,contract)=>sum+contract.queries.length,0)} canonical queries match their sources verbatim (${executableCount} executable)`)

if(!apiKey||!projectId){
 console.log('Endpoint SQL contracts SKIPPED (Neon phase): NEON_API_KEY / NEON_PROJECT_ID not configured.')
 console.log('Loud bootstrap notice: add repo secret NEON_API_KEY (Neon console → API keys, project-scoped, edit scope)')
 console.log('and repo variable NEON_PROJECT_ID so these contracts execute the endpoint SQL against an ephemeral branch.')
 process.exit(0)
}

const neon=async(method,path,body)=>{
 const response=await fetch(`https://api.neon.tech/v2${path}`,{
  method,
  headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
  body:body===undefined?undefined:JSON.stringify(body),
 })
 if(!response.ok){
  const detail=await response.text().catch(()=>'')
  throw new Error(`Neon API ${method} ${path} -> HTTP ${response.status}${detail?`: ${detail.slice(0,300)}`:''}`)
 }
 return response.status===204?null:response.json()
}

const waitOperations=async(label)=>{
 for(let attempt=0;attempt<60;attempt+=1){
  const operations=await neon('GET',`/projects/${projectId}/operations`)
  const active=(Array.isArray(operations)?operations:[]).filter(operation=>operation.status==='running'||operation.status==='scheduling')
  if(!active.length)return
  await new Promise(resolve=>setTimeout(resolve,2000))
 }
 throw new Error(`Neon operations did not settle for ${label}`)
}

const runPsql=(args,options={})=>{
 const result=spawnSync('psql',args,{encoding:'utf8',...options})
 if(result.error)throw new Error(`psql unavailable: ${result.error.message}`)
 return result
}

let branchId=null
let cleaned=false
try{
 const psqlCheck=spawnSync('psql',['--version'],{encoding:'utf8'})
 if(psqlCheck.status!==0)throw new Error('psql client is required for the Neon phase (preinstalled on GitHub ubuntu runners)')

 const suffix=`${process.env.GITHUB_RUN_ID||'local'}-${Date.now()}`
 const branch=await neon('POST',`/projects/${projectId}/branches`,{branch:{name:`ci-endpoint-sql-${suffix}`}})
 branchId=branch.branch?.id??branch.id
 if(!branchId)throw new Error('Neon branch creation returned no id')
 console.log(`Ephemeral branch created: ${branch.branch?.name??branchId}`)
 await waitOperations('branch creation')

 const endpoint=await neon('POST',`/projects/${projectId}/endpoints`,{endpoint:{branch_id:branchId,type:'read_write'}})
 const host=endpoint.endpoint?.host??endpoint.host
 if(!host)throw new Error('Neon endpoint creation returned no host')
 await waitOperations('endpoint creation')

 const roles=await neon('GET',`/projects/${projectId}/branches/${branchId}/roles`)
 const roleName=roles.roles?.[0]?.name??roles[0]?.name
 if(!roleName)throw new Error('no role available on ephemeral branch')
 const reset=await neon('POST',`/projects/${projectId}/branches/${branchId}/roles/${roleName}/reset_password`)
 const password=reset.password
 if(!password)throw new Error('role password reset returned no password')
 const databases=await neon('GET',`/projects/${projectId}/databases?branch_id=${branchId}`)
 const database=databases.databases?.[0]?.name??databases[0]?.name??'neondb'
 const psqlArgs=['-h',host,'-U',roleName,'-d',database,'-v','ON_ERROR_STOP=1','-q']
 const psqlEnv={...process.env,PGPASSWORD:password}
 console.log('Connection target resolved (credentials never logged)')

 const migrationsDir=new URL('../db/migrations/',import.meta.url)
 const files=(await readdir(migrationsDir)).filter(name=>name.endsWith('.sql')).sort()
 if(!files.length)throw new Error('db/migrations is empty')
 for(const file of files){
  const result=runPsql([...psqlArgs,'-f',file],{env:psqlEnv})
  if(result.status!==0)throw new Error(`migration ${file} failed on ephemeral branch:\n${(result.stderr||'').slice(0,500)}`)
 }
 console.log(`Applied ${files.length} canonical migrations on ephemeral branch`)

 let passed=0
 for(const contract of CONTRACTS){
  for(const query of contract.queries){
   if(query.execute===false){console.log(`Identity-only (runtime-compat dependency): ${contract.key}/${query.name}`);continue}
   if(!/^\s*(select|with)/i.test(query.sql))throw new Error(`${contract.key}/${query.name}: refusing to execute non-read-only SQL`)
   const result=runPsql([...psqlArgs,'-f','-'],{env:psqlEnv,input:query.sql})
   if(result.status!==0)throw new Error(`query ${contract.key}/${query.name} failed on ephemeral branch:\n${(result.stderr||'').slice(0,500)}`)
   passed+=1
   console.log(`Query PASS on ephemeral branch: ${contract.key}/${query.name}`)
  }
 }
 console.log(`Endpoint SQL contracts PASS: ${files.length} migrations + ${passed} endpoint queries verified against one ephemeral Neon branch`)
}catch(error){
 console.error('Endpoint SQL contracts FAILED')
 console.error(`- ${error instanceof Error?error.message:String(error)}`)
 process.exitCode=1
}finally{
 if(branchId&&!cleaned){
  try{
   await neon('DELETE',`/projects/${projectId}/branches/${branchId}`)
   cleaned=true
   console.log('Ephemeral branch deleted')
  }catch(error){
   console.error(`- WARNING: could not delete ephemeral branch ${branchId}: ${error instanceof Error?error.message:String(error)}`)
  }
 }
}

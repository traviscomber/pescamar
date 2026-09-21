// Pilot insights SQL contract — executes the exact read-only queries of
// api/pilot-insights.ts against an EPHEMERAL Neon branch created from the
// default branch, so invalid SQL (e.g. the reserved-word `day` alias that
// 500'd production) fails CI before deploy.
//
// Configuration (GitHub repo → Settings → Secrets and variables → Actions):
//   NEON_API_KEY      Secret. Neon console → API keys → create a project-scoped
//                     key for `pescamar-control` with edit scope (create/delete
//                     branches and endpoints is required). Never print it.
//   NEON_PROJECT_ID   Variable (not secret): `icy-union-17389410`.
// Without those two, the Neon phase SKIPS with a loud warning (bootstrap state);
// the drift check (phase 0) always runs and always fails CI on query drift.
//
// Flow: create branch → wait operations → create read_write endpoint → reset
// role password → apply all db/migrations canonically (psql -v ON_ERROR_STOP=1,
// the documented flow in db/README.md) → run the 5 canonical read-only queries →
// delete the branch in a finally block (even on failure).
// Requires psql (preinstalled on GitHub ubuntu runners). Never logs passwords
// or connection strings.

import {readdir,readFile} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import {QUERIES} from './pilot-insights-queries.mjs'

const failures=[]
const warn=(message)=>console.log(`- ${message}`)
const apiKey=process.env.NEON_API_KEY
const projectId=process.env.NEON_PROJECT_ID

// Phase 0 (always): the endpoint source must contain every canonical query verbatim.
// Line endings are normalized so CRLF checkouts on Windows do not false-positive.
const endpointSource=(await readFile(new URL('../api/pilot-insights.ts',import.meta.url),'utf8')).replace(/\r\n/g,'\n')
for(const query of QUERIES){
 if(!endpointSource.includes(query.sql.replace(/\r\n/g,'\n')))failures.push(`query ${query.name} drifted from api/pilot-insights.ts (update the endpoint or regenerate scripts/pilot-insights-queries.mjs)`)
}
if(failures.length){
 console.error('Pilot insights SQL contract FAILED (phase 0: source of truth drift)')
 for(const failure of failures)console.error(`- ${failure}`)
 process.exit(1)
}
console.log(`Phase 0 PASS: ${QUERIES.length} canonical queries match api/pilot-insights.ts verbatim`)

if(!apiKey||!projectId){
 console.log('Pilot insights SQL contract SKIPPED (Neon phase): NEON_API_KEY / NEON_PROJECT_ID not configured.')
 console.log('Loud bootstrap notice: add repo secret NEON_API_KEY (Neon console → API keys, project-scoped, edit scope)')
 console.log('and repo variable NEON_PROJECT_ID so this contract executes the endpoint SQL against an ephemeral branch.')
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
 const branch=await neon('POST',`/projects/${projectId}/branches`,{branch:{name:`ci-pilot-insights-${suffix}`}})
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

 for(const query of QUERIES){
  const result=runPsql([...psqlArgs,'-f','-'],{env:psqlEnv,input:query.sql})
  if(result.status!==0)throw new Error(`query ${query.name} failed on ephemeral branch:\n${(result.stderr||'').slice(0,500)}`)
  console.log(`Query PASS on ephemeral branch: ${query.name}`)
 }
 console.log(`Pilot insights SQL contract PASS: ${files.length} migrations + ${QUERIES.length} endpoint queries verified against an ephemeral Neon branch`)
}catch(error){
 console.error('Pilot insights SQL contract FAILED')
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

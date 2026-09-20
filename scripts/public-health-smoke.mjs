import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [health]=await Promise.all([
 readFile(new URL('../api/public-health.ts',import.meta.url),'utf8'),
])

assert(health.includes("PUBLIC_HEALTH_VERSION='pescamar.public-health.v1'"),'public health endpoint must be explicitly versioned')
assert(health.includes("res.setHeader('Cache-Control','no-store')"),'public health response must never be cached')
assert(health.includes("req.method!=='GET'")&&health.includes("res.status(405)"),'public health endpoint must be GET-only')
assert(health.includes("service:'pescamar'")&&health.includes("status:'live'"),'public health must expose liveness without operational state')
assert(!health.includes('requireOperator'),'public health endpoint must not require authentication')
assert(!/alerts|commit|summary|operator|organization/i.test(health.match(/res\.status\(200\)\.json\(([\s\S]*)\)/)?.[1]??''),'public health payload must not leak operational, deployment or identity details')
assert(!/\b(insert|update|delete)\s+(into|from|[a-z_]+\s+set)\b/i.test(health),'public health endpoint must not mutate data')

if(failures.length){
 console.error('Public health smoke FAILED')
 for(const failure of failures)console.error(`- ${failure}`)
 process.exit(1)
}
console.log('Public health smoke PASS: versioned, uncached, GET-only, unauthenticated liveness with zero sensitive payload verified')

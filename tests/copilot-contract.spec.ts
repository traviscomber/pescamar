import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path:string)=>readFile(path,'utf8')

test('Pescamar IA is an authenticated read-only gateway endpoint',async()=>{
 const [handler,context]=await Promise.all([read('api/copilot.ts'),read('api/_copilot-context.ts')])
 assert.match(handler,/requireOperator\(req\)/)
 assert.match(handler,/req\.method!==['"]POST['"]/)
 assert.match(handler,/gateway\(MODEL\)/)
 assert.match(handler,/AI_GATEWAY_API_KEY/)
 assert.match(handler,/VERCEL_OIDC_TOKEN/)
 assert.match(handler,/resolveCopilotPlant\(operator,body\.plantId\)/)
 assert.doesNotMatch(`${handler}\n${context}`,/\b(insert|update|delete)\s+(into|from|[a-z_]+\s+set)\b/i)
 assert.doesNotMatch(handler,/OPENAI_API_KEY|api\.openai\.com/)
})

test('canonical context is role and plant scoped before model invocation',async()=>{
 const context=await read('api/_copilot-context.ts')
 assert.match(context,/PLANT_IDS\.includes/)
 assert.match(context,/hasPlantAccess\(operator,plantId\)/)
 assert.match(context,/r\.plant_id=any\(\$\{plantIds\}::text\[\]\)/)
 assert.match(context,/o\.plant_id=any\(\$\{plantIds\}::text\[\]\)/)
 assert.match(context,/financial=\['admin','finance','operations'\]/)
 assert.match(context,/commercial=\['admin','finance','operations','viewer'\]/)
 assert.match(context,/corporateHistory=admin\|\|allowed\.length>=6/)
})

test('Pescamar IA distinguishes canonical packing evidence from live inventory',async()=>{
 const [handler,context]=await Promise.all([read('api/copilot.ts'),read('api/_copilot-context.ts')])
 assert.match(handler,/\[canonical_inventory\]/)
 assert.match(handler,/outsideCoverageLots/)
 assert.match(handler,/no lo llames fallo de match/)
 assert.match(context,/canonical_inventory/)
 assert.match(context,/outsideCoverageLots/)
 assert.match(context,/writesLiveInventory:false/)
 assert.match(context,/exact_lot_only; outside upstream coverage is not a failed match/)
})

test('assistant UI exposes evidence, scope and read-only boundaries',async()=>{
 const [page,app,access,os,vercel]=await Promise.all([read('src/pages/Copilot.tsx'),read('src/App.tsx'),read('src/access.ts'),read('src/os.ts'),read('vercel.json')])
 assert.match(page,/Evidencia consultada/)
 assert.match(page,/Sin escrituras ni acciones/)
 assert.match(page,/plantId:plantId\|\|null/)
 assert.match(app,/path="\/pescamar-ia"/)
 assert.match(access,/"\/pescamar-ia":"all"/)
 assert.match(os,/path:'\/pescamar-ia'/)
 assert.match(vercel,/"source": "\/pescamar-ia"/)
})

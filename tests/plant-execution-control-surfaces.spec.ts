import {readFile} from 'node:fs/promises'
import {expect,test} from '@playwright/test'

test('Plant Execution control surfaces are routed, authorized and directly reachable',async()=>{
 const [app,access,shell,vercel]=await Promise.all([
  readFile('src/App.tsx','utf8'),
  readFile('src/access.ts','utf8'),
  readFile('src/components/AppShell.tsx','utf8'),
  readFile('vercel.json','utf8'),
 ])
 for(const route of ['/pallets','/frio','/control-regulatorio']){
  expect(app).toContain(`path=\"${route}\"`)
  expect(access).toContain(`\"${route}\"`)
  expect(shell).toContain(`to:\"${route}\"`)
  expect(vercel).toContain(`\"source\": \"${route}\"`)
 }
})

test('control page operates existing Pallets, Cold Chain and Regulatory APIs instead of parallel state',async()=>{
 const page=await readFile('src/pages/PlantExecutionControl.tsx','utf8')
 for(const endpoint of ['/api/pallets','/api/packing-units','/api/cold-chain','/api/regulatory-holds'])expect(page).toContain(endpoint)
 for(const action of ['create','addUnit','close','upsertAsset','startRun','addLoad','recordObservation','completeRun','openHold','releaseHold','rejectHold'])expect(page).toContain(`action:'${action}'`)
 expect(page).not.toContain('localStorage')
})

test('available packing units are scoped, authenticated and exclude active pallet membership',async()=>{
 const api=await readFile('api/packing-units.ts','utf8')
 expect(api).toContain('requireOperator(req)')
 expect(api).toContain("u.status in ('packed','released')")
 expect(api).toContain('not exists(select 1 from pallet_packing_units')
 expect(api).toContain('operator.plantIds')
})

test('regulatory and cold controls keep writes behind their existing backend permissions',async()=>{
 const [regulatory,cold,pallets]=await Promise.all([
  readFile('api/regulatory-holds.ts','utf8'),
  readFile('api/cold-chain.ts','utf8'),
  readFile('api/pallets.ts','utf8'),
 ])
 expect(regulatory).toContain("const canResolve=(o:SessionOperator)=>['admin','quality'].includes(o.role)")
 expect(cold).toContain("const canOperate=(o:SessionOperator)=>['admin','operations','quality'].includes(o.role)")
 expect(pallets).toContain("const canOperate=(operator:SessionOperator)=>['admin','operations'].includes(operator.role)")
 for(const api of [regulatory,cold,pallets])expect(api).toContain("req.method==='POST'&&!writesEnabled()")
})

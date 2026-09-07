import {readFile} from 'node:fs/promises'
import {expect,test} from '@playwright/test'

test('Plant Execution control surfaces remain routed and authorized without direct sidebar exposure',async()=>{
 const [app,access,shell,modules,vercel]=await Promise.all([
  readFile('src/App.tsx','utf8'),
  readFile('src/access.ts','utf8'),
  readFile('src/components/AppShell.tsx','utf8'),
  readFile('src/pages/Modules.tsx','utf8'),
  readFile('vercel.json','utf8'),
 ])
 for(const route of ['/pallets','/frio','/control-regulatorio']){
  expect(app).toContain(`path="${route}"`)
  expect(access).toContain(`"${route}"`)
  expect(vercel).toContain(`"source": "${route}"`)
 }
 expect(shell).toContain('{to:"/frio",label:"Frío",step:6}')
 expect(shell).toContain('"/pallets"')
 expect(modules).toContain("{to:'/control-regulatorio',label:'Control regulatorio'")
 expect(shell).not.toContain('{to:"/pallets",label:')
 expect(app).toContain('import("./pages/RegulatoryControl")')
})

test('pallet and cold controls operate existing APIs without parallel state',async()=>{
 const page=await readFile('src/pages/PlantExecutionControl.tsx','utf8')
 for(const endpoint of ['/api/pallets','/api/packing-units','/api/cold-chain'])expect(page).toContain(endpoint)
 for(const action of ['create','addUnit','close','upsertAsset','startRun','addLoad','recordObservation','completeRun'])expect(page).toContain(`action:'${action}'`)
 expect(page).not.toContain('localStorage')
})

test('regulatory control covers lot pallet and box targets including palletized boxes',async()=>{
 const [page,targets]=await Promise.all([readFile('src/pages/RegulatoryControl.tsx','utf8'),readFile('api/regulatory-targets.ts','utf8')])
 expect(page).toContain('/api/regulatory-holds')
 expect(page).toContain('/api/regulatory-targets')
 expect(page).toContain('value="reception"')
 expect(page).toContain('value="pallet"')
 expect(page).toContain('value="unit"')
 expect(page).toContain("action:'openHold'")
 expect(page).toContain("resolve('releaseHold')")
 expect(page).toContain("resolve('rejectHold')")
 expect(targets).toContain('requireOperator(req)')
 expect(targets).toContain('active_pallet_code')
 expect(targets).toContain('operator.plantIds')
})

test('available packing units stay scoped and exclude active pallet membership',async()=>{
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

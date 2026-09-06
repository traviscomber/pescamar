import {expect,test} from '@playwright/test'

test('Control Tower puts attributable live Event Graph priority first',async({page})=>{
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  const json=(body:unknown)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)})
  if(path==='/api/auth')return json({ok:true,operator:{id:'qa-admin',fullName:'QA Admin',email:'admin@example.test',role:'admin',plantIds:['ancud'],organizationId:'pescamar'}})
  if(path==='/api/status')return json({ok:true,persistence:{database:true,files:true}})
  if(path==='/api/supplier-intelligence')return json({suppliers:[{supplier:'Proveedor QA',score:88,confidence:'alta',coverage:1,components:[]}]})
  if(path==='/api/supplier-economic-intelligence')return json({suppliers:[{supplier:'Proveedor QA',score:80}]})
  if(path==='/api/supplier-support-intelligence')return json({status:'ready',summary:{blocks:10,observations:10,autoLinkedBlocks:9,exceptions:1},suppliers:[{supplier:'Proveedor QA',physicalBlocks:10,autoLinkedBlocks:9,exceptions:1,unresolved:[]}]})
  if(path==='/api/plant-readiness')return json({plants:[{plantId:'ancud',score:82,completed:9,total:11,metrics:{receptions:4},checks:[]}]})
  if(path==='/api/operational-intelligence-overview')return json({ok:true,schemaVersion:'seafood.operational-intelligence.overview.v1',lots:4,counts:{p1:1,p2:2,p3:1},topSignals:[{receptionId:'11111111-1111-4111-8111-111111111111',receptionNumber:'REC-QA-01',plantId:'ancud',species:'Erizo',supplier:'Proveedor QA',latestAt:'2026-09-06T18:00:00.000Z',path:'/trazabilidad?mode=live&receptionId=11111111-1111-4111-8111-111111111111',signal:{priority:1,kind:'commercial-lineage',title:'Venta sin despacho visible',detail:'Existe una venta atribuible sin evento de despacho en la evidencia del lote.',confidence:'observed',action:'Reconciliar venta, despacho y documento antes de cierre comercial.',evidenceEventIds:['sale:qa'],blockers:['dispatch_evidence_missing']}}],boundary:{writesOperationalState:false,liveOnly:true,historicalIncluded:false}})
  if(path==='/api/daily-close')return json({ok:true,latest:null,history:[],metrics:{}})
  return json({ok:true,plants:[],items:[],history:[],rows:[],data:[],sources:[]})
 })
 await page.goto('/')
 await expect(page.getByRole('heading',{name:'Qué necesita atención ahora',exact:true})).toBeVisible()
 await expect(page.getByRole('heading',{name:'Venta sin despacho visible',exact:true})).toBeVisible()
 await expect(page.getByText('P1',{exact:true})).toBeVisible()
 await expect(page.getByText(/Recepción REC-QA-01 · ancud · Proveedor QA/)).toBeVisible()
 await expect(page.getByText(/Siguiente: Reconciliar venta, despacho y documento antes de cierre comercial/)).toBeVisible()
 await expect(page.getByText(/Bloquea: dispatch_evidence_missing/)).toBeVisible()
 await expect(page.getByText('2',{exact:true}).first()).toBeVisible()
 const priority=page.locator('a.decision-operational-priority')
 await expect(priority).toHaveAttribute('href',/\/trazabilidad\?mode=live&receptionId=/)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
})

test('Control Tower shows an honest zero-signal state',async({page})=>{
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  const json=(body:unknown)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)})
  if(path==='/api/auth')return json({ok:true,operator:{id:'qa-admin',fullName:'QA Admin',email:'admin@example.test',role:'admin',plantIds:['ancud'],organizationId:'pescamar'}})
  if(path==='/api/status')return json({ok:true,persistence:{database:true,files:true}})
  if(path==='/api/supplier-intelligence')return json({suppliers:[]})
  if(path==='/api/operational-intelligence-overview')return json({ok:true,schemaVersion:'seafood.operational-intelligence.overview.v1',lots:3,counts:{p1:0,p2:0,p3:0},topSignals:[],boundary:{writesOperationalState:false,liveOnly:true,historicalIncluded:false}})
  if(path==='/api/daily-close')return json({ok:true,latest:null,history:[],metrics:{}})
  return json({ok:true,suppliers:[],plants:[],items:[],history:[],rows:[],data:[],sources:[]})
 })
 await page.goto('/')
 await expect(page.getByText('Sin señales live en 3 lotes revisados',{exact:true})).toBeVisible()
 await expect(page.getByText(/El Event Graph no genera P1\/P2\/P3 dentro del alcance accesible actual/)).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
})

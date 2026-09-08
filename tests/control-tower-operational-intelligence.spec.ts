import {expect,test} from '@playwright/test'

test('Control Tower puts attributable live Event Graph priority first',async({page})=>{
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  const json=(body:unknown)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)})
  if(path==='/api/auth')return json({ok:true,operator:{id:'qa-admin',fullName:'QA Admin',email:'admin@example.test',role:'admin',plantIds:['ancud'],organizationId:'pescamar'}})
  if(path==='/api/status')return json({ok:true,persistence:{database:true,files:true}})
  if(path==='/api/supplier-intelligence')return json({suppliers:[{supplier:'Proveedor QA',score:88,confidence:'alta',coverage:100,components:[]}]})
  if(path==='/api/supplier-economic-intelligence')return json({suppliers:[{supplier:'Proveedor QA',score:80}]})
  if(path==='/api/supplier-support-intelligence')return json({status:'ready',summary:{blocks:10,observations:10,autoLinkedBlocks:9,exceptions:1},suppliers:[{supplier:'Proveedor QA',physicalBlocks:10,autoLinkedBlocks:9,exceptions:1,unresolved:[]}]})
  if(path==='/api/plant-readiness')return json({plants:[{plantId:'ancud',score:82,completed:9,total:11,metrics:{receptions:4},checks:[]}]})
  if(path==='/api/operational-intelligence-overview')return json({ok:true,schemaVersion:'seafood.operational-intelligence.overview.v1',lots:4,counts:{p1:1,p2:2,p3:1},topSignals:[{receptionId:'11111111-1111-4111-8111-111111111111',receptionNumber:'REC-QA-01',plantId:'ancud',species:'Erizo',supplier:'Proveedor QA',latestAt:'2026-09-06T18:00:00.000Z',path:'/lineage?mode=live&receptionId=11111111-1111-4111-8111-111111111111',signal:{priority:1,kind:'commercial-lineage',title:'Venta sin despacho visible',detail:'Existe una venta atribuible sin evento de despacho en la evidencia del lote.',confidence:'observed',action:'Reconciliar venta, despacho y documento antes de cierre comercial.',evidenceEventIds:['sale:qa'],blockers:['dispatch_evidence_missing']}}],boundary:{writesOperationalState:false,liveOnly:true,historicalIncluded:false}})
  if(path==='/api/daily-close')return json({ok:true,latest:null,history:[],metrics:{}})
  return json({ok:true,plants:[],items:[],history:[],rows:[],data:[],sources:[]})
 })
 await page.goto('/')
 const brief=page.getByRole('region',{name:'Qué requiere atención'})
 await expect(brief.getByRole('heading',{name:'Qué requiere atención',exact:true})).toBeVisible()
 await expect(brief.getByRole('heading',{name:'Venta sin despacho visible',exact:true})).toBeVisible()
 await expect(brief.getByText('Prioridad 1',{exact:true})).toBeVisible()
 await expect(brief.getByText(/Recepción REC-QA-01 · Proveedor QA/)).toBeVisible()
 await expect(brief.getByText(/Hacer: Reconciliar venta, despacho y documento antes de cierre comercial/)).toBeVisible()
 await expect(brief.getByText(/Bloquea: dispatch_evidence_missing/)).toBeVisible()
 await expect(brief.getByText('2',{exact:true}).first()).toBeVisible()
 const priority=brief.locator('a.decision-operational-priority')
 await expect(priority).toHaveAttribute('href',/\/es\/lineage\?mode=live&receptionId=/)
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
 const brief=page.getByRole('region',{name:'Qué requiere atención'})
 await expect(brief.getByText('Sin pendientes en 3 lotes',{exact:true})).toBeVisible()
 await expect(brief.getByText('No hay acciones pendientes ahora.',{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
})

import {expect,test,type Page} from '@playwright/test'

async function mockControlTower(page:Page){
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname
    const json=(body:unknown)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)})
    if(path==='/api/auth')return json({ok:true,operator:{id:'qa-admin',fullName:'QA Admin',email:'admin@example.test',role:'admin',plantIds:['ancud']}})
    if(path==='/api/status')return json({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa',checkedAt:new Date().toISOString()})
    if(path==='/api/receptions')return json({receptions:[]})
    if(path==='/api/history')return json({records:[],summary:null})
    if(path==='/api/plant-state')return json({ok:true,plants:[],history:[]})
    if(path==='/api/plant-performance')return json({plants:[],historicalPlants:[],closeMemory:[]})
    if(path==='/api/partners')return json({parties:[{id:'supplier-qa',kind:'supplier',legal_name:'Proveedor QA',tax_id:null,phone:null,contact_name:null,email:null,address:null,city:'Ancud',country:'Chile',payment_terms:null,notes:null,tags:[]}],suppliers:[{supplier_id:'supplier-qa',supplier:'Proveedor QA',receptions:3,received_kg:1200,contribution_clp:250000}],customers:[],purchases:[],invoices:[],permissions:{canWrite:true}})
    if(path==='/api/supplier-intelligence')return json({ok:true,summary:{suppliers:0,scored:0,preferred:0,highConfidence:0,canonicalLots:0,rowMassBalanceRows:0,rollforwardRows:0,massReviewRows:0},suppliers:[],method:{version:'supplier-score-v1',rule:'QA'}})
    if(path==='/api/supplier-support-intelligence')return json({ok:true,status:'not_imported',summary:{blocks:0,observations:0,autoLinkedBlocks:0,exceptions:0,suppliersWithSupport:0},suppliers:[],method:{version:'support-v2',rule:'QA'}})
    if(path==='/api/supplier-economic-intelligence')return json({ok:true,summary:{suppliers:0,scored:0,historicalScored:0,liveScored:0,mixed:0},suppliers:[],method:{version:'economic-v1',rule:'QA'}})
    if(path==='/api/communications')return json({channels:[],messages:[],permissions:{canReview:true}})
    if(path==='/api/timeline')return json({events:[],continuity:{historicalStart:'2025-01-01',historicalEnd:'2025-12-31',historicalRecords:394,voidRecords:1,live:false,total:394}})
    if(path==='/api/continuity-events')return json({events:[]})
    if(path==='/api/audit')return json({items:[],operators:[{id:'qa-admin',full_name:'QA Admin',role:'admin'}],permissions:{canSeeFinancial:true},range:{from:'2026-08-01',to:'2026-09-03'},nextCursor:null,generatedAt:'2026-09-03T12:00:00Z'})
    if(path==='/api/operational-health')return json({ok:true,status:'healthy',summary:{checks:3,healthy:3,degraded:0,stuck:0,broken:0,critical:0,warnings:0},checks:[{key:'data',label:'Fuentes canónicas',status:'healthy',detail:'Fuentes disponibles',metrics:{sources:3}},{key:'traceability',label:'Trazabilidad física',status:'healthy',detail:'Sin bloqueos',metrics:{holds:0}},{key:'platform',label:'Plataforma',status:'healthy',detail:'Runtime operativo',metrics:{ready:true}}],alerts:[],method:{version:'health-v2',staleProcessHours:24,scheduledHealthCheck:true},deployment:{environment:'test',commit:'qa123456'},checkedAt:'2026-09-03T12:00:00Z'})
    return json({})
  })
}

async function stable(page:Page){expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)}
async function noShadow(locator:ReturnType<Page['locator']>){expect(await locator.evaluate(el=>getComputedStyle(el).boxShadow)).toBe('none')}

test('plants keep entities explicit without floating-card shadow',async({page},testInfo)=>{
  await mockControlTower(page);await page.goto('/plantas')
  await expect(page.getByRole('heading',{name:'Plantas',exact:true})).toBeVisible()
  const cards=page.locator('.corporate-plant-card');await expect(cards.first()).toBeVisible();await noShadow(cards.first())
  await stable(page);await page.screenshot({path:testInfo.outputPath('plants-control-tower.png'),fullPage:true})
})

test('partners directory reads as a master-data ledger',async({page},testInfo)=>{
  await mockControlTower(page);await page.goto('/proveedores-clientes')
  await expect(page.getByRole('heading',{name:'Proveedores y clientes',exact:true})).toBeVisible()
  const directory=page.locator('.main-content > .panel').filter({has:page.locator('.compact-ledger')}).last();await expect(directory).toBeVisible();await noShadow(directory)
  await stable(page);await page.screenshot({path:testInfo.outputPath('partners-control-tower.png'),fullPage:true})
})

test('communications use an instrumentation matrix and continuous source surfaces',async({page},testInfo)=>{
  await mockControlTower(page);await page.goto('/comunicaciones/detalle')
  await expect(page.getByRole('heading',{name:'Comunicaciones',exact:true})).toBeVisible()
  const signals=page.locator('.communication-overview>.signal-card');await expect(signals).toHaveCount(6)
  if(testInfo.project.name==='desktop-chromium'){
    const tops=await signals.evaluateAll(items=>items.map(item=>Math.round(item.getBoundingClientRect().top)))
    expect(new Set(tops.slice(0,3)).size).toBe(1);expect(new Set(tops.slice(3,6)).size).toBe(1);expect(tops[0]).not.toBe(tops[3])
  }
  const channels=page.locator('.communications-channels'),inbox=page.locator('.communications-inbox');await expect(channels).toBeVisible();await expect(inbox).toBeVisible();await noShadow(channels);await noShadow(inbox)
  await stable(page);await page.screenshot({path:testInfo.outputPath('communications-control-tower.png'),fullPage:true})
})

test('timeline filters behave as infrastructure rather than a card',async({page},testInfo)=>{
  await mockControlTower(page);await page.goto('/timeline')
  await expect(page.getByRole('heading',{name:'Línea de tiempo',exact:true})).toBeVisible()
  const toolbar=page.locator('.timeline-toolbar');await expect(toolbar).toBeVisible();await noShadow(toolbar)
  await stable(page);await page.screenshot({path:testInfo.outputPath('timeline-control-tower.png'),fullPage:true})
})

test('audit filters and register form one continuous control surface',async({page},testInfo)=>{
  await mockControlTower(page);await page.goto('/auditoria')
  await expect(page.getByRole('heading',{name:'Auditoría operacional',exact:true})).toBeVisible()
  const filters=page.locator('.audit-filters'),register=page.locator('.audit-panel');await expect(filters).toBeVisible();await expect(register).toBeVisible();await noShadow(filters);await noShadow(register)
  await stable(page);await page.screenshot({path:testInfo.outputPath('audit-control-tower.png'),fullPage:true})
})

test('observability reads as a single expanded control plane',async({page},testInfo)=>{
  await mockControlTower(page);await page.goto('/observabilidad')
  await expect(page.getByRole('heading',{name:'Observabilidad y alertas',exact:true})).toBeVisible()
  const health=page.locator('.operational-health.expanded'),hero=health.locator('.operational-health-hero'),checks=health.locator('.operational-check');await expect(health).toBeVisible();await expect(checks).toHaveCount(3);await noShadow(hero);await noShadow(checks.first())
  await stable(page);await page.screenshot({path:testInfo.outputPath('observability-control-tower.png'),fullPage:true})
})

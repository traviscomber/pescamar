import {expect,test,type Page} from '@playwright/test'

async function mockFinanceApp(page:Page){
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname
    const json=(body:unknown)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)})
    if(path==='/api/auth')return json({ok:true,operator:{id:'qa-admin',fullName:'QA Admin',email:'admin@example.test',role:'admin',plantIds:['ancud']}})
    if(path==='/api/status')return json({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:1,pendingCredits:0,activeOperators:1,receptions:1},commit:'qa',checkedAt:new Date().toISOString()})
    if(path==='/api/sales-orders')return json({orders:[{id:'order-1',order_number:12,plant_id:'ancud',species:'Erizo',product:'Erizo IQF',committed_kg:100,price_per_kg_clp:8000,delivery_date:'2026-09-10',status:'pending',notes:null,customer:'Cliente QA',allocated_kg:40,produced_coverage_kg:20,allocations:[]}],lots:[],permissions:{canWrite:true}})
    if(path==='/api/partners')return json({parties:[{id:'supplier-1',kind:'supplier',legal_name:'Proveedor QA',active:true},{id:'customer-1',kind:'customer',legal_name:'Cliente QA',active:true}]})
    if(path==='/api/credits')return json({ok:true,credits:[]})
    if(path==='/api/settlements')return json({settlements:[],eligible:[{id:'rec-1',reception_number:1,plant_id:'ancud',guide_kg:120,accepted_kg:100,species:'Erizo',received_at:'2026-09-03T12:00:00Z',supplier:'Proveedor QA',credit_balance_clp:'0'}]})
    if(path==='/api/inventory')return json({lots:[{reception_id:'rec-1',reception_number:1,plant_id:'ancud',species:'Erizo',supplier:'Proveedor QA',availableToPromiseKg:100}]})
    if(path==='/api/transformation-costs')return json({costs:[],permissions:{canWrite:true}})
    if(path==='/api/profitability')return json({live:{suppliers:[],plants:[],customers:[]},historical:{suppliers:[],plants:[],customers:[],products:[]},documents:{purchase_orders:0,purchase_orders_clp:0,export_invoices:0,export_invoices_usd:0,export_kg:0,packing_boxes:0,packing_kg:0},coverage:{historical_rows:0,historical_flagged:0,stock_rows:0,account_rows:0,transfer_rows:0},sourceCoverage:[]})
    if(path==='/api/approvals')return json({items:[{entity_type:'settlement',entity_id:'settlement-1',reference:'LIQ-1',title:'Aprobar liquidación',detail:'Validar cierre económico del lote QA.',module:'Liquidaciones',owner:'Finanzas QA',created_at:'2026-09-03T12:00:00Z',reception_id:'rec-1'}]})
    if(path==='/api/receptions')return json({receptions:[]})
    if(path==='/api/history')return json({records:[],summary:null})
    return json({})
  })
}

async function stable(page:Page){expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)}

async function sameRowOnDesktop(locator:ReturnType<Page['locator']>,project:string){
  if(project!=='desktop-chromium')return
  const tops=await locator.evaluateAll(items=>items.map(item=>Math.round(item.getBoundingClientRect().top)))
  expect(new Set(tops).size).toBe(1)
}

async function expectNearTransparent(page:Page,selector:string){
  const alpha=await page.locator(selector).first().evaluate(el=>{
    const value=getComputedStyle(el).backgroundColor
    const match=value.match(/rgba?\([^,]+,[^,]+,[^,]+(?:,\s*([\d.]+))?\)/)
    return match?.[1]===undefined?1:Number(match[1])
  })
  expect(alpha).toBeLessThan(0.03)
}

test('sales orders reads as a demand ledger',async({page},testInfo)=>{
  await mockFinanceApp(page);await page.goto('/ordenes-venta')
  await expect(page.getByRole('heading',{name:'Órdenes de venta',exact:true})).toBeVisible()
  const workspace=page.locator('.signal-grid + .panel').first()
  await expect(workspace.getByRole('table')).toBeVisible()
  expect(await workspace.evaluate(el=>getComputedStyle(el).boxShadow)).toBe('none')
  await expectNearTransparent(page,'.signal-grid + .panel')
  await stable(page);await page.screenshot({path:testInfo.outputPath('sales-orders-finance.png'),fullPage:true})
})

test('credits summary is one continuous financial rail',async({page},testInfo)=>{
  await mockFinanceApp(page);await page.goto('/creditos')
  await expect(page.getByRole('heading',{name:'Créditos y anticipos',exact:true})).toBeVisible()
  const metrics=page.locator('.credit-summary>article');await expect(metrics).toHaveCount(4);await sameRowOnDesktop(metrics,testInfo.project.name)
  expect(await page.locator('.credit-accounts').evaluate(el=>getComputedStyle(el).boxShadow)).toBe('none')
  await stable(page);await page.screenshot({path:testInfo.outputPath('credits-finance.png'),fullPage:true})
})

test('settlement summary and calculation avoid nested metric cards',async({page},testInfo)=>{
  await mockFinanceApp(page);await page.goto('/liquidaciones')
  await expect(page.getByRole('heading',{name:'Liquidaciones',exact:true})).toBeVisible()
  const summary=page.locator('.settlement-summary>article');await expect(summary).toHaveCount(4);await sameRowOnDesktop(summary,testInfo.project.name)
  const calculation=page.locator('.settlement-calculation>div');await expect(calculation).toHaveCount(5)
  expect(await calculation.first().evaluate(el=>getComputedStyle(el).boxShadow)).toBe('none')
  await stable(page);await page.screenshot({path:testInfo.outputPath('settlements-finance.png'),fullPage:true})
})

test('transformation costs use a control bar and ledger surface',async({page},testInfo)=>{
  await mockFinanceApp(page);await page.goto('/costos-transformacion/detalle')
  await expect(page.getByRole('heading',{name:'Transformación',exact:true})).toBeVisible()
  const selector=page.locator('.main-content>.panel').filter({has:page.locator('.inline-field')}).first();await expect(selector).toBeVisible()
  expect(await selector.evaluate(el=>getComputedStyle(el).boxShadow)).toBe('none')
  const ledger=page.locator('.signal-grid + .panel').last();expect(await ledger.evaluate(el=>getComputedStyle(el).boxShadow)).toBe('none')
  await stable(page);await page.screenshot({path:testInfo.outputPath('transformation-finance.png'),fullPage:true})
})

test('profitability reads as report sections rather than stacked cards',async({page},testInfo)=>{
  await mockFinanceApp(page);await page.goto('/rentabilidad/detalle')
  await expect(page.getByRole('heading',{name:'Desempeño y rentabilidad',exact:true})).toBeVisible()
  const reports=page.locator('.event-kind-tabs ~ .panel');await expect(reports).toHaveCount(3)
  expect(await reports.first().evaluate(el=>getComputedStyle(el).boxShadow)).toBe('none')
  await stable(page);await page.screenshot({path:testInfo.outputPath('profitability-finance.png'),fullPage:true})
})

test('decision cards retain boundaries without floating-card shadow',async({page},testInfo)=>{
  await mockFinanceApp(page);await page.goto('/aprobaciones')
  await expect(page.getByRole('heading',{name:'Bandeja de decisiones',exact:true})).toBeVisible()
  const toolbar=page.locator('.decision-toolbar'),card=page.locator('.approval-card-v2').first();await expect(card).toBeVisible()
  expect(await toolbar.evaluate(el=>getComputedStyle(el).boxShadow)).toBe('none')
  expect(await card.evaluate(el=>getComputedStyle(el).boxShadow)).toBe('none')
  await stable(page);await page.screenshot({path:testInfo.outputPath('approvals-finance.png'),fullPage:true})
})

import {expect,test,type Page} from '@playwright/test'

async function mockOperationalApp(page:Page){
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname
    const json=(body:unknown)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)})
    if(path==='/api/auth')return json({ok:true,operator:{id:'qa-operations',fullName:'QA Operations',email:'operations@example.test',role:'operations',plantIds:['ancud']}})
    if(path==='/api/receptions')return json({receptions:[]})
    if(path==='/api/history')return json({records:[],summary:{total:0,guide_kg:0,received_kg:0,flagged:0}})
    if(path==='/api/status')return json({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa',checkedAt:new Date().toISOString()})
    if(path==='/api/production-lines')return json({lines:[]})
    if(path==='/api/operations-overview')return json({balances:[],inventory:{coverage:'test',items:[],summary:{totalKg:0,rawKg:0,processedKg:0}},economics:{marginAvailable:false,reason:'test',historicalCoverage:{operationalRecords:0,pricedRecords:0,pricedPct:0,pricedKg:0,rawMaterialCostClp:0},historicalBySupplier:[]}})
    if(path==='/api/commercial')return json({lots:[],dispatches:[],sales:[],permissions:{canDispatch:true,canSell:true}})
    if(path==='/api/partners')return json({parties:[]})
    if(path==='/api/sea-urchin-process')return json({runs:[],candidates:[],documents:[],permissions:{canWrite:true}})
    return json({})
  })
}

async function expectStableViewport(page:Page){
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
}

test('receptions reads as one continuous operational workspace',async({page},testInfo)=>{
  await mockOperationalApp(page)
  await page.goto('/recepciones')
  await expect(page.getByRole('heading',{name:'Recepciones',exact:true})).toBeVisible()
  const workspace=page.locator('.receptions-workspace')
  await expect(workspace).toBeVisible()
  expect(await workspace.evaluate(el=>getComputedStyle(el).boxShadow)).toBe('none')
  expect(await workspace.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)')
  await expectStableViewport(page)
  await page.screenshot({path:testInfo.outputPath('receptions-operational.png'),fullPage:true})
})

test('production puts current lots before analytical context',async({page},testInfo)=>{
  await mockOperationalApp(page)
  await page.goto('/lineas')
  await expect(page.getByRole('heading',{name:'Producción por lote',exact:true})).toBeVisible()
  const workspace=page.locator('.production-workspace'),balance=page.locator('.balance-panel')
  await expect(workspace).toBeVisible();await expect(balance).toBeVisible()
  const [workBox,balanceBox]=await Promise.all([workspace.boundingBox(),balance.boundingBox()])
  expect(workBox&&balanceBox?workBox.y<balanceBox.y:false).toBe(true)
  expect(await workspace.evaluate(el=>getComputedStyle(el).boxShadow)).toBe('none')
  await expectStableViewport(page)
  await page.screenshot({path:testInfo.outputPath('production-operational.png'),fullPage:true})
})

test('commercial KPIs form a continuous rail',async({page},testInfo)=>{
  await mockOperationalApp(page)
  await page.goto('/despachos-ventas')
  await expect(page.getByRole('heading',{name:'Despachos y ventas',exact:true})).toBeVisible()
  const cards=page.locator('.commercial-summary>article')
  await expect(cards).toHaveCount(4)
  if(testInfo.project.name==='desktop-chromium'){
    const boxes=await cards.evaluateAll(items=>items.map(item=>item.getBoundingClientRect().top))
    expect(new Set(boxes.map(value=>Math.round(value))).size).toBe(1)
  }
  expect(await cards.first().evaluate(el=>getComputedStyle(el).boxShadow)).toBe('none')
  await expectStableViewport(page)
  await page.screenshot({path:testInfo.outputPath('commercial-operational.png'),fullPage:true})
})

test('quality process selector behaves as a control bar',async({page},testInfo)=>{
  await mockOperationalApp(page)
  await page.goto('/proceso-erizo')
  await expect(page.getByRole('heading',{name:'Erizo · Control de proceso',exact:true})).toBeVisible()
  const selector=page.locator('.signal-grid + .panel').first()
  await expect(selector).toBeVisible()
  expect(await selector.evaluate(el=>getComputedStyle(el).boxShadow)).toBe('none')
  expect(await selector.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)')
  await expectStableViewport(page)
  await page.screenshot({path:testInfo.outputPath('quality-operational.png'),fullPage:true})
})

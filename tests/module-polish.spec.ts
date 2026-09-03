import {expect,test,type Page} from '@playwright/test'

async function mockOperations(page:Page){
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname
    if(path==='/api/auth')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,operator:{id:'qa-operations',fullName:'QA Operaciones',email:'operations@example.test',role:'operations',plantIds:['ancud']}})})
    if(path==='/api/receptions')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({receptions:[]})})
    if(path==='/api/history')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({records:[],summary:{total:0,guide_kg:0,received_kg:0,flagged:0}})})
    if(path==='/api/status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa',checkedAt:new Date().toISOString()})})
    if(path==='/api/production-lines')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({lines:[]})})
    if(path==='/api/operations-overview')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({balances:[],inventory:{coverage:'live',items:[],summary:{totalKg:0,rawKg:0,processedKg:0}},economics:{marginAvailable:false,reason:'Sin ventas vinculadas',historicalCoverage:{operationalRecords:0,pricedRecords:0,pricedPct:0,pricedKg:0,rawMaterialCostClp:0},historicalBySupplier:[]}})})
    if(path==='/api/inventory')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({locations:[],lots:[],movements:[],permissions:{canWrite:true}})})
    if(path==='/api/canonical-inventory-evidence')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({stock:[],packing:[],lotLinks:[],summary:{stockRows:0,packingBoxes:0,packingKg:0,packingLots:0,matchedLots:0,unmatchedLots:0},governance:{rule:'Evidencia separada'}})})
    return route.fulfill({status:200,contentType:'application/json',body:'{}'})
  })
}

test('820px shell uses the navigation drawer instead of an icon-only rail',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium','Tablet-width regression is exercised once on Chromium')
  await page.setViewportSize({width:820,height:900})
  await mockOperations(page)
  await page.goto('/lineas')
  const trigger=page.getByRole('button',{name:'Abrir menú'})
  await expect(trigger).toBeVisible()
  const sidebar=page.locator('.sidebar')
  expect(await sidebar.evaluate(element=>getComputedStyle(element).position)).toBe('fixed')
  expect(await sidebar.evaluate(element=>Number.parseFloat(getComputedStyle(element).width))).toBeLessThanOrEqual(320)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
  await trigger.click()
  await expect(sidebar).toHaveClass(/is-open/)
  await expect(page.getByRole('link',{name:'Recepciones'})).toBeVisible()
  await expect(page.getByRole('button',{name:'Cerrar menú'})).toBeVisible()
  await page.screenshot({path:testInfo.outputPath('tablet-production-drawer.png'),fullPage:true})
})

test('production live workspace precedes analytical balance and nested KPI framing is flat',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium','Visual hierarchy contract is exercised once on Chromium')
  await mockOperations(page)
  await page.goto('/lineas')
  const workspace=page.locator('.production-workspace'),balance=page.locator('.balance-panel')
  await expect(workspace).toBeVisible()
  await expect(balance).toBeVisible()
  const [workspaceBox,balanceBox]=await Promise.all([workspace.boundingBox(),balance.boundingBox()])
  expect(workspaceBox&&balanceBox?workspaceBox.y<balanceBox.y:false).toBe(true)
  const firstKpi=balance.locator('.balance-summary>div').first()
  expect(await firstKpi.evaluate(element=>getComputedStyle(element).borderRadius)).toBe('0px')
  expect(await firstKpi.evaluate(element=>getComputedStyle(element).backgroundColor)).toBe('rgba(0, 0, 0, 0)')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
  await page.screenshot({path:testInfo.outputPath('production-live-before-analysis.png'),fullPage:true})
})

test('inventory live position precedes canonical read-only evidence',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium','Visual hierarchy contract is exercised once on Chromium')
  await mockOperations(page)
  await page.goto('/inventario')
  const workspace=page.locator('.inventory-workspace'),evidence=page.locator('.canonical-inventory-evidence')
  await expect(workspace).toBeVisible()
  await expect(evidence).toBeVisible()
  const [workspaceBox,evidenceBox]=await Promise.all([workspace.boundingBox(),evidence.boundingBox()])
  expect(workspaceBox&&evidenceBox?workspaceBox.y<evidenceBox.y:false).toBe(true)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
  await page.screenshot({path:testInfo.outputPath('inventory-live-before-evidence.png'),fullPage:true})
})

test('reception provenance band remains secondary and unframed',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium','Visual hierarchy contract is exercised once on Chromium')
  await mockOperations(page)
  await page.goto('/recepciones')
  const band=page.locator('.data-continuity-banner.compact')
  await expect(band).toBeVisible()
  expect(await band.evaluate(element=>getComputedStyle(element).borderRadius)).toBe('0px')
  expect(await band.evaluate(element=>getComputedStyle(element).backgroundColor)).toBe('rgba(0, 0, 0, 0)')
  await page.screenshot({path:testInfo.outputPath('receptions-provenance-band.png'),fullPage:true})
})

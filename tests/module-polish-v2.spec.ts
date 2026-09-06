import {expect,test,type Page} from '@playwright/test'

async function mockAdmin(page:Page){
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  if(path==='/api/auth')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,operator:{id:'qa-admin',fullName:'QA Admin',email:'admin@example.test',role:'admin',plantIds:[]}})})
  if(path==='/api/receptions')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({receptions:[]})})
  if(path==='/api/status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa',checkedAt:new Date().toISOString()})})
  if(path==='/api/profitability')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({historical:{suppliers:[{supplier:'Proveedor QA',lots:3,received_kg:1200,difference_kg:4,flagged_rows:1,first_date:'2025-04-03T00:00:00.000Z',last_date:'2026-07-13T00:00:00.000Z'}],plants:[],customers:[],products:[]},live:{suppliers:[],plants:[],customers:[]},documents:{purchase_orders:1,export_invoices:1,export_kg:100,packing_boxes:20,packing_kg:400},coverage:{historical_rows:3,account_rows:4}})})
  if(path==='/api/operational-health')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:'degraded',summary:{checks:1,healthy:0,degraded:1,stuck:0,broken:0,critical:0,warnings:1},method:{version:'operations-health-v3-communications-readiness',staleProcessHours:24,scheduledHealthCheck:true},deployment:{environment:'preview',commit:'2a47838f1550e51c42eba9e5dcd38f6223f9fb03'},checkedAt:'2026-09-03T04:30:00.000Z',alerts:[],checks:[{key:'sources',label:'Fuentes canónicas',status:'degraded',detail:'Cobertura parcial.',metrics:{files:3,lastIngestedAt:'2026-08-26T22:05:00.000Z'}}]})})
  if(path==='/api/credits')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,credits:[]})})
  if(path==='/api/canonical-finance-evidence')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ledger:{rows:0,flagged:0,inflow_clp:0,outflow_clp:0,final_balance_clp:0},transfers:{rows:0,flagged:0,amount_clp:0},matching:{transfers:0,exact_matches:0,unmatched:0,ambiguous:0,exact_match_amount_clp:0},governance:{rule:'Evidencia separada'}})})
  return route.fulfill({status:200,contentType:'application/json',body:'{}'})
 })
}

test('profitability renders source date ranges as locale dates rather than raw ISO',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop-chromium','Management visual contract is exercised once on Chromium')
 await mockAdmin(page)
 await page.goto('/rentabilidad/detalle')
 await expect(page.getByText('Proveedor QA',{exact:true})).toBeVisible()
 const row=page.getByText('Proveedor QA',{exact:true}).locator('xpath=ancestor::tr')
 await expect(row).not.toContainText('T00:00:00')
 await expect(row).toContainText(/03[-/]04[-/]2025.*13[-/]07[-/]2026/)
 await page.screenshot({path:testInfo.outputPath('profitability-localized-dates.png'),fullPage:true})
})

test('observability humanizes health contract, commit and timestamp values',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop-chromium','Management visual contract is exercised once on Chromium')
 await mockAdmin(page)
 await page.goto('/observabilidad')
 await expect(page.getByText('Health v3')).toBeVisible()
 await expect(page.getByText('2a47838f')).toBeVisible()
 await expect(page.getByRole('heading',{name:/Degradado · 0 críticas · 1 advertencias/})).toBeVisible()
 await expect(page.locator('body')).not.toContainText('operations-health-v3-communications-readiness')
 await expect(page.locator('body')).not.toContainText('T22:05:00')
 await page.screenshot({path:testInfo.outputPath('observability-humanized-diagnostics.png'),fullPage:true})
})

test('module navigation resets the workspace to the top',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop-chromium','Route scroll contract is exercised once on Chromium')
 await mockAdmin(page)
 await page.goto('/rentabilidad')
 await page.addStyleTag({content:'.main-content{min-height:3200px!important}'})
 await page.evaluate(()=>window.scrollTo(0,1200))
 await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeGreaterThan(500)
 await page.getByRole('link',{name:'Créditos y anticipos'}).press('Enter')
 await expect(page).toHaveURL(/\/creditos$/)
 await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBe(0)
 await page.screenshot({path:testInfo.outputPath('route-scroll-reset.png'),fullPage:false})
})

test('360px management surfaces keep the viewport free of accidental horizontal overflow',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop-chromium','Exact 360px contract is exercised once on Chromium')
 await page.setViewportSize({width:360,height:800})
 await mockAdmin(page)
 for(const path of ['/rentabilidad','/observabilidad']){
  await page.goto(path)
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true)
 }
 await page.screenshot({path:testInfo.outputPath('management-360px.png'),fullPage:true})
})

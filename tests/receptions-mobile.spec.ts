import {expect,test} from '@playwright/test'

const operator={id:'qa-recepcion',fullName:'QA Recepcion',email:'reception@example.test',role:'operations',plantIds:['ancud']}

const receptions=[{
  id:'11111111-1111-4111-8111-111111111111',
  reception_number:321,
  plant_id:'ancud',
  supplier:'Pesquera Austral QA',
  species:'Erizo',
  extraction_zone:'Sector QA',
  source_reference:'GUIA-778899',
  guide_kg:'12450.5',
  gross_kg:'12680.2',
  tare_kg:'180.0',
  drained_kg:null,
  accepted_kg:'12480.6',
  temperature_c:'4.2',
  quality_status:'Muestreo',
  evidence_count:1,
  evidence:[{url:'/evidencia/1.png'}],
  received_at:new Date().toISOString(),
},{
  id:'22222222-2222-4222-8222-222222222222',
  reception_number:322,
  plant_id:'ancud',
  supplier:'Maricultura del Sur',
  species:'Loco',
  extraction_zone:'Canal Moraleda',
  source_reference:null,
  guide_kg:'9800.0',
  gross_kg:'9745.4',
  tare_kg:'150.0',
  drained_kg:null,
  accepted_kg:'9595.4',
  temperature_c:'3.8',
  quality_status:'Clasificado',
  evidence_count:0,
  evidence:[],
  received_at:new Date().toISOString(),
}]

async function mockApis(page:import('@playwright/test').Page){
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname
    if(path==='/api/auth')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,operator})})
    if(path==='/api/receptions')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({receptions})})
    if(path==='/api/history')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({records:[],summary:null})})
    if(path==='/api/status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:2},commit:'qa',checkedAt:new Date().toISOString()})})
    return route.fulfill({status:200,contentType:'application/json',body:'{}'})
  })
}

test('recepciones mobile lot cards keep numeric columns inside a 412px viewport',async({page},testInfo)=>{
  await page.setViewportSize({width:412,height:915})
  await mockApis(page)
  await page.goto('/recepciones')

  const table=page.locator('.receptions-workspace .lot-table-responsive')
  await expect(table).toBeVisible()
  await expect(page.getByRole('button',{name:'REC-321',exact:true})).toBeVisible()

  // No page-level horizontal scroll on a 412px viewport.
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)
  expect(overflow).toBe(false)

  // Every card and every numeric cell stays within the viewport.
  const viewportWidth=412
  const box=await table.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x+box!.width).toBeLessThanOrEqual(viewportWidth+1)
  const cells=table.locator('td.numeric')
  const cellCount=await cells.count()
  expect(cellCount).toBeGreaterThan(0)
  for(let index=0;index<cellCount;index+=1){
    const cellBox=await cells.nth(index).boundingBox()
    expect(cellBox).not.toBeNull()
    expect(cellBox!.x).toBeGreaterThanOrEqual(0)
    expect(cellBox!.x+cellBox!.width).toBeLessThanOrEqual(viewportWidth+1)
  }

  await page.screenshot({path:testInfo.outputPath('recepciones-mobile-cards.png'),fullPage:true})
})

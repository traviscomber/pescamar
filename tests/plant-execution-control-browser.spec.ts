import {expect,test,type Page} from '@playwright/test'

async function mockPlantExecution(page:Page){
 const consoleErrors:string[]=[]
 page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())})
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  const json=(body:unknown)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)})
  if(path==='/api/auth')return json({ok:true,operator:{id:'qa-admin',fullName:'QA Admin',email:'admin@example.test',role:'admin',plantIds:['ancud','quellon']}})
  if(path==='/api/receptions')return json({receptions:[]})
  if(path==='/api/history')return json({records:[],summary:null})
  if(path==='/api/status')return json({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa',checkedAt:new Date().toISOString()})
  if(path==='/api/pallets')return json({ok:true,writesEnabled:true,pallets:[]})
  if(path==='/api/packing-units')return json({ok:true,units:[]})
  if(path==='/api/cold-chain')return json({ok:true,writesEnabled:true,assets:[],runs:[]})
  if(path==='/api/regulatory-holds')return json({ok:true,writesEnabled:true,holds:[]})
  return json({})
 })
 return consoleErrors
}

for(const surface of [
 {path:'/pallets/detalle',heading:'Palletización'},
 {path:'/frio/detalle',heading:'Cadena de frío'},
 {path:'/control-regulatorio',heading:'Control regulatorio'},
]){
 test(`${surface.path} renders as an authenticated Plant Execution control on desktop and mobile`,async({page},testInfo)=>{
  const consoleErrors=await mockPlantExecution(page)
  await page.goto(surface.path)
  await expect(page.getByRole('heading',{name:surface.heading,exact:true})).toBeVisible()
  const pageNav=page.locator('#main-content').locator('.row-actions').first()
  await expect(pageNav.getByRole('link',{name:'Piso / packing'})).toBeVisible()
  await expect(pageNav.getByRole('link',{name:'Pallets'})).toBeVisible()
  await expect(pageNav.getByRole('link',{name:'Cadena de frío'})).toBeVisible()
  await expect(pageNav.getByRole('link',{name:'Regulatorio'})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
  expect(consoleErrors).toEqual([])
  await page.screenshot({path:testInfo.outputPath(`${surface.heading.replaceAll(' ','-').toLowerCase()}.png`),fullPage:true})
 })
}

import {readFile} from 'node:fs/promises'
import {expect,test,type Page} from '@playwright/test'

test('station administration reuses canonical Plant Execution API and stays admin-only',async()=>{
 const [page,api,access,app,vercel]=await Promise.all([
  readFile('src/pages/PlantStations.tsx','utf8'),
  readFile('api/plant-stations.ts','utf8'),
  readFile('src/access.ts','utf8'),
  readFile('src/App.tsx','utf8'),
  readFile('vercel.json','utf8'),
 ])
 expect(page).toContain("'/api/plant-stations'")
 expect(page).toContain("action:'upsertStation'")
 expect(page).toContain("action:'upsertDevice'")
 expect(api).toContain("if(operator.role!=='admin')")
 expect(access).toContain('"/estaciones":["admin"]')
 expect(app).toContain('path="/estaciones"')
 expect(vercel).toContain('"source": "/estaciones"')
})

async function mock(page:Page,role:'admin'|'operations'){
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  const json=(body:unknown)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)})
  if(path==='/api/auth')return json({ok:true,operator:{id:`qa-${role}`,fullName:`QA ${role}`,email:`${role}@example.test`,role,plantIds:['ancud']}})
  if(path==='/api/receptions')return json({receptions:[]})
  if(path==='/api/history')return json({records:[],summary:null})
  if(path==='/api/status')return json({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa',checkedAt:new Date().toISOString()})
  if(path==='/api/plant-stations')return json({ok:true,writesEnabled:true,stations:[]})
  return json({})
 })
}

test('admin can open station administration without overflow or console errors',async({page},testInfo)=>{
 const consoleErrors:string[]=[]
 page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())})
 await mock(page,'admin')
 await page.goto('/estaciones')
 await expect(page.getByRole('heading',{name:'Estaciones y dispositivos',exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'Guardar estación'})).toBeVisible()
 await expect(page.getByRole('button',{name:'Guardar dispositivo'})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
 expect(consoleErrors).toEqual([])
 await page.screenshot({path:testInfo.outputPath('plant-stations.png'),fullPage:true})
})

test('operations cannot enter station administration',async({page})=>{
 await mock(page,'operations')
 await page.goto('/estaciones')
 await expect(page).toHaveURL(/\/$/)
 await expect(page.getByRole('heading',{name:'Estaciones y dispositivos',exact:true})).toHaveCount(0)
})

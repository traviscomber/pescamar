import {expect,test,type Page} from '@playwright/test'

const sharedPlant={id:'ancud',name:'Ancud Compartida QA',location:'Ancud · estado compartido',mode:'Propia',products:['Erizo QA'],sourceStatus:'unlinked',active:true}
type MockOptions={role?:'admin'|'operations';plantStateFails?:boolean}

async function mock(page:Page,options:MockOptions={}){
 const role=options.role??'admin',plantIds=role==='admin'?['ancud','quellon','iquique','piedra-azul','aqua-austral','natales']:['ancud']
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  const json=(body:unknown,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)})
  if(path==='/api/auth')return json({ok:true,operator:{id:`qa-${role}`,fullName:`QA ${role}`,email:`${role}@example.test`,role,plantIds}})
  if(path==='/api/status')return json({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa-plant-degradation',checkedAt:new Date().toISOString()})
  if(path==='/api/receptions')return json({receptions:[]})
  if(path==='/api/history')return json({records:[],summary:{total:0,guide_kg:0,received_kg:0,flagged:0}})
  if(path==='/api/plant-state')return options.plantStateFails?json({ok:false,error:'Estado compartido temporalmente no disponible'},503):json({ok:true,plants:[sharedPlant],history:[],updatedAt:'2026-09-02T00:00:00.000Z'})
  if(path==='/api/plant-performance')return json({ok:false,error:'Analítica temporalmente no disponible'},503)
  return json({ok:true})
 })
}

test('plant control preserves shared state when performance analytics fail',async({page},testInfo)=>{
 await mock(page)
 await page.goto('/plantas')
 await expect(page.getByRole('heading',{name:'Plantas',exact:true})).toBeVisible()
 await expect(page.getByRole('heading',{name:'Ancud Compartida QA'})).toBeVisible()
 await expect(page.getByText('Analítica temporalmente no disponible',{exact:true})).toBeVisible()
 await expect(page.getByRole('heading',{name:'Planta Ancud',exact:true})).toHaveCount(0)
 await page.getByRole('link',{name:/Ancud Compartida QA/}).click()
 await expect(page).toHaveURL(/\/plantas\/ancud$/)
 await expect(page.getByRole('heading',{name:'Ancud Compartida QA'})).toBeVisible()
 await expect(page.getByText('Analítica temporalmente no disponible',{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
 await page.screenshot({path:testInfo.outputPath('plant-control-partial-degradation.png'),fullPage:true})
})

test('plant fallback remains scoped when shared state is unavailable',async({page})=>{
 await mock(page,{role:'operations',plantStateFails:true})
 await page.goto('/plantas')
 await expect(page.getByText(/Estado compartido temporalmente no disponible/)).toBeVisible()
 await expect(page.getByRole('heading',{name:'Planta Ancud',exact:true})).toBeVisible()
 await expect(page.getByRole('heading',{name:'Planta Quellón',exact:true})).toHaveCount(0)
 await expect(page.getByRole('heading',{name:'Planta Iquique',exact:true})).toHaveCount(0)
})

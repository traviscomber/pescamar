import {expect,test,type Page} from '@playwright/test'

type Role='admin'|'operations'|'finance'|'quality'|'viewer'

type PublicHealthMock={status:number;body:unknown}
const healthy:PublicHealthMock={status:200,body:{ok:true,service:'pescamar',status:'live',healthVersion:'pescamar.public-health.v1',checkedAt:'2026-09-20T15:00:00.000Z'}}

async function mock(page:Page,role:Role='admin',publicHealth:PublicHealthMock=healthy){
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  const json=(body:unknown,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)})
  if(path==='/api/auth')return json({ok:true,operator:{id:`qa-${role}`,fullName:`QA ${role}`,email:`${role}@example.test`,role,plantIds:['ancud']}})
  if(path==='/api/status')return json({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa12345',checkedAt:'2026-09-20T15:00:00.000Z'})
  if(path==='/api/public-health')return json(publicHealth.body,publicHealth.status)
  return json({ok:true})
 })
}

test('admin sees production health with deployment info and live ok status',async({page},testInfo)=>{
 await mock(page,'admin')
 await page.goto('/admin/salud')
 await expect(page.getByRole('heading',{name:'Salud de producción'})).toBeVisible()
 const deployment=page.getByLabel('Información de despliegue')
 await expect(deployment.getByText('qa12345',{exact:true})).toBeVisible()
 await expect(deployment.getByText('test',{exact:true})).toBeVisible()
 const live=page.getByLabel('Estado en vivo del servicio público')
 await expect(live.getByText('Operativa',{exact:true})).toBeVisible()
 await expect(live.getByText('200',{exact:true})).toBeVisible()
 await expect(live.getByText(/\d+ ms/)).toBeVisible()
 await expect(live.getByText(/\d{2}-\d{2}-\d{4}/)).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
 await page.screenshot({path:testInfo.outputPath('admin-salud-ok.png'),fullPage:true})
})

test('live status falls to caída when public health is unreachable',async({page},testInfo)=>{
 await mock(page,'admin',{status:503,body:{ok:false,status:'unavailable'}})
 await page.goto('/admin/salud')
 const live=page.getByLabel('Estado en vivo del servicio público')
 await expect(live.getByText('Caída',{exact:true})).toBeVisible()
 await expect(live.getByText('503',{exact:true})).toBeVisible()
 await page.screenshot({path:testInfo.outputPath('admin-salud-down.png'),fullPage:true})
})

test('finance is redirected away from admin health page',async({page})=>{
 await mock(page,'finance')
 await page.goto('/admin/salud')
 await expect(page).toHaveURL(/\/es\/?$/)
 await expect(page.getByRole('heading',{name:'Salud de producción'})).toHaveCount(0)
})

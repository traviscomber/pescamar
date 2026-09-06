import {expect,test,type Page} from '@playwright/test'

type Role='admin'|'viewer'
async function mockApp(page:Page,role:Role){
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  if(path==='/api/auth')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,operator:{id:`qa-${role}`,fullName:`QA ${role}`,email:`${role}@example.test`,role,plantIds:role==='admin'?[]:['ancud']}})})
  if(path==='/api/status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,persistence:{database:true,files:true},metrics:{}})})
  if(path==='/api/receptions')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({receptions:[]})})
  return route.fulfill({status:200,contentType:'application/json',body:'{}'})
 })
}

test('EdgeVision separates available software evidence from planned capabilities',async({page},testInfo)=>{
 await mockApp(page,'admin')
 await page.goto('/edgevision')
 const main=page.locator('#main-content')
 await expect(main.getByRole('heading',{name:'EdgeVision',exact:true})).toBeVisible()
 await expect(main.getByText('2',{exact:true}).first()).toBeVisible()
 await expect(main.getByText('Pescamar · Uni Vision',{exact:true})).toBeVisible()
 await expect(main.getByText(/revisión humana obligatoria/i)).toBeVisible()
 await expect(main.getByText(/versionado reusable de modelo\/engine: pendiente/i)).toBeVisible()
 await expect(main.getByText('Sin modelo operacional conectado todavía.')).toHaveCount(3)
 await expect(main.getByRole('link',{name:/Seafood Event Graph/})).toBeVisible()
 await expect(main.getByRole('link',{name:'Estaciones',exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
 await page.screenshot({path:testInfo.outputPath('edgevision-foundation.png'),fullPage:true})
})

test('EdgeVision does not expose admin station configuration to viewers',async({page})=>{
 await mockApp(page,'viewer')
 await page.goto('/edgevision')
 const main=page.locator('#main-content')
 await expect(main.getByRole('heading',{name:'EdgeVision',exact:true})).toBeVisible()
 await expect(main.getByRole('link',{name:/Seafood Event Graph/})).toBeVisible()
 await expect(main.getByRole('link',{name:'Estaciones',exact:true})).toHaveCount(0)
})

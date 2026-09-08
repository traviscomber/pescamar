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

test('Uni separates available software evidence from planned capabilities',async({page},testInfo)=>{
 await mockApp(page,'admin')
 await page.goto('/edgevision')
 await expect(page).toHaveURL(/\/es\/uni$/)
 const main=page.locator('#main-content')
 await expect(main.getByRole('heading',{name:'Uni',exact:true})).toBeVisible()
 await expect(main.getByText('Pescamar · Uni Vision',{exact:true})).toBeVisible()
 await expect(main.getByText(/revisión humana obligatoria/i)).toBeVisible()
 await expect(main.getByText(/versionado reusable de modelo\/engine: pendiente/i)).toBeVisible()
 await expect(main.getByText(/no se presentan como operativas/i)).toBeVisible()
 await expect(main.getByRole('link',{name:/Seafood Event Graph/})).toBeVisible()
 await expect(main.getByRole('link',{name:'Estaciones',exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
 await page.screenshot({path:testInfo.outputPath('uni-foundation.png'),fullPage:true})
})

test('Uni does not expose admin station configuration to viewers',async({page})=>{
 await mockApp(page,'viewer')
 await page.goto('/uni')
 const main=page.locator('#main-content')
 await expect(main.getByRole('heading',{name:'Uni',exact:true})).toBeVisible()
 await expect(main.getByRole('link',{name:/Seafood Event Graph/})).toBeVisible()
 await expect(main.getByRole('link',{name:'Estaciones',exact:true})).toHaveCount(0)
})

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

test('Organization Context exposes current boundary without claiming multi-tenant isolation',async({page},testInfo)=>{
 await mockApp(page,'admin')
 await page.goto('/organization')
 await expect(page.getByRole('heading',{name:'Organization Context',exact:true})).toBeVisible()
 await expect(page.getByText('pescamar',{exact:true}).first()).toBeVisible()
 await expect(page.getByText('LEGACY',{exact:true})).toBeVisible()
 await expect(page.getByText('No se declara multi-tenant todavía',{exact:true})).toBeVisible()
 await expect(page.getByRole('heading',{name:'Condiciones antes de conectar otro cliente'})).toBeVisible()
 await expect(page.getByText('5 gates',{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
 await page.screenshot({path:testInfo.outputPath('organization-context.png'),fullPage:true})
})

test('Organization Context is not exposed to viewer role',async({page})=>{
 await mockApp(page,'viewer')
 await page.goto('/organization')
 await expect(page).toHaveURL(/\/$/)
 await expect(page.getByRole('heading',{name:'Organization Context',exact:true})).toHaveCount(0)
})

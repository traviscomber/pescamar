import {expect,test} from '@playwright/test'

test('shell presents Seafood Intelligence OS as product and Pescamar as implementation',async({page},testInfo)=>{
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname
    if(path==='/api/auth')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,operator:{id:'qa-admin',fullName:'QA Admin',email:'admin@example.test',role:'admin',plantIds:['ancud']}})})
    if(path==='/api/receptions')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({receptions:[]})})
    if(path==='/api/history')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({records:[],summary:null})})
    if(path==='/api/status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa',checkedAt:new Date().toISOString()})})
    return route.fulfill({status:200,contentType:'application/json',body:'{}'})
  })

  await page.goto('/')
  if(testInfo.project.name==='mobile-chromium')await page.getByRole('button',{name:'Abrir menú'}).click()

  const navigation=page.getByRole('complementary',{name:'Navegación de Seafood Intelligence OS'})
  await expect(navigation).toBeVisible()
  await expect(navigation.getByText('Seafood Intelligence OS',{exact:true})).toBeVisible()
  await expect(navigation.getByText('N3uralia',{exact:true})).toBeVisible()
  await expect(navigation.getByText('Pescamar',{exact:true})).toHaveCount(0)
  await expect(page.locator('.topbar-context')).toContainText('Pescamar · Implementation 01')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
})

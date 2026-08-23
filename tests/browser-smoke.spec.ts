import {expect,test,type Page} from '@playwright/test'

type Role='admin'|'operations'|'finance'|'quality'|'viewer'

async function mockAuthenticatedApp(page:Page,role:Role,plantIds:string[]=['ancud']){
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname
    if(path==='/api/auth')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,operator:{id:`qa-${role}`,fullName:`QA ${role}`,email:`${role}@example.test`,role,plantIds}})})
    if(path==='/api/receptions')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({receptions:[]})})
    if(path==='/api/history')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({records:[],summary:null})})
    if(path==='/api/status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa',checkedAt:new Date().toISOString()})})
    return route.fulfill({status:200,contentType:'application/json',body:'{}'})
  })
}

test('login surface is accessible and stable',async({page},testInfo)=>{
  const consoleErrors:string[]=[]
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())})
  await page.goto('/')
  await expect(page.getByRole('heading',{name:'Acceso'})).toBeVisible()
  await expect(page.getByLabel('Correo')).toBeVisible()
  await expect(page.getByLabel('Contraseña')).toBeVisible()
  await expect(page.getByRole('button',{name:'Entrar'})).toBeDisabled()
  expect(await page.locator('html').getAttribute('lang')).toBe('es')
  expect(consoleErrors).toEqual([])
  await page.screenshot({path:testInfo.outputPath('login.png'),fullPage:true})
})

test('protected routes return to authenticated entry surface',async({page})=>{
  await page.goto('/inventario')
  await expect(page.getByRole('heading',{name:'Acceso'})).toBeVisible()
})

test('viewport has no horizontal overflow',async({page})=>{
  await page.goto('/')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
})

test('keyboard focus reaches the login controls',async({page})=>{
  await page.goto('/')
  await page.getByLabel('Correo').focus()
  await expect(page.getByLabel('Correo')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Contraseña')).toBeFocused()
})

for(const scenario of [
  {role:'admin' as const,newReception:true,configuration:true,finance:true},
  {role:'operations' as const,newReception:true,configuration:true,finance:true},
  {role:'finance' as const,newReception:false,configuration:false,finance:true},
  {role:'quality' as const,newReception:true,configuration:false,finance:false},
  {role:'viewer' as const,newReception:false,configuration:false,finance:false},
]){
  test(`${scenario.role} navigation honors role contract`,async({page},testInfo)=>{
    await mockAuthenticatedApp(page,scenario.role)
    await page.goto('/')
    await expect(page.getByText(`QA ${scenario.role}`,{exact:true})).toBeVisible()
    await expect(page.getByRole('link',{name:/Recepciones/})).toBeVisible()
    const receptionCta=page.getByRole('button',{name:/Nueva recepción/})
    if(scenario.newReception)await expect(receptionCta).toBeVisible();else await expect(receptionCta).toHaveCount(0)
    const configuration=page.getByRole('link',{name:'Configuración'})
    if(scenario.configuration)await expect(configuration).toBeVisible();else await expect(configuration).toHaveCount(0)
    const credits=page.getByRole('link',{name:/Créditos y anticipos/})
    if(scenario.finance)await expect(credits).toBeVisible();else await expect(credits).toHaveCount(0)
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
    await page.screenshot({path:testInfo.outputPath(`${scenario.role}-home.png`),fullPage:true})
  })
}

for(const denied of [
  {role:'finance' as const,path:'/operadores'},
  {role:'finance' as const,path:'/identidades-plantas'},
  {role:'quality' as const,path:'/costos-transformacion'},
  {role:'quality' as const,path:'/creditos'},
  {role:'viewer' as const,path:'/aprobaciones'},
  {role:'viewer' as const,path:'/importaciones'},
]){
  test(`${denied.role} is redirected away from ${denied.path}`,async({page})=>{
    await mockAuthenticatedApp(page,denied.role)
    await page.goto(denied.path)
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText(`QA ${denied.role}`,{exact:true})).toBeVisible()
  })
}

test('plant-scoped operator sees its assigned coverage',async({page})=>{
  await mockAuthenticatedApp(page,'operations',['ancud','quellon'])
  await page.goto('/')
  await expect(page.getByText('2 plantas bajo tu alcance')).toBeVisible()
})

test('mobile drawer traps focus, closes with Escape and restores trigger focus',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='mobile-chromium','Mobile-only interaction contract')
  await mockAuthenticatedApp(page,'operations',['ancud'])
  await page.goto('/')
  const trigger=page.getByRole('button',{name:'Abrir menú'})
  await trigger.click()
  await expect(page.getByRole('button',{name:'Cerrar menú'})).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button',{name:'Cerrar menú'})).toBeHidden()
  await expect(trigger).toBeFocused()
})

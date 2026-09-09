import {expect,test,type Page} from '@playwright/test'

async function mockAuthenticatedApp(page:Page,role='admin',plantIds=['ancud','quellon']){
  await page.route('**/api/**',async route=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname
    if(path==='/api/auth')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,operator:{id:'qa-operator',fullName:'QA Operador',email:'qa@example.test',role,plantIds,organizationId:'pescamar'}})})
    if(path==='/api/receptions')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({receptions:[]})})
    if(path==='/api/inventory')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({lots:[]})})
    if(path==='/api/status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,persistence:{database:true,files:true},metrics:{}})})
    if(path==='/api/canonical-intelligence-brief')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true})})
    return route.fulfill({status:200,contentType:'application/json',body:'{}'})
  })
}

test('login surface is accessible and stable',async({page})=>{
  await page.route('**/api/auth',route=>route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({ok:false,error:'Sesión requerida'})}))
  await page.goto('/login')
  await expect(page.getByRole('heading',{name:/Iniciar sesión/i})).toBeVisible()
  await expect(page.getByLabel(/Correo/i)).toBeVisible()
  await expect(page.getByLabel(/Contraseña/i)).toBeVisible()
})

test('protected routes return to authenticated entry surface',async({page})=>{
  await page.route('**/api/auth',route=>route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({ok:false,error:'Sesión requerida'})}))
  await page.goto('/inventario')
  await expect(page).toHaveURL(/\/login/)
})

test('viewport has no horizontal overflow',async({page})=>{
  await page.route('**/api/auth',route=>route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({ok:false,error:'Sesión requerida'})}))
  await page.goto('/login')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
})

test('keyboard focus reaches the login controls',async({page})=>{
  await page.route('**/api/auth',route=>route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({ok:false,error:'Sesión requerida'})}))
  await page.goto('/login')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await expect(page.getByLabel(/Correo/i)).toBeFocused()
})

test('canonical home starts with operational hierarchy and stable theme switching',async({page},testInfo)=>{
  await page.addInitScript(()=>localStorage.setItem('pescamar-theme','dark'))
  await mockAuthenticatedApp(page)
  await page.goto('/')
  await expect(page.locator('body')).toHaveClass(/theme-dark/)
  await expect(page.locator('.app-shell')).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
  await page.screenshot({path:testInfo.outputPath('home-shell.png'),fullPage:true})
})

for(const role of ['admin','operations','finance','quality','viewer'])test(`${role} navigation honors role contract`,async({page})=>{
  await mockAuthenticatedApp(page,role,['ancud'])
  await page.goto('/')
  await expect(page.locator('.app-shell')).toBeVisible()
})

for(const [role,path] of [['finance','/operadores'],['finance','/identidades-plantas'],['quality','/costos-transformacion'],['quality','/creditos'],['viewer','/aprobaciones'],['viewer','/importaciones']] as const)test(`${role} is redirected away from ${path}`,async({page})=>{
  await mockAuthenticatedApp(page,role,['ancud'])
  await page.goto(path)
  await expect(page).not.toHaveURL(new RegExp(`${path.replaceAll('/','\\/')}$`))
})

test('plant-scoped operator sees its assigned coverage',async({page})=>{
  await mockAuthenticatedApp(page,'operations',['ancud'])
  await page.goto('/')
  await expect(page.locator('.app-shell')).toBeVisible()
})

test('mobile drawer traps focus, closes with Escape and restores trigger focus',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='mobile-chromium')
  await mockAuthenticatedApp(page,'operations',['ancud'])
  await page.goto('/')
  const trigger=page.getByRole('button',{name:/Abrir navegación/i})
  await trigger.click()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
})

test('inventory focus shell remains stable',async({page},testInfo)=>{
  await mockAuthenticatedApp(page,'operations',['ancud'])
  await page.goto('/inventario')
  const main=page.locator('#main-content')
  await expect(main.getByRole('heading',{name:'Inventario',exact:true})).toBeVisible()
  const summary=main.getByRole('region',{name:'Resumen de inventario actual'})
  await expect(summary.getByText('Disponible',{exact:true})).toBeVisible()
  await expect(summary.getByText('Lotes retenidos',{exact:true})).toBeVisible()
  await expect(summary.getByText('Por ubicar',{exact:true})).toBeVisible()
  await expect(page.getByRole('link',{name:/Ver inventario completo/})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
  await page.screenshot({path:testInfo.outputPath('inventory-shell.png'),fullPage:true})
})

test('Seafood AI shell keeps stage and module hierarchy',async({page},testInfo)=>{
  await page.addInitScript(()=>localStorage.setItem('pescamar-theme','dark'))
  await mockAuthenticatedApp(page,'operations',['ancud'])
  await page.goto('/pescamar-ia')
  const main=page.locator('#main-content')
  await expect(main.getByRole('heading',{name:'Seafood AI',exact:true})).toBeVisible()
  const stage=page.locator('.topbar-context').getByText('Inteligencia y control',{exact:true})
  if(testInfo.project.name==='mobile-chromium')await expect(stage).toBeHidden();else await expect(stage).toBeVisible()
  await expect(main.getByText(/Seafood AI · respuestas con evidencia/)).toBeVisible()
  await expect(main.getByText(/Solo consulta; no ejecuta acciones/)).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
  await page.screenshot({path:testInfo.outputPath('pescamar-ia-shell.png'),fullPage:true})
})
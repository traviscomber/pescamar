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

async function openNavigation(page:Page,projectName:string){
  if(projectName!=='mobile-chromium')return
  const trigger=page.getByRole('button',{name:'Abrir menú'})
  await expect(trigger).toBeVisible()
  await trigger.click()
  await expect(page.locator('.sidebar')).toHaveClass(/is-open/)
}

async function expectAuthenticatedNavigation(page:Page,projectName:string){
  await expect(page.getByRole('heading',{name:'Acceso'})).toHaveCount(0)
  await openNavigation(page,projectName)
  const daily=page.getByRole('navigation',{name:'Trabajo diario'})
  await expect(daily.getByRole('link',{name:'Inicio',exact:true})).toBeVisible()
  await expect(daily.getByRole('link',{name:'Recepción',exact:true})).toBeVisible()
  await expect(daily.getByRole('link',{name:'Producción',exact:true})).toBeVisible()
  await expect(daily.getByRole('link',{name:'Inventario',exact:true})).toBeVisible()
  const secondary=page.getByRole('navigation',{name:'Consulta y configuración'})
  await expect(secondary.getByRole('link',{name:'Historial',exact:true})).toBeVisible()
  await expect(secondary.getByRole('link',{name:'Reportes y cierre',exact:true})).toBeVisible()
}

async function visibleCount(locator:ReturnType<Page['getByRole']>){
  return locator.evaluateAll(elements=>elements.filter(element=>{const style=getComputedStyle(element);const box=element.getBoundingClientRect();return style.visibility!=='hidden'&&style.display!=='none'&&box.width>0&&box.height>0}).length)
}

test('login surface is accessible and stable',async({page},testInfo)=>{
  const consoleErrors:string[]=[]
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())})
  await page.goto('/')
  await expect(page.getByRole('heading',{name:'Acceso'})).toBeVisible()
  const email=page.getByLabel('Correo'),password=page.getByLabel('Contraseña'),submit=page.getByRole('button',{name:'Entrar'})
  await expect(email).toBeVisible()
  await expect(password).toBeVisible()
  await expect(submit).toBeEnabled()
  expect(await email.evaluate((input:HTMLInputElement)=>input.validity.valueMissing)).toBe(true)
  expect(await password.evaluate((input:HTMLInputElement)=>input.validity.valueMissing)).toBe(true)
  expect(await page.locator('form').evaluate((form:HTMLFormElement)=>form.checkValidity())).toBe(false)
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

test('canonical home starts with operational hierarchy and stable theme switching',async({page},testInfo)=>{
  await page.addInitScript(()=>localStorage.setItem('pescamar-theme','light'))
  await mockAuthenticatedApp(page,'operations',['ancud'])
  await page.goto('/')
  const h1=page.getByRole('heading',{name:'Inicio',exact:true})
  await expect(h1).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
  const h1Size=await h1.evaluate(element=>Number.parseFloat(getComputedStyle(element).fontSize))
  expect(h1Size).toBeGreaterThanOrEqual(20)
  await expect(page.getByRole('region',{name:'Qué está pasando hoy'})).toBeVisible()
  await expect(page.getByRole('region',{name:'Qué tengo que hacer'})).toBeVisible()
  await expect(page.getByRole('region',{name:'Qué tengo disponible'})).toBeVisible()
  const brief=page.getByRole('region',{name:'Qué requiere atención'})
  await expect(brief).toBeVisible()
  await expect(brief.getByRole('heading',{name:'Qué requiere atención',exact:true})).toBeVisible()
  const [h1Box,briefBox]=await Promise.all([h1.boundingBox(),brief.boundingBox()])
  expect(h1Box&&briefBox?h1Box.y<briefBox.y:false).toBe(true)
  const theme=page.getByRole('button',{name:'Cambiar a tema oscuro'})
  await expect(theme).toBeVisible()
  await theme.click()
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark')
  await expect(page.getByRole('button',{name:'Cambiar a tema claro'})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
  await page.screenshot({path:testInfo.outputPath('canonical-home-dark.png'),fullPage:true})
})

for(const scenario of [
  {role:'admin' as const,newReception:true,quality:true,sales:true,settings:true},
  {role:'operations' as const,newReception:true,quality:true,sales:true,settings:true},
  {role:'finance' as const,newReception:false,quality:false,sales:true,settings:false},
  {role:'quality' as const,newReception:true,quality:true,sales:false,settings:false},
  {role:'viewer' as const,newReception:false,quality:true,sales:true,settings:false},
]){
  test(`${scenario.role} navigation honors role contract`,async({page},testInfo)=>{
    await mockAuthenticatedApp(page,scenario.role)
    await page.goto('/')
    await expectAuthenticatedNavigation(page,testInfo.project.name)
    const daily=page.getByRole('navigation',{name:'Trabajo diario'})
    const quality=daily.getByRole('link',{name:'Calidad',exact:true})
    if(scenario.quality)await expect(quality).toBeVisible();else await expect(quality).toHaveCount(0)
    const sales=daily.getByRole('link',{name:'Ventas',exact:true})
    if(scenario.sales)await expect(sales).toBeVisible();else await expect(sales).toHaveCount(0)
    const settings=page.getByRole('navigation',{name:'Consulta y configuración'}).getByRole('link',{name:'Configuración',exact:true})
    if(scenario.settings)await expect(settings).toBeVisible();else await expect(settings).toHaveCount(0)
    await page.goto('/recepciones')
    await expect(page.getByRole('heading',{name:'Recepciones',exact:true})).toBeVisible()
    const receptionCta=page.getByRole('button',{name:/Nueva recepción/})
    expect(await visibleCount(receptionCta)).toBe(scenario.newReception?1:0)
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
    await page.screenshot({path:testInfo.outputPath(`${scenario.role}-receptions.png`),fullPage:true})
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
  test(`${denied.role} is redirected away from ${denied.path}`,async({page},testInfo)=>{
    await mockAuthenticatedApp(page,denied.role)
    await page.goto(denied.path)
    await expect(page).toHaveURL(/\/es\/?$/)
    await expectAuthenticatedNavigation(page,testInfo.project.name)
  })
}

test('plant-scoped operator sees its assigned coverage',async({page})=>{
  await mockAuthenticatedApp(page,'operations',['ancud','quellon'])
  await page.goto('/')
  const plantScope=page.getByRole('combobox',{name:'Planta'})
  await expect(plantScope).toBeVisible()
  await expect(plantScope).toContainText('Planta Ancud')
  await expect(plantScope).toContainText('Planta Quellón')
  await expect(plantScope.locator('option')).toHaveCount(3)
})

test('mobile drawer traps focus, closes with Escape and restores trigger focus',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='mobile-chromium','Mobile-only interaction contract')
  await mockAuthenticatedApp(page,'operations',['ancud'])
  await page.goto('/')
  const trigger=page.getByRole('button',{name:'Abrir menú'}),sidebar=page.locator('.sidebar'),backdrop=page.locator('.mobile-nav-backdrop')
  await trigger.click()
  await expect(sidebar).toHaveClass(/is-open/)
  await expect(backdrop).toBeVisible()
  await expect(page.getByRole('button',{name:'Cerrar menú'})).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(sidebar).not.toHaveClass(/is-open/)
  await expect(backdrop).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('inventory focus shell remains stable',async({page},testInfo)=>{
  await page.addInitScript(()=>localStorage.setItem('pescamar-theme','dark'))
  await mockAuthenticatedApp(page,'operations',['ancud'])
  await page.goto('/inventario')
  await expect(page.getByRole('heading',{name:'Inventario',exact:true})).toBeVisible()
  const summary=page.getByRole('region',{name:'Resumen de inventario actual'})
  await expect(summary).toBeVisible()
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
  await expect(main.getByText(/Sólo consulta · no ejecuta acciones/)).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
  await page.screenshot({path:testInfo.outputPath('pescamar-ia-shell.png'),fullPage:true})
})
import {expect,test} from '@playwright/test'

test('login surface is accessible and stable',async({page})=>{
  const consoleErrors:string[]=[]
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())})
  await page.goto('/')
  await expect(page.getByRole('heading',{name:'Acceso'})).toBeVisible()
  await expect(page.getByLabel('Correo')).toBeVisible()
  await expect(page.getByLabel('Contraseña')).toBeVisible()
  await expect(page.getByRole('button',{name:'Entrar'})).toBeDisabled()
  const lang=await page.locator('html').getAttribute('lang')
  expect(lang).toBe('es')
  expect(consoleErrors).toEqual([])
})

test('protected routes return to authenticated entry surface',async({page})=>{
  await page.goto('/inventario')
  await expect(page.getByRole('heading',{name:'Acceso'})).toBeVisible()
})

test('viewport has no horizontal overflow',async({page})=>{
  await page.goto('/')
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)
  expect(overflow).toBe(false)
})

test('keyboard focus reaches the login controls',async({page})=>{
  await page.goto('/')
  await page.getByLabel('Correo').focus()
  await expect(page.getByLabel('Correo')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Contraseña')).toBeFocused()
})

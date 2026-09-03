import {expect,test,type Page} from '@playwright/test'

async function mockCopilot(page:Page){
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  if(path==='/api/auth')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,operator:{id:'qa-operations',fullName:'QA Operaciones',email:'operations@example.test',role:'operations',plantIds:['ancud']}})})
  if(path==='/api/receptions')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({receptions:[]})})
  if(path==='/api/status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,persistence:{database:true,files:true},metrics:{}})})
  if(path==='/api/copilot')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,answer:'Hay 2 lotes con revisión de calidad [quality]. Inferencia: conviene resolverlos antes de continuar.',generatedAt:'2026-09-03T12:00:00.000Z',scope:{plantId:'ancud',plantIds:['ancud'],role:'operations'},sources:[{id:'quality',label:'Calidad y holds',path:'/control-regulatorio',rows:2,freshness:'2026-09-03T11:00:00.000Z'}]})})
  return route.fulfill({status:200,contentType:'application/json',body:'{}'})
 })
}

test('Pescamar IA answers with scoped navigable evidence without overflow',async({page},testInfo)=>{
 await mockCopilot(page)
 await page.goto('/pescamar-ia')
 await expect(page.getByRole('heading',{name:'Pescamar IA',exact:true})).toBeVisible()
 await expect(page.getByText('Ir al contenido principal')).not.toBeVisible()
 await expect(page.getByText('Sin escrituras ni acciones')).toBeVisible()
 await page.getByLabel('Alcance').selectOption('ancud')
 await page.getByLabel('Pregunta operacional').fill('¿Qué requiere atención?')
 await page.getByRole('button',{name:'Enviar'}).click()
 await expect(page.getByText(/Hay 2 lotes con revisión/)).toBeVisible()
 await expect(page.getByRole('link',{name:'[quality]'})).toHaveAttribute('href','/control-regulatorio')
 await expect(page.getByText('Calidad y holds')).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true)
 await page.screenshot({path:testInfo.outputPath('pescamar-ia.png'),fullPage:true})
})

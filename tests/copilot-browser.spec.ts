import {expect,test,type Page} from '@playwright/test'

async function mockCopilot(page:Page){
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  if(path==='/api/auth')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,operator:{id:'qa-operations',fullName:'QA Operaciones',email:'operations@example.test',role:'operations',plantIds:['ancud'],organizationId:'pescamar'}})})
  if(path==='/api/receptions')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({receptions:[]})})
  if(path==='/api/status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,persistence:{database:true,files:true},metrics:{}})})
  if(path==='/api/copilot')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,answer:'Hay 2 lotes con revisión de calidad [quality]. La evidencia histórica disponible registra packing canónico [canonical_inventory]. Inferencia: conviene resolver la revisión antes de comprometer disponibilidad.',engine:'Seafood AI',policyVersion:'seafood.ai.evidence.v1',generatedAt:'2026-09-03T12:00:00.000Z',scope:{plantId:'ancud',plantIds:['ancud'],role:'operations',organizationId:'pescamar'},sources:[{id:'quality',label:'Calidad y holds',path:'/control-regulatorio',rows:2,freshness:'2026-09-03T11:00:00.000Z',evidenceClass:'live_observation'},{id:'canonical_inventory',label:'Evidencia canónica de inventario',path:'/inventario',rows:562,freshness:'2026-08-31T00:00:00.000Z',evidenceClass:'canonical_history'}]})})
  return route.fulfill({status:200,contentType:'application/json',body:'{}'})
 })
}

test('Pescamar IA exposes Seafood AI evidence policy with scoped navigable evidence without overflow',async({page},testInfo)=>{
 await mockCopilot(page)
 await page.goto('/pescamar-ia')
 await expect(page.getByRole('heading',{name:'Pescamar IA',exact:true})).toBeVisible()
 await expect(page.getByText('Ir al contenido principal')).not.toBeVisible()
 await expect(page.getByText('Seafood AI · evidence-native')).toBeVisible()
 await expect(page.getByText('Sin escrituras ni acciones')).toBeVisible()
 await page.getByLabel('Alcance').selectOption('ancud')
 await page.getByLabel('Pregunta operacional').fill('¿Qué requiere atención?')
 await page.getByRole('button',{name:'Enviar'}).click()
 await expect(page.getByText(/Hay 2 lotes con revisión/)).toBeVisible()
 await expect(page.getByRole('link',{name:'[quality]'})).toHaveAttribute('href','/control-regulatorio')
 await expect(page.getByRole('link',{name:'[canonical_inventory]'})).toHaveAttribute('href','/inventario')
 await expect(page.getByText(/Calidad y holds · live/)).toBeVisible()
 await expect(page.getByText(/Evidencia canónica de inventario · histórico canónico/)).toBeVisible()
 await expect(page.getByText(/seafood\.ai\.evidence\.v1/)).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true)
 await page.screenshot({path:testInfo.outputPath('pescamar-ia.png'),fullPage:true})
})

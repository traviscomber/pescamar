import {expect,test,type Page} from '@playwright/test'

const readyChecks=[
 {key:'operations-role',label:'Operaciones con credenciales',complete:true,detail:'1 usuario(s) Operaciones listo(s)'},
 {key:'quality-role',label:'Calidad con credenciales',complete:true,detail:'1 usuario(s) Calidad listo(s)'},
 {key:'receptions',label:'Recepción real',complete:true,detail:'3 recepciones'},
 {key:'evidence',label:'Evidencia documental',complete:true,detail:'3 lotes con evidencia'},
 {key:'quality',label:'Control de calidad',complete:true,detail:'3 lotes controlados'},
 {key:'production',label:'Producción trazada',complete:true,detail:'2 lotes producidos'},
 {key:'inventory',label:'Inventario ubicado',complete:true,detail:'120 kg'},
 {key:'commercial',label:'Flujo comercial',complete:true,detail:'2 eventos/órdenes'},
 {key:'close',label:'Cierre diario',complete:true,detail:'1 cierres guardados'},
]
const blockedChecks=readyChecks.map(check=>check.key==='operations-role'?{...check,complete:false,detail:'Falta usuario Operaciones activo con credenciales'}:check.key==='commercial'?{...check,complete:false,detail:'Sin orden, despacho ni venta'}:check)
const payload={ok:true,summary:{blocked:1,inProgress:0,readyForHumanUat:1,live:0},gate:{version:'plant-uat-v1-evidence-gate',rule:'Una planta sólo llega a ready_for_human_uat cuando Operaciones y Calidad tienen credenciales y existe evidencia viva de recepción, documento, calidad, producción, inventario, comercial y cierre. LIVE nunca se infiere: requiere aceptación humana explícita y operación sostenida.'},disclaimer:'Gate UAT basado en evidencia operacional. Ninguna planta se declara LIVE automáticamente.',plants:[
 {plantId:'ancud',score:100,completed:9,total:9,latestActivityAt:'2026-08-28T01:30:00.000Z',uat:{state:'ready_for_human_uat',humanAcceptanceRequired:true,blockers:[]},metrics:{users:3,operationsUsers:1,operationsCredentials:1,qualityUsers:1,qualityCredentials:1,viewerUsers:1,receptions:3,receptionsWithEvidence:3,qualityLots:3,productionLots:2,locatedKg:120,salesOrders:1,dispatches:1,sales:0,dailyCloses:1},checks:readyChecks},
 {plantId:'quellon',score:78,completed:7,total:9,latestActivityAt:'2026-08-28T01:00:00.000Z',uat:{state:'blocked',humanAcceptanceRequired:true,blockers:[{key:'operations-role',label:'Operaciones con credenciales',detail:'Falta usuario Operaciones activo con credenciales'},{key:'commercial',label:'Flujo comercial',detail:'Sin orden, despacho ni venta'}]},metrics:{users:1,operationsUsers:0,operationsCredentials:0,qualityUsers:1,qualityCredentials:1,viewerUsers:0,receptions:2,receptionsWithEvidence:2,qualityLots:2,productionLots:1,locatedKg:45,salesOrders:0,dispatches:0,sales:0,dailyCloses:1},checks:blockedChecks},
]}

async function mock(page:Page,role:'admin'|'operations'|'quality'='admin'){
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  const json=(body:unknown)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)})
  if(path==='/api/auth')return json({ok:true,operator:{id:`qa-${role}`,fullName:`QA ${role}`,email:`${role}@example.test`,role,plantIds:['ancud','quellon']}})
  if(path==='/api/status')return json({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:2,receptions:5},commit:'qa-uat',checkedAt:new Date().toISOString()})
  if(path==='/api/receptions')return json({receptions:[]})
  if(path==='/api/plant-readiness')return json(payload)
  return json({ok:true})
 })
}

test('rollout presents explicit UAT states and never auto-declares LIVE',async({page},testInfo)=>{
 await mock(page,'admin')
 await page.goto('/rollout')
 await expect(page.getByRole('heading',{name:'UAT por planta'})).toBeVisible()
 await expect(page.getByText('Listas para UAT humano',{exact:true})).toBeVisible()
 await expect(page.getByText('Lista para UAT humano',{exact:true})).toBeVisible()
 await expect(page.getByText('Bloqueada',{exact:true})).toBeVisible()
 await expect(page.getByText(/Próximo bloqueo · Operaciones con credenciales/)).toBeVisible()
 await expect(page.getByText(/LIVE nunca se infiere/)).toBeVisible()
 await expect(page.getByText(/Ninguna planta se declara LIVE automáticamente/)).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
 await page.screenshot({path:testInfo.outputPath('plant-uat-gates.png'),fullPage:true})
})

test('operations can inspect UAT gate while quality remains outside rollout governance',async({page})=>{
 await mock(page,'operations')
 await page.goto('/rollout')
 await expect(page.getByRole('heading',{name:'UAT por planta'})).toBeVisible()
 await page.unroute('**/api/**')
 await mock(page,'quality')
 await page.goto('/rollout')
 await expect(page).toHaveURL(/\/$/)
 await expect(page.getByRole('heading',{name:'UAT por planta'})).toHaveCount(0)
})

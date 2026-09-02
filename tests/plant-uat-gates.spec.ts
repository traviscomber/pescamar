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
 {key:'linked-e2e',label:'Flujo E2E en un mismo lote',complete:true,detail:'1 lote(s) conectan evidencia → calidad → producción → inventario → comercial'},
 {key:'close',label:'Cierre diario',complete:true,detail:'3 cierres guardados'},
]
const blockedChecks=readyChecks.map(check=>check.key==='operations-role'?{...check,complete:false,detail:'Falta usuario Operaciones activo con credenciales'}:check.key==='commercial'?{...check,complete:false,detail:'Sin orden, despacho ni venta'}:check.key==='linked-e2e'?{...check,complete:false,detail:'Hay que completar toda la cadena sobre al menos un mismo lote; no basta sumar evidencia de lotes distintos'}:check)
const payload={ok:true,summary:{blocked:1,inProgress:0,readyForHumanUat:1,readyForHumanLiveReview:1,live:0},gate:{version:'plant-uat-v3-linked-e2e',rule:'UAT exige roles y evidencia viva end-to-end enlazada sobre al menos un mismo lote: evidencia documental, Calidad, Producción, ubicación física y señal comercial deben compartir reception_id. La revisión LIVE exige además al menos 3 fechas consecutivas con cierre operacional. LIVE nunca se infiere: requiere confirmación humana, cero P0/P1 y aceptación del responsable.'},disclaimer:'Gate basado en evidencia operacional enlazada. La presencia agregada de eventos en una planta no prueba un flujo E2E. Los cierres consecutivos son evidencia de continuidad, no prueba automática de independencia del equipo técnico ni autorización LIVE.',plants:[
 {plantId:'ancud',score:100,completed:10,total:10,latestActivityAt:'2026-08-28T01:30:00.000Z',uat:{state:'ready_for_human_uat',humanAcceptanceRequired:true,blockers:[]},liveReadiness:{state:'ready_for_human_live_review',requiredConsecutiveCloseDays:3,consecutiveCloseDays:3,continuityEvidenceComplete:true,humanAcceptanceRequired:true,supportIndependenceRequiresHumanConfirmation:true,autoLive:false},metrics:{users:3,operationsUsers:1,operationsCredentials:1,qualityUsers:1,qualityCredentials:1,viewerUsers:1,receptions:3,receptionsWithEvidence:3,qualityLots:3,productionLots:2,locatedKg:120,salesOrders:1,dispatches:1,sales:0,endToEndReceptions:1,dailyCloses:3,distinctCloseDays:3},checks:readyChecks},
 {plantId:'quellon',score:70,completed:7,total:10,latestActivityAt:'2026-08-28T01:00:00.000Z',uat:{state:'blocked',humanAcceptanceRequired:true,blockers:[{key:'operations-role',label:'Operaciones con credenciales',detail:'Falta usuario Operaciones activo con credenciales'},{key:'commercial',label:'Flujo comercial',detail:'Sin orden, despacho ni venta'},{key:'linked-e2e',label:'Flujo E2E en un mismo lote',detail:'Hay que completar toda la cadena sobre al menos un mismo lote; no basta sumar evidencia de lotes distintos'}]},liveReadiness:{state:'uat_incomplete',requiredConsecutiveCloseDays:3,consecutiveCloseDays:1,continuityEvidenceComplete:false,humanAcceptanceRequired:true,supportIndependenceRequiresHumanConfirmation:true,autoLive:false},metrics:{users:1,operationsUsers:0,operationsCredentials:0,qualityUsers:1,qualityCredentials:1,viewerUsers:0,receptions:2,receptionsWithEvidence:2,qualityLots:2,productionLots:1,locatedKg:45,salesOrders:0,dispatches:0,sales:0,endToEndReceptions:0,dailyCloses:1,distinctCloseDays:1},checks:blockedChecks},
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

test('rollout separates linked UAT readiness from human LIVE review',async({page},testInfo)=>{
 await mock(page,'admin')
 await page.goto('/rollout')
 await expect(page.getByRole('heading',{name:'UAT por planta'})).toBeVisible()
 await expect(page.getByText('Listas para UAT humano',{exact:true})).toBeVisible()
 await expect(page.getByText('Lista para UAT humano',{exact:true})).toBeVisible()
 await expect(page.getByText('Bloqueada',{exact:true})).toBeVisible()
 await expect(page.getByText('Lista para revisión LIVE humana',{exact:true})).toBeVisible()
 await expect(page.getByText(/Continuidad observada · 3\/3 días consecutivos con cierre/)).toBeVisible()
 await expect(page.getByText(/Próximo bloqueo · Operaciones con credenciales/)).toBeVisible()
 await expect(page.getByText(/1 ya conectan al menos un lote E2E/)).toBeVisible()
 await expect(page.getByText(/deben compartir reception_id/)).toBeVisible()
 await expect(page.getByText(/LIVE nunca se infiere/)).toBeVisible()
 await expect(page.getByText(/no prueba automática de independencia del equipo técnico/)).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
 await page.screenshot({path:testInfo.outputPath('plant-uat-linked-e2e.png'),fullPage:true})
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

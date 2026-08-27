import {expect,test,type Page} from '@playwright/test'

const supplierPayload={
 ok:true,
 method:{version:'supplier-score-v1.2-canonical-evidence-gate',rule:'El score histórico usa sólo fuentes marcadas como canónicas. Filas con inconsistencia de masa quedan fuera de calidad/rendimiento y sólo reducen confianza; nunca castigan directamente la nota del proveedor.'},
 summary:{suppliers:1,scored:1,preferred:0,highConfidence:0,canonicalLots:12,massReviewRows:4},
 suppliers:[{
  supplierId:'supplier-1',supplier:'Proveedor QA',score:86.2,label:'Provisional',confidence:'baja',coverage:65,lots:14,historicalLots:12,liveLots:2,receivedKg:8420,trendGradeAPoints:null,identity:'canonical-or-exact-name',lastHistoricalDate:'2026-06-10',
  components:[
   {key:'quality',label:'Calidad',weight:30,score:92,detail:'2 procesos live incorporados al score.',source:'live'},
   {key:'yield',label:'Rendimiento',weight:25,score:81,detail:'2 rendimientos live reconciliados.',source:'live'},
   {key:'consistency',label:'Consistencia',weight:15,score:null,detail:'Se requieren al menos 5 muestras de Grade A comparables y válidas.',source:'pending'},
   {key:'compliance',label:'Cumplimiento',weight:10,score:88,detail:'Desviación acumulada guía vs recibido 2,4%.',source:'historical'},
   {key:'profitability',label:'Rentabilidad',weight:10,score:null,detail:'Se activa con contribución real por proveedor.',source:'pending'},
   {key:'incidents',label:'Incidencias',weight:10,score:null,detail:'Se activa con el primer proceso live controlado.',source:'pending'}
  ],
  zones:[{zone:'quellon',lots:6,receivedKg:4100,gradeAYieldPct:null,totalYieldPct:null,massReviewRows:2}],
  explanation:'Fortaleza: calidad 92. Principal brecha: rendimiento 81. 4 filas canónicas quedan fuera del rendimiento por inconsistencia de masa; esto reduce la confianza, no la nota del proveedor.',
  liveEvidence:{runs:2,qualitySamples:2,yieldSamples:2,controlledRuns:2},
  evidence:{canonicalLots:12,flaggedRows:1,massReviewRows:4,massValidatedPct:66.7,sourceFlaggedPct:8.3,guideCoveragePct:100,priceCoveragePct:25,qualityEligibleRows:0,yieldEligibleRows:0}
 }]
}

async function mockApp(page:Page){
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  if(path==='/api/auth')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,operator:{id:'qa-admin',fullName:'QA Admin',email:'admin@example.test',role:'admin',plantIds:['ancud']}})})
  if(path==='/api/status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa',checkedAt:new Date().toISOString()})})
  if(path==='/api/receptions')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({receptions:[]})})
  if(path==='/api/partners')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({parties:[],suppliers:[],customers:[],purchases:[],invoices:[],permissions:{canWrite:true}})})
  if(path==='/api/supplier-intelligence')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(supplierPayload)})
  return route.fulfill({status:200,contentType:'application/json',body:'{}'})
 })
}

test('supplier score keeps high score provisional when canonical mass evidence is weak',async({page},testInfo)=>{
 await mockApp(page)
 await page.goto('/proveedores-clientes')
 await expect(page.getByRole('heading',{name:'Score objetivo de proveedor'})).toBeVisible()
 await expect(page.getByText('supplier-score-v1.2-canonical-evidence-gate',{exact:true})).toBeVisible()
 await expect(page.getByText('Filas revisión masa',{exact:true})).toBeVisible()
 await expect(page.getByText('Proveedor QA',{exact:true})).toBeVisible()
 await expect(page.getByText('Provisional · confianza baja · cobertura 65%',{exact:true})).toBeVisible()
 await page.getByText('Proveedor QA',{exact:true}).click()
 await expect(page.getByText('4 filas revisión masa',{exact:true})).toBeVisible()
 await expect(page.getByText(/Masa reconciliada 66,7%/)).toBeVisible()
 await expect(page.getByText(/Canónico/).first()).toBeVisible()
 await expect(page.getByText(/esto reduce la confianza, no la nota del proveedor/)).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
 await page.screenshot({path:testInfo.outputPath('supplier-score-canonical-gate.png'),fullPage:true})
})

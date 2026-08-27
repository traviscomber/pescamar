import {expect,test,type Page} from '@playwright/test'

const supplierPayload={
 ok:true,
 method:{version:'supplier-score-v1.3-capture-semantics',rule:'El score separa proveedor de semántica de planta. Filas roll-forward no entran a masa, calidad-rendimiento ni consistencia como si fueran una sola recepción y no reducen directamente la nota.'},
 summary:{suppliers:1,scored:1,preferred:0,highConfidence:0,canonicalLots:12,rowMassBalanceRows:7,rollforwardRows:5,massReviewRows:0},
 suppliers:[{
  supplierId:'supplier-1',supplier:'Proveedor QA',score:86.2,label:'Provisional',confidence:'baja',coverage:65,lots:14,historicalLots:12,liveLots:2,receivedKg:8420,trendGradeAPoints:null,identity:'canonical-or-exact-name',lastHistoricalDate:'2026-06-10',
  components:[
   {key:'quality',label:'Calidad',weight:30,score:92,detail:'2 procesos live incorporados al score.',source:'live'},
   {key:'yield',label:'Rendimiento',weight:25,score:81,detail:'2 rendimientos live reconciliados.',source:'live'},
   {key:'consistency',label:'Consistencia',weight:15,score:null,detail:'Se requieren al menos 5 muestras de Grade A comparables y directas.',source:'pending'},
   {key:'compliance',label:'Cumplimiento',weight:10,score:88,detail:'Desviación acumulada guía vs recibido 2,4%.',source:'historical'},
   {key:'profitability',label:'Rentabilidad',weight:10,score:null,detail:'Se activa con contribución real por proveedor.',source:'pending'},
   {key:'incidents',label:'Incidencias',weight:10,score:null,detail:'Se activa con el primer proceso live controlado.',source:'pending'}
  ],
  zones:[{zone:'quellon',lots:6,receivedKg:4100,rowMassBalanceRows:1,rollforwardRows:5,gradeAYieldPct:null,totalYieldPct:null,massReviewRows:0}],
  explanation:'Fortaleza: calidad 92. Principal brecha: rendimiento 81. 5 filas históricas usan captura roll-forward de planta y no entran a masa/rendimiento; no reducen la nota del proveedor.',
  liveEvidence:{runs:2,qualitySamples:2,yieldSamples:2,controlledRuns:2},
  evidence:{canonicalLots:12,rowMassBalanceRows:7,rollforwardRows:5,flaggedRows:1,massReviewRows:0,massValidatedPct:100,semanticEligiblePct:58.3,sourceFlaggedPct:8.3,guideCoveragePct:100,priceCoveragePct:25,qualityEligibleRows:0,yieldEligibleRows:0}
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

test('supplier score keeps roll-forward evidence separate from supplier performance',async({page},testInfo)=>{
 await mockApp(page)
 await page.goto('/proveedores-clientes')
 await expect(page.getByRole('heading',{name:'Score objetivo de proveedor'})).toBeVisible()
 await expect(page.getByText('supplier-score-v1.3-capture-semantics',{exact:true})).toBeVisible()
 await expect(page.getByText('Roll-forward planta',{exact:true})).toBeVisible()
 await expect(page.getByText('5',{exact:true}).first()).toBeVisible()
 await expect(page.getByText('Proveedor QA',{exact:true})).toBeVisible()
 await expect(page.getByText('Provisional · confianza baja · cobertura 65%',{exact:true})).toBeVisible()
 await page.getByText('Proveedor QA',{exact:true}).click()
 await expect(page.getByText('5 filas roll-forward',{exact:true})).toBeVisible()
 await expect(page.getByText(/Base directa 58,3% · masa válida dentro de la base directa 100%/)).toBeVisible()
 await expect(page.getByText(/no reducen la nota del proveedor/)).toBeVisible()
 await expect(page.getByText(/revisiones de masa directas/)).toHaveCount(0)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
 await page.screenshot({path:testInfo.outputPath('supplier-score-capture-semantics.png'),fullPage:true})
})
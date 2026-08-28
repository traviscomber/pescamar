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

const supportPayload={
 ok:true,status:'ready',method:{version:'supplier-support-v1-physical-blocks',rule:'Las cadenas físicas v2 mejoran trazabilidad y confianza, no castigan por sí solas el desempeño del proveedor.'},
 summary:{blocks:12,observations:44,autoLinkedBlocks:11,exceptions:1,suppliersWithSupport:1},
 suppliers:[{
  supplier:'Proveedor QA',physicalBlocks:12,observations:44,autoLinkedBlocks:11,matchCoveragePct:91.7,exactBoth:8,guideOnly:2,lotOnly:1,conflicts:0,ambiguous:0,unmatched:1,exceptions:1,traceabilityScore:93.3,noGradeObservationBlocks:1,
  unresolved:[{sheetName:'Diaz termiando',sourceBlock:99,guide:'180',lotReference:'mdq106',status:'unmatched'}]
 }]
}

const economicPayload={
 ok:true,
 method:{version:'supplier-economics-v1-quality-adjusted',rule:'Economía histórica de erizo usa sólo captura directa con masa válida, precio de guía y Grade A. CUENTA2 permanece como evidencia financiera y packing de pulpo queda fuera del score de erizo.'},
 summary:{suppliers:1,scored:1,historicalScored:1,liveScored:0,mixed:0},
 suppliers:[{
  supplierId:'supplier-1',supplier:'Proveedor QA',score:78,source:'historical',
  historical:{samples:3,receivedKg:1800,purchaseCostClp:9720000,gradeAOutputKg:339.9,avgRawPriceClp:5400,costPerGradeAKg:28600,score:78},
  live:{receptions:2,soldReceptions:0,receivedKg:420,soldKg:0,revenueClp:0,purchaseCostClp:0,transformationCostClp:0,contributionClp:0,contributionPerReceivedKg:null,score:null}
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
  if(path==='/api/supplier-support-intelligence')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(supportPayload)})
  if(path==='/api/supplier-economic-intelligence')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(economicPayload)})
  return route.fulfill({status:200,contentType:'application/json',body:'{}'})
 })
}

test('supplier buying score separates roll-forward, physical support and quality-adjusted economics',async({page},testInfo)=>{
 await mockApp(page)
 await page.goto('/proveedores-clientes')
 await expect(page.getByRole('heading',{name:'Score de compra de proveedor'})).toBeVisible()
 await expect(page.getByText(/supplier-score-v1.3-capture-semantics \+ supplier-economics-v1-quality-adjusted/)).toBeVisible()
 await expect(page.getByText('Roll-forward planta',{exact:true})).toBeVisible()
 await expect(page.getByText('Economía calculada',{exact:true})).toBeVisible()
 await expect(page.getByText('Economía de compra · 1 históricos · 0 con margen live',{exact:true})).toBeVisible()
 await expect(page.getByText('Evidencia física v2 · 11/12 cadenas conciliadas',{exact:true})).toBeVisible()
 await expect(page.getByText('Decisión actual · Revisar próxima recepción: Proveedor QA',{exact:true})).toBeVisible()
 await expect(page.getByText(/Score compra 85,9 · desempeño 86,2 · economía 78/)).toBeVisible()
 await expect(page.getByText('Proveedor QA',{exact:true})).toBeVisible()
 await expect(page.getByText('Compra 85,9 · desempeño 86,2 · confianza baja',{exact:true})).toBeVisible()
 await page.getByText('Proveedor QA',{exact:true}).click()
 await expect(page.getByText('Revisar próxima recepción',{exact:true}).last()).toBeVisible()
 await expect(page.getByText('Economía de compra',{exact:true})).toBeVisible()
 await expect(page.getByText(/28\.600 CLP por kg Grade A útil · 3 registros directos con precio/)).toBeVisible()
 await expect(page.getByText(/Economía · score 78/)).toBeVisible()
 await expect(page.getByText(/3 registros económicos directos/)).toBeVisible()
 await expect(page.getByText('5 filas roll-forward',{exact:true})).toBeVisible()
 await expect(page.getByText('12 cadenas físicas v2',{exact:true})).toBeVisible()
 await expect(page.getByText('11/12 cadenas conciliadas',{exact:true})).toBeVisible()
 await expect(page.getByText('1 excepción física',{exact:true})).toBeVisible()
 await expect(page.getByText(/Base directa 58,3% · masa válida dentro de la base directa 100%/)).toBeVisible()
 await expect(page.getByText(/Trazabilidad física 93,3%/)).toBeVisible()
 await expect(page.getByText(/Diaz termiando · bloque 99 · guía 180 · lote mdq106/)).toBeVisible()
 await expect(page.getByText(/CUENTA2 permanece como evidencia financiera y packing de pulpo queda fuera del score de erizo/)).toBeVisible()
 await expect(page.getByText(/no reducen la nota del proveedor/)).toBeVisible()
 await expect(page.getByText(/revisiones de masa directas/)).toHaveCount(0)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
 await page.screenshot({path:testInfo.outputPath('supplier-buying-score-economic-evidence.png'),fullPage:true})
})

import {expect,test,type Page} from '@playwright/test'

const baseSupplier={
 supplier:'Proveedor QA',score:88,label:'Fuerte',confidence:'alta',coverage:90,lots:24,receivedKg:18400,explanation:'Buen desempeño histórico.',
 components:[
  {key:'quality',label:'Calidad',weight:30,score:92},
  {key:'yield',label:'Rendimiento',weight:25,score:88},
  {key:'consistency',label:'Consistencia',weight:15,score:86},
  {key:'compliance',label:'Cumplimiento',weight:10,score:90},
  {key:'profitability',label:'Rentabilidad',weight:10,score:null},
  {key:'incidents',label:'Incidencias',weight:10,score:91},
 ],
 zones:[{zone:'Quellón',lots:8,receivedKg:6200,gradeAYieldPct:14.6,totalYieldPct:18.2}],
}
const pricePayload={matched:true,supplier:'Proveedor QA',price:{observations:12,receivedKg:9100,avgPriceClp:2150,latestPriceClp:2200,minPriceClp:1900,maxPriceClp:2300},zone:{name:'Quellón',observations:20,receivedKg:15000,supplierAvgPriceClp:2150,peerAvgPriceClp:2070,relativeToZonePct:3.9}}
const economicPayload={ok:true,suppliers:[{supplierId:'supplier-qa',supplier:'Proveedor QA',score:28,source:'historical',historical:{samples:10,receivedKg:7800,purchaseCostClp:16770000,gradeAOutputKg:1524.5,avgRawPriceClp:2150,costPerGradeAKg:11000,score:28},live:{receptions:0,soldReceptions:0,receivedKg:0,soldKg:0,revenueClp:0,purchaseCostClp:0,transformationCostClp:0,contributionClp:0,contributionPerReceivedKg:null,score:null}}]}
const supportReady={ok:true,status:'ready',suppliers:[{supplier:'Proveedor QA',physicalBlocks:12,observations:44,autoLinkedBlocks:11,exceptions:1,traceabilityScore:93.3,unresolved:[{sheetName:'Diaz termiando',sourceBlock:99,guide:'180',lotReference:'mdq106',status:'unmatched'}]}]}

async function mockReception(page:Page,support:unknown){
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  if(path==='/api/auth')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,operator:{id:'qa-operations',fullName:'QA Operaciones',email:'operations@example.test',role:'operations',plantIds:['ancud']}})})
  if(path==='/api/status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa',checkedAt:new Date().toISOString()})})
  if(path==='/api/receptions')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({receptions:[]})})
  if(path==='/api/history')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({records:[],summary:null})})
  if(path==='/api/supplier-intelligence')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,suppliers:[baseSupplier]})})
  if(path==='/api/supplier-price-context')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(pricePayload)})
  if(path==='/api/supplier-economic-intelligence')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(economicPayload)})
  if(path==='/api/supplier-support-intelligence')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(support)})
  return route.fulfill({status:200,contentType:'application/json',body:'{}'})
 })
}

async function openSupplierDecision(page:Page){
 await page.goto('/recepciones')
 await page.getByRole('button',{name:/Nueva recepción/}).first().click()
 await page.getByLabel('Proveedor').fill('Proveedor QA')
 await page.getByLabel('Zona de extracción').fill('Quellón')
}

test('reception decision gives physical traceability precedence over a strong performance score',async({page},testInfo)=>{
 await mockReception(page,supportReady)
 await openSupplierDecision(page)
 await expect(page.getByRole('heading',{name:'Revisar trazabilidad'})).toBeVisible()
 await expect(page.getByText(/Score compra · desempeño 88 · economía 28/)).toBeVisible()
 await expect(page.getByText('Costo / kg Grade A útil',{exact:true})).toBeVisible()
 await expect(page.getByText(/11\/12/)).toBeVisible()
 await expect(page.getByText(/Diaz termiando · bloque 99 · guía 180 · lote mdq106/)).toBeVisible()
 await expect(page.getByText(/Trazabilidad física modifica confianza, no castiga desempeño/)).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
 await page.screenshot({path:testInfo.outputPath('reception-supplier-traceability-decision.png'),fullPage:true})
})

test('reception decision negotiates on weak economics when physical v2 evidence is pending',async({page},testInfo)=>{
 await mockReception(page,{ok:true,status:'not_imported',suppliers:[]})
 await openSupplierDecision(page)
 await expect(page.getByRole('heading',{name:'Negociar antes de comprar'})).toBeVisible()
 await expect(page.getByText('Pendiente v2',{exact:true})).toBeVisible()
 await expect(page.getByText(/economía 28/)).toBeVisible()
 await expect(page.getByText(/Sin margen live vinculado todavía/)).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
 await page.screenshot({path:testInfo.outputPath('reception-supplier-economic-decision.png'),fullPage:true})
})
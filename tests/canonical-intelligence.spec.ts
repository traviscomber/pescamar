import {expect,test,type Page} from '@playwright/test'

const intelligence={
 ok:true,sources:{count:3,files:[
  {fileName:'planilla de produccion 2026.xlsx',kind:'production',recordCount:224,periodStart:'2026-04-07',periodEnd:'2026-06-10',importedAt:'2026-08-26T00:00:00Z'},
  {fileName:'CUENTA2.xlsx',kind:'account',recordCount:1094,periodStart:'2025-05-20',periodEnd:'2026-08-21',importedAt:'2026-08-26T00:00:00Z'},
  {fileName:'packing pulpo pescamar 2026-2.xlsx',kind:'packing',recordCount:562,periodStart:'2026-08-05',periodEnd:'2026-08-24',importedAt:'2026-08-26T00:00:00Z'}
 ]},
 production:{rows:224,guideKg:50959.7,receivedKg:49183.6,differenceKg:1776.1,receptionPct:96.5,flagged:2,pricedRows:41,priceCoveragePct:18.3,pricedValueClp:131276400,firstDate:'2026-04-07',lastDate:'2026-06-10',reportedOutputKg:43066.3,reportedOutputPct:87.6,massInconsistentRows:100,missingOutputRows:3,reportedOutputUsable:false},
 suppliers:[{supplier:'Patricio Diaz',rows:92,guideKg:17319,receivedKg:16401.4,receptionPct:94.7,reportedOutputKg:0,reportedOutputPct:null,massInconsistentRows:0,flagged:1,priceCoveragePct:20}],
 packing:[{format:'BLOQUE',boxes:446,kg:8920,lots:4,flagged:0,avgBoxKg:20,minBoxKg:20,maxBoxKg:20,boxStddevKg:0,firstDate:'2026-08-05',lastDate:'2026-08-24'},{format:'IQF',boxes:116,kg:2372,lots:0,flagged:116,avgBoxKg:20.45,minBoxKg:20.1,maxBoxKg:20.9,boxStddevKg:.2,firstDate:'2026-08-05',lastDate:'2026-08-24'}],
 packingSummary:{boxes:562,kg:11292,lots:4,flagged:116},
 stock:[{productFamily:'erizo',rows:31,observedNetKg:12449.2,firstDate:'2026-07-10',lastDate:'2026-08-21',flagged:0},{productFamily:'pulpo',rows:20,observedNetKg:6415.7,firstDate:'2025-07-31',lastDate:'2025-10-11',flagged:0}],
 finance:{transfers:{rows:25,amountClp:80211983,flagged:0,firstDate:'2025-05-20',lastDate:'2025-06-20'},ledger:{rows:1018,inflowClp:1485879502,outflowClp:1515939219,balanceClp:-30059717,flagged:8,firstDate:'2012-10-29',lastDate:'2026-11-10'}},
 dataQuality:{totalRows:1881,totalFlagged:126,flaggedPct:6.7,massInconsistentRows:100},
 exceptions:[{severity:'warning',kind:'consistencia-masa',title:'100 filas requieren reconciliar salidas reportadas',detail:'La suma de categorías de producto supera los kilos recibidos en esas filas. Se conserva como evidencia, pero no se usa como rendimiento oficial.'}]
}

async function mockApp(page:Page,role:'admin'|'quality'='admin'){
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  if(path==='/api/auth')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,operator:{id:`qa-${role}`,fullName:`QA ${role}`,email:`${role}@example.test`,role,plantIds:['ancud']}})})
  if(path==='/api/receptions')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({receptions:[]})})
  if(path==='/api/status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa',checkedAt:new Date().toISOString()})})
  if(path==='/api/pescamar-intelligence')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(role==='quality'?{...intelligence,finance:null}:intelligence)})
  return route.fulfill({status:200,contentType:'application/json',body:'{}'})
 })
}

test('canonical intelligence renders uploaded-source KPIs without inventing yield',async({page},testInfo)=>{
 await mockApp(page,'admin')
 await page.goto('/')
 await expect(page.getByRole('heading',{name:'Resultado de la data subida'})).toBeVisible()
 await expect(page.getByText('planilla de produccion 2026.xlsx',{exact:false})).toBeVisible()
 await expect(page.getByText('49.183,6 kg')).toBeVisible()
 await expect(page.getByText('11.292 kg')).toBeVisible()
 await expect(page.getByText('12.449,2 kg')).toBeVisible()
 await expect(page.getByRole('heading',{name:'Formato y estabilidad de caja'})).toBeVisible()
 await expect(page.getByRole('cell',{name:'BLOQUE'})).toBeVisible()
 await expect(page.getByRole('cell',{name:'IQF'})).toBeVisible()
 await expect(page.getByText('100 filas requieren reconciliar salidas reportadas')).toBeVisible()
 await expect(page.getByText(/Saldo reconstruido del archivo/)).toBeVisible()
 await expect(page.getByText(/87,6% rendimiento/)).toHaveCount(0)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
 await page.screenshot({path:testInfo.outputPath('canonical-intelligence.png'),fullPage:true})
})

test('quality role does not receive financial canonical cards',async({page})=>{
 await mockApp(page,'quality')
 await page.goto('/')
 await expect(page.getByRole('heading',{name:'Resultado de la data subida'})).toBeVisible()
 await expect(page.getByText('Entradas cuenta')).toHaveCount(0)
 await expect(page.getByText('Transferencias recibidas')).toHaveCount(0)
})

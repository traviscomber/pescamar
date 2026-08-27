import {expect,test,type Page} from '@playwright/test'

const intelligence={
 ok:true,sources:{count:3,files:[
  {fileName:'planilla de produccion 2026.xlsx',kind:'production',recordCount:224,periodStart:'2026-04-07',periodEnd:'2026-06-10',importedAt:'2026-08-26T00:00:00Z'},
  {fileName:'CUENTA2.xlsx',kind:'account',recordCount:1094,periodStart:'2025-05-20',periodEnd:'2026-08-21',importedAt:'2026-08-26T00:00:00Z'},
  {fileName:'packing pulpo pescamar 2026-2.xlsx',kind:'packing',recordCount:562,periodStart:'2026-08-05',periodEnd:'2026-08-24',importedAt:'2026-08-26T00:00:00Z'}
 ]},
 production:{rows:224,guideKg:50959.7,receivedKg:49183.6,differenceKg:1776.1,receptionPct:96.5,flagged:2,pricedRows:41,priceCoveragePct:18.3,pricedValueClp:131276400,firstDate:'2026-04-07',lastDate:'2026-06-10',rowMassBalanceRows:114,rollforwardRows:110,rowMassBalanceReceivedKg:31421.8,reportedOutputKg:18244.9,reportedOutputPct:58.1,massInconsistentRows:0,missingOutputRows:1,reportedOutputUsable:false},
 suppliers:[{supplier:'Patricio Diaz',rows:92,guideKg:17319,receivedKg:16401.4,receptionPct:94.7,rowMassBalanceRows:48,rollforwardRows:44,reportedOutputKg:7265.5,reportedOutputPct:null,massInconsistentRows:0,flagged:1,priceCoveragePct:20}],
 packing:[{format:'BLOQUE',boxes:446,kg:8920,lots:4,flagged:0,avgBoxKg:20,minBoxKg:20,maxBoxKg:20,boxStddevKg:0,firstDate:'2026-08-05',lastDate:'2026-08-24'},{format:'IQF',boxes:116,kg:2372,lots:0,flagged:116,avgBoxKg:20.45,minBoxKg:20.1,maxBoxKg:20.9,boxStddevKg:.2,firstDate:'2026-08-05',lastDate:'2026-08-24'}],
 packingSummary:{boxes:562,kg:11292,lots:4,flagged:116},
 stock:[{productFamily:'erizo',rows:31,observedNetKg:12449.2,firstDate:'2026-07-10',lastDate:'2026-08-21',flagged:0},{productFamily:'pulpo',rows:20,observedNetKg:6415.7,firstDate:'2025-07-31',lastDate:'2025-10-11',flagged:0}],
 finance:{transfers:{rows:25,amountClp:80211983,flagged:0,firstDate:'2025-05-20',lastDate:'2025-06-20'},ledger:{rows:1018,inflowClp:1485879502,outflowClp:1515939219,balanceClp:-30059717,flagged:8,firstDate:'2012-10-29',lastDate:'2026-11-10'}},
 dataQuality:{totalRows:1881,totalFlagged:126,flaggedPct:6.7,rowMassBalanceRows:114,rollforwardRows:110,massInconsistentRows:0},
 decisionBrief:{
  headline:'Recepción y packing ya generan señal operativa; rendimiento y costo de compra siguen bloqueados por cobertura o semántica de captura.',
  capabilities:[
   {key:'reception',label:'Recepción vs guía',status:'ready',detail:'96,5% de kilos guía están explicados por kilos recibidos en 224 registros canónicos.'},
   {key:'packing',label:'Packing pulpo',status:'review',detail:'562 cajas y 11.292 kg; 116 cajas requieren completar trazabilidad.'},
   {key:'supplier',label:'Decisión por proveedor',status:'review',detail:'7 proveedores con volumen/cumplimiento canónico. 110 filas de planta se excluyen de masa/rendimiento por su semántica roll-forward, sin castigar al proveedor.'},
   {key:'yield',label:'Rendimiento',status:'blocked',detail:'114 filas son comparables fila a fila, pero 110 usan arrastre entre lotes. Se puede analizar composición directa; el rendimiento total sigue bloqueado hasta conciliar ese roll-forward.'},
   {key:'purchase-cost',label:'Costo de compra',status:'blocked',detail:'Precio guía disponible en 18,3% de las filas; no publicar costo total ni margen como cifra completa.'},
   {key:'ledger',label:'Cuenta reconstruida',status:'review',detail:'1018 movimientos reconstruidos desde CUENTA2; 8 presentan observaciones de calidad.'}
  ],
  actions:[
   {priority:1,kind:'rollforward-reconciliation',title:'Conciliar 110 filas roll-forward por lote',detail:'Vincular arrastres de Isla Guafo/Curanue, Santa Rosa y Cesar/candelaria entre recepción, grado y destino.'},
   {priority:1,kind:'price-coverage',title:'Completar precio en 183 registros',detail:'La cobertura actual es 18,3%.'},
   {priority:2,kind:'packing-traceability',title:'Completar trazabilidad de 116 cajas',detail:'Asignar referencia de lote.'},
   {priority:2,kind:'ledger-quality',title:'Revisar 8 movimientos de CUENTA2',detail:'Corregir outliers antes de usar el saldo.'}
  ],
  supplierConcentration:{supplier:'Patricio Diaz',receivedKg:16401.4,sharePct:33.3}
 },
 exceptions:[{severity:'info',kind:'semantica-captura',title:'110 filas usan captura roll-forward por planta',detail:'Curanue/Isla Guafo, Santa Rosa y candelaria/Cesar registran grados o destinos con arrastre entre lotes. No se comparan fila a fila ni se atribuyen como error al proveedor.'}]
}

const categoryMix={
 ok:true,method:{version:'canonical-category-mix-v1.2-rollforward-semantics',rule:'La fuente 2026 usa dos semánticas distintas. Filas Pescamar de captura directa pueden compararse fila a fila. Curanue/Isla Guafo (lotes IG), Santa Rosa (MDQ) y candelaria/Cesar (MI) usan hojas de seguimiento por grado/destino con arrastre entre lotes; sus columnas no se suman contra una sola recepción.'},
 summary:{rows:224,rowMassBalanceRows:114,rollforwardRows:110,eligibleRows:113,massReviewRows:0,missingOutputRows:1,reconciledCategoryKg:18244.9},
 categories:[
  {label:'Vj100',kg:8540.8,sharePct:46.8},{label:'A1',kg:5109.9,sharePct:28},{label:'C1',kg:2343.3,sharePct:12.8},{label:'R',kg:1162.3,sharePct:6.4},{label:'Vj50',kg:941.1,sharePct:5.2},{label:'PT',kg:124.5,sharePct:.7},{label:'D',kg:23,sharePct:.1}
 ],
 suppliers:[
  {supplier:'Patricio Diaz',rows:92,receivedKg:16401.4,rowMassBalanceRows:48,rollforwardRows:44,massReviewRows:0,eligibleRows:48,massValidatedPct:100,reconciledCategoryKg:7265.5,captureMode:'mixed'},
  {supplier:'Eugenio Mardones',rows:50,receivedKg:12282,rowMassBalanceRows:0,rollforwardRows:50,massReviewRows:0,eligibleRows:0,massValidatedPct:null,reconciledCategoryKg:0,captureMode:'cross_lot_rollforward'},
  {supplier:'Gladys Mansilla',rows:43,receivedKg:11591,rowMassBalanceRows:43,rollforwardRows:0,massReviewRows:0,eligibleRows:42,massValidatedPct:100,reconciledCategoryKg:6986,captureMode:'row_mass_balance'}
 ],
 sites:[
  {site:'Pescamar',rows:115,receivedKg:31687.8,rowMassBalanceRows:114,rollforwardRows:1,massReviewRows:0,eligibleRows:113,massValidatedPct:100,reconciledCategoryKg:18244.9,captureMode:'mixed'},
  {site:'Curanue',rows:49,receivedKg:12016,rowMassBalanceRows:0,rollforwardRows:49,massReviewRows:0,eligibleRows:0,massValidatedPct:null,reconciledCategoryKg:0,captureMode:'cross_lot_rollforward'},
  {site:'Santa Rosa',rows:44,receivedKg:3692.2,rowMassBalanceRows:0,rollforwardRows:44,massReviewRows:0,eligibleRows:0,massValidatedPct:null,reconciledCategoryKg:0,captureMode:'cross_lot_rollforward'},
  {site:'candelaria',rows:16,receivedKg:1787.6,rowMassBalanceRows:0,rollforwardRows:16,massReviewRows:0,eligibleRows:0,massValidatedPct:null,reconciledCategoryKg:0,captureMode:'cross_lot_rollforward'}
 ]
}

async function mockApp(page:Page,role:'admin'|'quality'='admin'){
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  if(path==='/api/auth')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,operator:{id:`qa-${role}`,fullName:`QA ${role}`,email:`${role}@example.test`,role,plantIds:['ancud']}})})
  if(path==='/api/receptions')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({receptions:[]})})
  if(path==='/api/status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa',checkedAt:new Date().toISOString()})})
  if(path==='/api/pescamar-intelligence')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(role==='quality'?{...intelligence,finance:null}:intelligence)})
  if(path==='/api/canonical-category-mix')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(categoryMix)})
  return route.fulfill({status:200,contentType:'application/json',body:'{}'})
 })
}

test('canonical intelligence distinguishes roll-forward capture without inventing yield',async({page},testInfo)=>{
 await mockApp(page,'admin')
 await page.goto('/')
 await expect(page.getByRole('heading',{name:'Resultado de la data subida'})).toBeVisible()
 await expect(page.getByText('planilla de produccion 2026.xlsx',{exact:false})).toBeVisible()
 await expect(page.getByText('49.183,6 kg',{exact:true})).toBeVisible()
 await expect(page.getByText('11.292 kg',{exact:true})).toBeVisible()
 await expect(page.getByText('12.449,2 kg',{exact:true})).toBeVisible()
 await expect(page.getByText('114 directas',{exact:true})).toBeVisible()
 await expect(page.getByText(/110 roll-forward · 0 revisiones de masa reales/)).toBeVisible()
 await expect(page.getByRole('heading',{name:'Qué podemos decidir hoy'})).toBeVisible()
 await expect(page.getByText('Rendimiento · Bloqueado',{exact:true})).toBeVisible()
 await expect(page.getByText('Costo de compra · Bloqueado',{exact:true})).toBeVisible()
 await expect(page.getByText('Conciliar 110 filas roll-forward por lote',{exact:true})).toBeVisible()
 await expect(page.getByText('Completar precio en 183 registros',{exact:true})).toBeVisible()
 await expect(page.getByRole('heading',{name:'Mix de categorías comparables'})).toBeVisible()
 await expect(page.locator('b').filter({hasText:'18.244,9 kg'}).first()).toBeVisible()
 await expect(page.getByRole('cell',{name:'Vj100'})).toBeVisible()
 await expect(page.getByRole('cell',{name:'46,8%'})).toBeVisible()
 await expect(page.getByText('Eugenio Mardones',{exact:true})).toBeVisible()
 await expect(page.getByRole('cell',{name:'Roll-forward'}).first()).toBeVisible()
 await expect(page.getByText('110 filas usan captura roll-forward por planta',{exact:true})).toBeVisible()
 await expect(page.getByText(/100 filas requieren reconciliar/)).toHaveCount(0)
 await expect(page.getByText(/87,6% rendimiento/)).toHaveCount(0)
 await expect(page.getByText(/58,1% rendimiento/)).toHaveCount(0)
 await expect(page.getByText(/Saldo reconstruido del archivo/)).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
 await page.screenshot({path:testInfo.outputPath('canonical-intelligence-rollforward.png'),fullPage:true})
})

test('quality role does not receive financial canonical cards',async({page})=>{
 await mockApp(page,'quality')
 await page.goto('/')
 await expect(page.getByRole('heading',{name:'Resultado de la data subida'})).toBeVisible()
 await expect(page.getByText('Entradas cuenta',{exact:true})).toHaveCount(0)
 await expect(page.getByText('Transferencias recibidas',{exact:true})).toHaveCount(0)
})
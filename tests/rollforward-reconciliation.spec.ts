import {expect,test,type Page} from '@playwright/test'

type ResolutionMock={sheet_name:string;source_block:number;selected_main_source_row:number|null;resolution_status:'linked'|'unmatched'|'deferred';resolution_basis:string;review_note:string|null;reviewed_at:string;reviewed_by:string}

const rollforward={
 ok:true,
 method:{version:'rollforward-linkage-v2-support-evidence',rule:'Las hojas auxiliares se vinculan sólo cuando guía y/o lote identifican una fila única sin contradicción. Kilos aceptados o destinados/RGA no se publican como rendimiento.'},
 summary:{rows:110,chains:3,uniqueLots:74,uniqueGuides:68,receivedKg:17761.8,destinationRows:72,destinationCoveragePct:65.5,gradeRows:106,gradeCoveragePct:96.4,gradeObservationCount:241,unresolvedDestinationRows:38},
 support:{status:'ready',parserVersion:'production-support-v1',rows:332,blocks:89,autoLinkedBlocks:66,exactBoth:42,guideOnly:22,lotOnly:2,conflicts:19,ambiguous:0,unmatched:4,matchCoveragePct:74.2,matchedMainRows:66,mainCoveragePct:60},
 supportBlocks:[
  {key:'Isla Guafo-3',sheetName:'Isla Guafo',sourceBlock:3,familyKey:'IG',eventDate:'2026-04-07',supplier:'Eugenio Mardones',site:'Curanue',guide:'3343',lotReference:'ig02',notes:null,matchStatus:'exact_both',matchedSourceRow:5,guideCandidateRows:[5],lotCandidateRows:[5],grades:[{sourceRow:7,grade:'GA',guideKg:120,acceptedKg:105,destinedKg:18,flags:[]},{sourceRow:8,grade:'V',guideKg:80,acceptedKg:72,destinedKg:null,flags:[]}]},
  {key:'Isla Guafo-7',sheetName:'Isla Guafo',sourceBlock:7,familyKey:'IG',eventDate:'2026-04-08',supplier:'Eugenio Mardones',site:'Curanue',guide:'3346',lotReference:'ig05',notes:'revisar encabezado',matchStatus:'conflict',matchedSourceRow:null,guideCandidateRows:[7],lotCandidateRows:[8],grades:[{sourceRow:7,grade:'GA',guideKg:90,acceptedKg:81,destinedKg:12,flags:[]}]},
  {key:'Diaz termiando-10',sheetName:'Diaz termiando',sourceBlock:10,familyKey:'MDQ',eventDate:'2026-05-01',supplier:'Patricio Diaz',site:'Santa Rosa',guide:'4200',lotReference:null,notes:'debe 24 potes mas 5 kilos',matchStatus:'guide_only',matchedSourceRow:88,guideCandidateRows:[88],lotCandidateRows:[],grades:[{sourceRow:6,grade:'GA',guideKg:110,acceptedKg:100,destinedKg:20,flags:['missing_lot_reference']}]}
 ],
 chains:[
  {key:'IG-Eugenio Mardones-Curanue',familyKey:'IG',familyLabel:'Isla Guafo / Curanue',supplier:'Eugenio Mardones',site:'Curanue',rows:49,lots:34,guides:31,receivedKg:12016,destinationCoveragePct:71.4,guideCoveragePct:100,gradeCoveragePct:98,destinations:['Pescamar'],grades:['A1','Vj100','C1','R'],gradeObservationCount:108,status:'needs_destination',observations:[{sourceRow:42,eventDate:'2026-04-15',guide:'12345',supplier:'Eugenio Mardones',extractionZone:'Guafo',site:'Curanue',lot:'IG-01',guideKg:420,receivedKg:420,grades:[{grade:'A1',kg:120,boxes:6},{grade:'Vj100',kg:180,boxes:9}],destination:'Pescamar',notes:null,familyKey:'IG',familyLabel:'Isla Guafo / Curanue'}]},
  {key:'MDQ-Patricio Diaz-Santa Rosa',familyKey:'MDQ',familyLabel:'Santa Rosa / MDQ',supplier:'Patricio Diaz',site:'Santa Rosa',rows:44,lots:29,guides:27,receivedKg:3692.2,destinationCoveragePct:61.4,guideCoveragePct:97.7,gradeCoveragePct:95.5,destinations:['Pescamar'],grades:['A1','Vj100','C1'],gradeObservationCount:95,status:'needs_evidence',observations:[]},
  {key:'MI-Cesar-candelaria',familyKey:'MI',familyLabel:'Cesar / candelaria',supplier:'Cesar',site:'candelaria',rows:17,lots:11,guides:10,receivedKg:2053.6,destinationCoveragePct:58.8,guideCoveragePct:94.1,gradeCoveragePct:94.1,destinations:['Pescamar'],grades:['A1','Vj100','R'],gradeObservationCount:38,status:'needs_evidence',observations:[]}
 ]
}

async function mockApp(page:Page,role:'admin'|'quality'='admin',resolutions:ResolutionMock[]=[]){
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  if(path==='/api/auth')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,operator:{id:`qa-${role}`,fullName:`QA ${role}`,email:`${role}@example.test`,role,plantIds:['ancud']}})})
  if(path==='/api/status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa',checkedAt:new Date().toISOString()})})
  if(path==='/api/receptions')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({receptions:[]})})
  if(path==='/api/rollforward-reconciliation')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(rollforward)})
  if(path==='/api/rollforward-resolutions')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:'ready',resolutions})})
  if(path==='/api/rollforward-resolution')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,writesLive:false})})
  if(path==='/api/production-support-import')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,blocks:89,rows:332,flagged:23})})
  if(path==='/api/pescamar-intelligence')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,sources:{count:0,files:[]},production:{rows:0,guideKg:0,receivedKg:0,receptionPct:null,rowMassBalanceRows:0,rollforwardRows:110},suppliers:[],packing:[],packingSummary:{boxes:0,kg:0,lots:0,flagged:0},stock:[],finance:null,dataQuality:{totalRows:0,totalFlagged:0,flaggedPct:null,rowMassBalanceRows:0,rollforwardRows:110,massInconsistentRows:0},exceptions:[]})})
  if(path==='/api/canonical-category-mix')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,method:{version:'canonical-category-mix-v1.2-rollforward-semantics',rule:'test'},summary:{rows:0,rowMassBalanceRows:0,rollforwardRows:110,eligibleRows:0,massReviewRows:0,missingOutputRows:0,reconciledCategoryKg:0},categories:[],suppliers:[],sites:[]})})
  return route.fulfill({status:200,contentType:'application/json',body:'{}'})
 })
}

test('roll-forward workspace links support evidence and leaves contradictions for human review',async({page},testInfo)=>{
 await mockApp(page)
 await page.goto('/')
 await expect(page.getByRole('heading',{name:'Lote → grado → destino'})).toBeVisible()
 await expect(page.getByText('74,2%',{exact:true})).toBeVisible()
 await expect(page.getByText('66/89 bloques sin contradicción',{exact:true})).toBeVisible()
 await expect(page.getByRole('heading',{name:'Conflictos que no se auto-resuelven'})).toBeVisible()
 const conflict=page.getByRole('row').filter({hasText:'3346'}).filter({hasText:'ig05'}),cells=conflict.getByRole('cell')
 await expect(cells.nth(5)).toHaveText('7')
 await expect(cells.nth(6)).toHaveText('8')
 await expect(cells.nth(7)).toContainText('Conflicto')
 const evidence=page.locator('details').filter({hasText:'Isla Guafo · 3343'}).first()
 await expect(evidence).toBeAttached()
 await evidence.evaluate(element=>element.setAttribute('open',''))
 await expect(evidence.locator('th').filter({hasText:'Kg aceptados'})).toBeVisible()
 await expect(evidence.locator('th').filter({hasText:'D/RGA kg'})).toBeVisible()
 await expect(page.getByText(/aceptados o destinados\/RGA no se publican como rendimiento/)).toBeVisible()
 await expect(page.getByText(/58,1% rendimiento/)).toHaveCount(0)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
 await page.screenshot({path:testInfo.outputPath('rollforward-support-evidence.png'),fullPage:true})
})

test('quality sees effective coverage after an audited human resolution',async({page})=>{
 await mockApp(page,'quality',[{sheet_name:'Isla Guafo',source_block:7,selected_main_source_row:7,resolution_status:'linked',resolution_basis:'guide',review_note:'Guía física verificada por Calidad',reviewed_at:'2026-08-27T22:00:00Z',reviewed_by:'QA quality'}])
 await page.goto('/')
 const queue=page.getByRole('region',{name:'Revisión humana de conflictos roll-forward'})
 await expect(queue).toBeVisible()
 await expect(queue.getByText('0 pendientes',{exact:true})).toBeVisible()
 await expect(queue.getByText('100%',{exact:true})).toBeVisible()
 await expect(queue.getByText('3/3 bloques enlazados tras revisión',{exact:true})).toBeVisible()
 await expect(queue.getByText('3/110 filas roll-forward cubiertas',{exact:true})).toBeVisible()
 await expect(queue.getByText('1 vinculados · 0 sin vínculo · 0 pospuestos',{exact:true})).toBeVisible()
 const closed=queue.locator('details').filter({hasText:'Decisiones cerradas'}).first()
 await expect(closed).toBeAttached()
 await closed.evaluate(element=>element.setAttribute('open',''))
 await expect(closed.getByText('Guía física verificada por Calidad',{exact:true})).toBeVisible()
})

test('admin can republish exact canonical workbook into support staging',async({page})=>{
 await mockApp(page,'admin')
 await page.goto('/')
 await expect(page.getByRole('button',{name:'Publicar evidencia auxiliar'})).toBeVisible()
 await page.locator('input[type=file]').last().setInputFiles({name:'planilla de produccion 2026.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from('fixture')})
 await expect(page.getByText('89 bloques / 332 observaciones auxiliares publicadas.')).toBeVisible()
})

test('quality can inspect support evidence but cannot publish it',async({page})=>{
 await mockApp(page,'quality')
 await page.goto('/')
 await expect(page.getByRole('heading',{name:'Vínculo determinístico contra producción'})).toBeVisible()
 await expect(page.getByRole('button',{name:'Publicar evidencia auxiliar'})).toHaveCount(0)
})

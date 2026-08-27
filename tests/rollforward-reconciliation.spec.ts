import {expect,test,type Page} from '@playwright/test'

const rollforward={
 ok:true,
 method:{version:'rollforward-linkage-v1',rule:'Cada fila roll-forward conserva recepción, lote, guía, proveedor y planta. El sistema genera enlaces auditables lote → grado y, sólo cuando existe cliente explícito, grado → destino. Los kg de grado no se suman como rendimiento.'},
 summary:{rows:110,chains:3,uniqueLots:74,uniqueGuides:68,receivedKg:17761.8,destinationRows:72,destinationCoveragePct:65.5,gradeRows:106,gradeCoveragePct:96.4,gradeObservationCount:241,unresolvedDestinationRows:38},
 chains:[
  {key:'IG-Eugenio Mardones-Curanue',familyKey:'IG',familyLabel:'Isla Guafo / Curanue',supplier:'Eugenio Mardones',site:'Curanue',rows:49,lots:34,guides:31,receivedKg:12016,destinationCoveragePct:71.4,guideCoveragePct:100,gradeCoveragePct:98,destinations:['Pescamar'],grades:['A1','Vj100','C1','R'],gradeObservationCount:108,status:'needs_destination',observations:[{sourceRow:42,eventDate:'2026-04-15',guide:'12345',supplier:'Eugenio Mardones',extractionZone:'Guafo',site:'Curanue',lot:'IG-01',guideKg:420,receivedKg:420,grades:[{grade:'A1',kg:120,boxes:6},{grade:'Vj100',kg:180,boxes:9}],destination:'Pescamar',notes:null,familyKey:'IG',familyLabel:'Isla Guafo / Curanue'}]},
  {key:'MDQ-Patricio Diaz-Santa Rosa',familyKey:'MDQ',familyLabel:'Santa Rosa / MDQ',supplier:'Patricio Diaz',site:'Santa Rosa',rows:44,lots:29,guides:27,receivedKg:3692.2,destinationCoveragePct:61.4,guideCoveragePct:97.7,gradeCoveragePct:95.5,destinations:['Pescamar'],grades:['A1','Vj100','C1'],gradeObservationCount:95,status:'needs_evidence',observations:[]},
  {key:'MI-Cesar-candelaria',familyKey:'MI',familyLabel:'Cesar / candelaria',supplier:'Cesar',site:'candelaria',rows:17,lots:11,guides:10,receivedKg:2053.6,destinationCoveragePct:58.8,guideCoveragePct:94.1,gradeCoveragePct:94.1,destinations:['Pescamar'],grades:['A1','Vj100','R'],gradeObservationCount:38,status:'needs_evidence',observations:[]}
 ]
}

async function mockApp(page:Page){
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  if(path==='/api/auth')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,operator:{id:'qa-admin',fullName:'QA Admin',email:'admin@example.test',role:'admin',plantIds:['ancud']}})})
  if(path==='/api/status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa',checkedAt:new Date().toISOString()})})
  if(path==='/api/receptions')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({receptions:[]})})
  if(path==='/api/rollforward-reconciliation')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(rollforward)})
  if(path==='/api/pescamar-intelligence')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,sources:{count:0,files:[]},production:{rows:0,guideKg:0,receivedKg:0,receptionPct:null,rowMassBalanceRows:0,rollforwardRows:110},suppliers:[],packing:[],packingSummary:{boxes:0,kg:0,lots:0,flagged:0},stock:[],finance:null,dataQuality:{totalRows:0,totalFlagged:0,flaggedPct:null,rowMassBalanceRows:0,rollforwardRows:110,massInconsistentRows:0},exceptions:[]})})
  if(path==='/api/canonical-category-mix')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,method:{version:'canonical-category-mix-v1.2-rollforward-semantics',rule:'test'},summary:{rows:0,rowMassBalanceRows:0,rollforwardRows:110,eligibleRows:0,massReviewRows:0,missingOutputRows:0,reconciledCategoryKg:0},categories:[],suppliers:[],sites:[]})})
  return route.fulfill({status:200,contentType:'application/json',body:'{}'})
 })
}

test('roll-forward workspace exposes auditable lot grade destination links without inventing yield',async({page},testInfo)=>{
 await mockApp(page)
 await page.goto('/')
 await expect(page.getByRole('heading',{name:'Lote → grado → destino'})).toBeVisible()
 await expect(page.getByText('110',{exact:true}).last()).toBeVisible()
 await expect(page.getByText('65,5%',{exact:true})).toBeVisible()
 await expect(page.getByText('38',{exact:true}).last()).toBeVisible()
 const ig=page.getByRole('row').filter({hasText:'Isla Guafo / Curanue'})
 await expect(ig.getByText('Eugenio Mardones',{exact:true})).toBeVisible()
 await expect(ig.getByText('49',{exact:true})).toBeVisible()
 await expect(ig.getByText('12.016 kg',{exact:true})).toBeVisible()
 await expect(ig.getByText('Falta destino',{exact:true})).toBeVisible()
 await page.getByText('Isla Guafo / Curanue · Eugenio Mardones',{exact:true}).click()
 await expect(page.getByRole('cell',{name:'IG-01'})).toBeVisible()
 await expect(page.getByText('A1 120 kg · Vj100 180 kg',{exact:true})).toBeVisible()
 await expect(page.getByText(/kg de grado no se suman como rendimiento/)).toBeVisible()
 await expect(page.getByText(/58,1% rendimiento/)).toHaveCount(0)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
 await page.screenshot({path:testInfo.outputPath('rollforward-reconciliation.png'),fullPage:true})
})

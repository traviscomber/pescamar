import {expect,test,type Page} from '@playwright/test'

const mix={
 ok:true,method:{version:'canonical-category-mix-v1.2-rollforward-semantics',rule:'La fuente 2026 usa dos semánticas distintas. Filas Pescamar de captura directa pueden compararse fila a fila. Curanue/Isla Guafo (lotes IG), Santa Rosa (MDQ) y candelaria/Cesar (MI) usan hojas de seguimiento por grado/destino con arrastre entre lotes; sus columnas no se suman contra una sola recepción. Esas filas se conservan como evidencia roll-forward y no se marcan como inconsistencia del proveedor.'},
 summary:{rows:224,rowMassBalanceRows:114,rollforwardRows:110,eligibleRows:113,massReviewRows:0,missingOutputRows:1,reconciledCategoryKg:18244.9},
 categories:[{label:'Vj100',kg:8540.8,sharePct:46.8},{label:'A1',kg:5109.9,sharePct:28}],suppliers:[],
 sites:[
  {site:'Pescamar',rows:115,receivedKg:31687.8,rowMassBalanceRows:114,rollforwardRows:1,massReviewRows:0,eligibleRows:113,massValidatedPct:100,reconciledCategoryKg:18244.9,captureMode:'mixed'},
  {site:'Curanue',rows:49,receivedKg:12016,rowMassBalanceRows:0,rollforwardRows:49,massReviewRows:0,eligibleRows:0,massValidatedPct:null,reconciledCategoryKg:0,captureMode:'cross_lot_rollforward'},
  {site:'Santa Rosa',rows:44,receivedKg:3692.2,rowMassBalanceRows:0,rollforwardRows:44,massReviewRows:0,eligibleRows:0,massValidatedPct:null,reconciledCategoryKg:0,captureMode:'cross_lot_rollforward'},
  {site:'candelaria',rows:16,receivedKg:1787.6,rowMassBalanceRows:0,rollforwardRows:16,massReviewRows:0,eligibleRows:0,massValidatedPct:null,reconciledCategoryKg:0,captureMode:'cross_lot_rollforward'}
 ]
}

async function mockApp(page:Page){
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  if(path==='/api/auth')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,operator:{id:'qa-admin',fullName:'QA Admin',email:'admin@example.test',role:'admin',plantIds:['ancud']}})})
  if(path==='/api/status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa',checkedAt:new Date().toISOString()})})
  if(path==='/api/receptions')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({receptions:[]})})
  if(path==='/api/pescamar-intelligence')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,sources:{count:0,files:[]},production:{rows:0,guideKg:0,receivedKg:0,receptionPct:null,rowMassBalanceRows:0,rollforwardRows:0},suppliers:[],packing:[],packingSummary:{boxes:0,kg:0,lots:0,flagged:0},stock:[],finance:null,dataQuality:{totalRows:0,totalFlagged:0,flaggedPct:null,rowMassBalanceRows:0,rollforwardRows:0,massInconsistentRows:0},exceptions:[]})})
  if(path==='/api/canonical-category-mix')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(mix)})
  return route.fulfill({status:200,contentType:'application/json',body:'{}'})
 })
}

test('canonical capture intelligence distinguishes roll-forward plants from direct mass balance',async({page},testInfo)=>{
 await mockApp(page)
 await page.goto('/inicio/detalle')
 await expect(page.getByRole('heading',{name:'Cómo registra cada planta'})).toBeVisible()
 const pescamar=page.getByRole('row').filter({hasText:'Pescamar'}),curanue=page.getByRole('row').filter({hasText:'Curanue'}),santaRosa=page.getByRole('row').filter({hasText:'Santa Rosa'}),candelaria=page.getByRole('row').filter({hasText:'candelaria'})
 await expect(pescamar.getByText('Mixta',{exact:true})).toBeVisible()
 await expect(pescamar.getByText('114',{exact:true})).toBeVisible()
 await expect(pescamar.getByText('1',{exact:true})).toBeVisible()
 await expect(curanue.getByText('Roll-forward',{exact:true})).toBeVisible()
 await expect(curanue.getByText('49',{exact:true}).last()).toBeVisible()
 await expect(santaRosa.getByText('Roll-forward',{exact:true})).toBeVisible()
 await expect(santaRosa.getByText('44',{exact:true}).last()).toBeVisible()
 await expect(candelaria.getByText('Roll-forward',{exact:true})).toBeVisible()
 await expect(candelaria.getByText('16',{exact:true}).last()).toBeVisible()
 await expect(page.getByText(/Un lote IG detectado dentro de Pescamar conserva la semántica de Isla Guafo/)).toBeVisible()
 await expect(page.getByText(/no se marcan como inconsistencia del proveedor/)).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
 await page.screenshot({path:testInfo.outputPath('canonical-capture-semantics.png'),fullPage:true})
})

import {expect,test,type Page} from '@playwright/test'

const mix={
 ok:true,method:{version:'canonical-category-mix-v1.1-capture-pattern',rule:'La distribución por planta se muestra para detectar diferencias de captura antes de atribuirlas al proveedor.'},
 summary:{rows:224,eligibleRows:121,excludedRows:100,missingOutputRows:3,reconciledCategoryKg:19384.2},
 categories:[{label:'Vj100',kg:9249.6,sharePct:47.7},{label:'A1',kg:5226.8,sharePct:27}],
 suppliers:[],
 sites:[
  {site:'Pescamar',rows:115,receivedKg:31687.8,massReviewRows:1,eligibleRows:113,massReconciledPct:99.1,reconciledCategoryKg:18244.9},
  {site:'Curanue',rows:49,receivedKg:12016,massReviewRows:48,eligibleRows:0,massReconciledPct:2,reconciledCategoryKg:0},
  {site:'Santa Rosa',rows:44,receivedKg:3692.2,massReviewRows:41,eligibleRows:2,massReconciledPct:6.8,reconciledCategoryKg:345.3},
  {site:'candelaria',rows:16,receivedKg:1787.6,massReviewRows:10,eligibleRows:6,massReconciledPct:37.5,reconciledCategoryKg:794}
 ]
}

async function mockApp(page:Page){
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  if(path==='/api/auth')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,operator:{id:'qa-admin',fullName:'QA Admin',email:'admin@example.test',role:'admin',plantIds:['ancud']}})})
  if(path==='/api/status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa',checkedAt:new Date().toISOString()})})
  if(path==='/api/receptions')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({receptions:[]})})
  if(path==='/api/pescamar-intelligence')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,sources:{count:0,files:[]},production:{rows:0,guideKg:0,receivedKg:0,receptionPct:null},suppliers:[],packing:[],packingSummary:{boxes:0,kg:0,lots:0,flagged:0},stock:[],finance:null,dataQuality:{totalRows:0,totalFlagged:0,flaggedPct:null,massInconsistentRows:0},exceptions:[]})})
  if(path==='/api/canonical-category-mix')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(mix)})
  return route.fulfill({status:200,contentType:'application/json',body:'{}'})
 })
}

test('canonical capture intelligence exposes process-site reconciliation pattern',async({page},testInfo)=>{
 await mockApp(page)
 await page.goto('/')
 await expect(page.getByRole('heading',{name:'Reconciliación por planta de proceso'})).toBeVisible()
 const pescamar=page.getByRole('row').filter({hasText:'Pescamar'}),curanue=page.getByRole('row').filter({hasText:'Curanue'}),santaRosa=page.getByRole('row').filter({hasText:'Santa Rosa'}),candelaria=page.getByRole('row').filter({hasText:'candelaria'})
 await expect(pescamar.getByText('99,1%')).toBeVisible()
 await expect(pescamar.getByText('1',{exact:true})).toBeVisible()
 await expect(curanue.getByText('2%')).toBeVisible()
 await expect(curanue.getByText('48',{exact:true})).toBeVisible()
 await expect(santaRosa.getByText('6,8%')).toBeVisible()
 await expect(santaRosa.getByText('41',{exact:true})).toBeVisible()
 await expect(candelaria.getByText('37,5%')).toBeVisible()
 await expect(page.getByText(/antes de atribuir el problema al proveedor/)).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
 await page.screenshot({path:testInfo.outputPath('canonical-capture-pattern.png'),fullPage:true})
})

import {expect,test,type Page} from '@playwright/test'

const scorePayload={ok:true,suppliers:[
 {supplier:'Proveedor A',score:90,coverage:92,confidence:'alta',components:[{key:'quality',weight:30,score:94},{key:'yield',weight:25,score:90},{key:'consistency',weight:15,score:88},{key:'compliance',weight:10,score:92},{key:'profitability',weight:10,score:null},{key:'incidents',weight:10,score:93}]},
 {supplier:'Proveedor B',score:78,coverage:80,confidence:'media',components:[{key:'quality',weight:30,score:82},{key:'yield',weight:25,score:78},{key:'consistency',weight:15,score:74},{key:'compliance',weight:10,score:80},{key:'profitability',weight:10,score:null},{key:'incidents',weight:10,score:76}]},
]}
const economics={ok:true,suppliers:[{supplier:'Proveedor A',score:72},{supplier:'Proveedor B',score:61}]}
const support={ok:true,status:'ready',summary:{blocks:89,observations:332,autoLinkedBlocks:88,exceptions:1},suppliers:[{supplier:'Proveedor B',physicalBlocks:12,autoLinkedBlocks:11,exceptions:1,unresolved:[{sheetName:'Diaz termiando',sourceBlock:99,guide:'180',lotReference:'mdq106',status:'unmatched'}]}]}
const readiness={plants:[{plantId:'ancud',score:84,completed:8,total:10,metrics:{receptions:8},checks:[]},{plantId:'quellon',score:58,completed:6,total:10,metrics:{receptions:2},checks:[]}]}

async function mockHome(page:Page){
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  const json=(body:unknown)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)})
  if(path==='/api/auth')return json({ok:true,operator:{id:'admin-1',fullName:'Admin QA',email:'admin@example.test',role:'admin',plantIds:['ancud','quellon']}})
  if(path==='/api/status')return json({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:10},commit:'qa',checkedAt:new Date().toISOString()})
  if(path==='/api/receptions')return json({receptions:[]})
  if(path==='/api/supplier-intelligence')return json(scorePayload)
  if(path==='/api/supplier-economic-intelligence')return json(economics)
  if(path==='/api/supplier-support-intelligence')return json(support)
  if(path==='/api/plant-readiness')return json(readiness)
  if(path==='/api/rollforward-reconciliation')return json({ok:true,support:{blocks:89,rows:332},summary:{autoLinkedBlocks:88,conflicts:0,ambiguous:0,unmatched:1},blocks:[]})
  if(path==='/api/rollforward-resolutions')return json({ok:true,resolutions:[]})
  if(path==='/api/canonical-status')return json({sources:[],datasets:{}})
  if(path==='/api/canonical-category-mix')return json({ok:true,categories:[]})
  return json({ok:true})
 })
}

test('home surfaces one coherent purchase, evidence, supplier and plant decision brief',async({page},testInfo)=>{
 await mockHome(page)
 await page.goto('/')
 await expect(page.getByRole('heading',{name:'Qué necesita atención ahora'})).toBeVisible()
 await expect(page.getByText('Proveedor A',{exact:true})).toBeVisible()
 await expect(page.getByText(/Priorizar compra · score compra/)).toBeVisible()
 await expect(page.getByText('88/89 cadenas',{exact:true})).toBeVisible()
 await expect(page.getByText('Proveedor B',{exact:true})).toBeVisible()
 await expect(page.getByText(/Revisar trazabilidad/)).toBeVisible()
 await expect(page.getByText('quellon · 58%',{exact:true})).toBeVisible()
 await expect(page.getByText(/Diaz termiando · bloque 99 · guía 180 · lote mdq106/)).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
 await page.screenshot({path:testInfo.outputPath('executive-decision-brief.png'),fullPage:true})
})

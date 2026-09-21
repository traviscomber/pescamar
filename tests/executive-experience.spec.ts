import {expect,test,type Page} from '@playwright/test'

async function mockSession(page:Page,operator:Record<string,unknown>){
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  const json=(body:unknown)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)})
  if(path==='/api/auth')return json({ok:true,operator})
  if(path==='/api/status')return json({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa',checkedAt:new Date().toISOString()})
  if(path==='/api/daily-close')return json({ok:true,snapshot:null,history:[]})
  if(path==='/api/operational-intelligence-overview')return json({schemaVersion:'seafood.operational-intelligence.overview.v1',lots:0,counts:{p1:0,p2:0,p3:0},topSignals:[],boundary:{writesOperationalState:false,liveOnly:true,historicalIncluded:false}})
  if(path==='/api/receptions')return json({receptions:[]})
  if(path==='/api/history')return json({records:[],summary:null})
  return json({ok:true})
 })
}

async function openNavigation(page:Page,projectName:string){
 if(projectName!=='mobile-chromium')return
 const trigger=page.getByRole('button',{name:/Abrir menú|Open menu/})
 await expect(trigger).toBeVisible()
 await trigger.click()
 await expect(page.locator('.sidebar')).toHaveClass(/is-open/)
}

test('executive flag enables CEO experience without email matching',async({page},testInfo)=>{
 await mockSession(page,{id:'op-ceo',fullName:'Ejecutivo QA',email:'cualquiera@example.test',role:'admin',plantIds:['ancud'],executiveExperience:true})
 await page.goto('/')
 await openNavigation(page,testInfo.project.name)
 await expect(page.getByRole('navigation',{name:'Dirección'})).toBeVisible()
 await expect(page.getByRole('navigation',{name:'Trabajo diario'})).toHaveCount(0)
 if(testInfo.project.name!=='mobile-chromium')await expect(page.getByRole('button',{name:/Ejecutivo QA · CEO/})).toBeVisible()
})

test('admin without executive flag keeps the standard daily view',async({page},testInfo)=>{
 await mockSession(page,{id:'op-admin',fullName:'Admin QA',email:'admin@example.test',role:'admin',plantIds:['ancud']})
 await page.goto('/')
 await openNavigation(page,testInfo.project.name)
 await expect(page.getByRole('navigation',{name:'Trabajo diario'})).toBeVisible()
 await expect(page.getByRole('navigation',{name:'Dirección'})).toHaveCount(0)
})

test('english locale renders keyed navigation labels instead of Spanish defaults',async({page},testInfo)=>{
 await mockSession(page,{id:'op-admin',fullName:'Admin QA',email:'admin@example.test',role:'admin',plantIds:['ancud']})
 await page.goto('/en/')
 await openNavigation(page,testInfo.project.name)
 await expect(page.getByRole('navigation',{name:'Daily work'})).toBeVisible()
 await expect(page.getByRole('navigation',{name:'Reference and settings'})).toBeVisible()
 await expect(page.getByRole('navigation',{name:'Trabajo diario'})).toHaveCount(0)
})

test('english locale renders keyed Lot360 chrome',async({page})=>{
 await mockSession(page,{id:'op-admin',fullName:'Admin QA',email:'admin@example.test',role:'admin',plantIds:['ancud']})
 const json=(body:unknown)=>route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)})
 await page.route('**/api/lot-360*',json({reception:{id:'qa-reception-1',reception_number:'QA-1',plant_id:'ancud',species:'Erizo',extraction_zone:'Guafo',source_reference:'guia-180',guide_kg:null,gross_kg:null,tare_kg:null,drained_kg:null,accepted_kg:120,temperature_c:null,quality_status:'Conforme',status:'accepted',source:'plant',received_at:'2026-09-20T10:00:00.000Z',supplier:'Proveedor QA',evidence:[]},events:[],commercial:{visible:false}}))
 await page.route('**/api/lot-control-card*',json({state:{code:'open',label:'En operación',tone:'ready'},blocker:null,blockers:[],nextAction:'Continuar operación',nextRoute:'/',signals:{quality:{label:'Conforme',detail:null,tone:'ready'},balance:{inputKg:120,outputKg:96,yieldPct:80,lossKg:24,tone:'ready'},release:{label:'Sin evidencia',tone:'info',kind:'evidence'}},evidence:{count:0},diagnosis:{state:'clear',blockers:[],nextAction:'Continuar operación',unknowns:[]}}))
 await page.route('**/api/sea-urchin-graph*',json({schemaVersion:'seafood.graph.v1',nodes:[],summary:{nodes:0,attention:0,pending:0,japanReleasable:null}}))
 await page.route('**/api/lot-lifecycle*',json({available:true,state:'open',latest:null,gate:{canClose:false,blockers:[],unknowns:[]},permissions:{canClose:true,canReopen:false}}))
 await page.goto('/en/lotes/qa-reception-1')
 await expect(page.getByRole('heading',{name:'REC-QA-1'})).toBeVisible({timeout:15000})
 await expect(page.getByRole('link',{name:'Back to receptions'})).toBeVisible()
 await expect(page.getByText('Current status')).toBeVisible()
 await expect(page.getByRole('link',{name:'Continue operation'})).toBeVisible()
 await expect(page.getByRole('button',{name:'Ask the assistant'})).toBeVisible()
 await expect(page.getByText('Mass balance')).toBeVisible()
 await expect(page.getByText('View traceability')).toBeVisible()
 await expect(page.getByText('View evidence and records')).toBeVisible()
 await expect(page.getByText('Ver trazabilidad')).toHaveCount(0)
})

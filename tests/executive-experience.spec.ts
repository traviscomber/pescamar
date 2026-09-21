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

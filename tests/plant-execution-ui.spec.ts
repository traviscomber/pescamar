import {expect,test,type Page} from '@playwright/test'

async function mockPlantExecution(page:Page){
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname
    const json=(body:unknown)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)})
    if(path==='/api/auth')return json({ok:true,operator:{id:'qa-admin',fullName:'QA Admin',email:'admin@example.test',role:'admin',plantIds:['ancud']}})
    if(path==='/api/status')return json({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa',checkedAt:new Date().toISOString()})
    if(path==='/api/receptions')return json({receptions:[]})
    if(path==='/api/history')return json({records:[],summary:null})
    if(path==='/api/planning')return json({recommendations:[],blockedLots:[],dailyPlan:[],plannerReadiness:{capacityConfigured:true,activeLines:1,message:'ready'}})
    if(path==='/api/plant-execution')return json({ok:true,writesEnabled:false,mode:'safe'})
    if(path==='/api/plant-stations')return json({ok:true,stations:[]})
    if(path==='/api/pallets')return json({writesEnabled:true,pallets:[]})
    if(path==='/api/packing-units')return json({units:[]})
    if(path==='/api/cold-chain')return json({writesEnabled:true,assets:[],runs:[]})
    if(path==='/api/regulatory-holds')return json({writesEnabled:true,holds:[]})
    if(path==='/api/regulatory-targets')return json({receptions:[],units:[]})
    if(path==='/api/materials-inventory')return json({items:[],movements:[],suppliers:[],permissions:{canWrite:true}})
    if(path==='/api/product-labels')return json({labels:[],lots:[],messages:[],releases:[],summary:{validated:0,blocked:0,pending:0},permissions:{canWrite:true}})
    if(path==='/api/label-engine')return json({ok:true,writesEnabled:true,templates:[],jobs:[]})
    if(path==='/api/label-engine-options')return json({ok:true,packingUnits:[],labels:[],printers:[]})
    return json({})
  })
}

async function stable(page:Page){expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)}
async function noShadow(locator:ReturnType<Page['locator']>){expect(await locator.evaluate(el=>getComputedStyle(el).boxShadow)).toBe('none')}

for(const scenario of [
  {path:'/planificacion',heading:'Plan diario de producción',shot:'planning-execution.png'},
  {path:'/floor',heading:'Estación de planta',shot:'floor-execution.png'},
  {path:'/pallets',heading:'Palletización',shot:'pallets-execution.png'},
  {path:'/frio',heading:'Cadena de frío',shot:'cold-execution.png'},
  {path:'/control-regulatorio',heading:'Control regulatorio',shot:'regulatory-execution.png'},
  {path:'/inventario-materiales',heading:'Materias primas e insumos',shot:'materials-execution.png'},
  {path:'/etiquetas',heading:'Etiquetas Pescamar',shot:'labels-execution.png'},
  {path:'/impresion-etiquetas',heading:'Impresión de etiquetas',shot:'label-print-execution.png'},
]){
  test(`${scenario.heading} keeps task-first hierarchy`,async({page},testInfo)=>{
    await mockPlantExecution(page)
    await page.goto(scenario.path)
    await expect(page.getByRole('heading',{name:scenario.heading,exact:true})).toBeVisible()
    await stable(page)
    if(scenario.path==='/planificacion'){
      const workspace=page.locator('.planning-workspace');await expect(workspace).toBeVisible();await noShadow(workspace)
    }
    if(scenario.path==='/floor'){
      const instruments=page.locator('.floor-status-strip>div');await expect(instruments).toHaveCount(4);await noShadow(instruments.first())
      const gate=page.locator('.floor-next-gate');await expect(gate).toBeVisible();await noShadow(gate)
    }
    if(['/pallets','/frio','/control-regulatorio'].includes(scenario.path)){
      const nav=page.locator('.page-header .row-actions').filter({has:page.getByRole('link',{name:'Pallets'})});await expect(nav).toBeVisible()
      const trace=page.locator('.signal-grid ~ .panel').filter({has:page.locator('.compact-ledger')}).last();await expect(trace).toBeVisible();await noShadow(trace)
    }
    if(scenario.path==='/inventario-materiales'){
      const ledger=page.locator('.signal-grid + .panel').first();await expect(ledger).toBeVisible();await noShadow(ledger)
    }
    if(['/etiquetas','/impresion-etiquetas'].includes(scenario.path)){
      const trace=page.locator('.signal-grid ~ .panel').filter({has:page.locator('.compact-ledger')}).last();await expect(trace).toBeVisible();await noShadow(trace)
    }
    await page.screenshot({path:testInfo.outputPath(scenario.shot),fullPage:true})
  })
}

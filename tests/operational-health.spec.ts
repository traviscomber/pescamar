import {expect,test,type Page} from '@playwright/test'

type Role='admin'|'operations'|'finance'|'quality'|'viewer'
const health={ok:true,status:'stuck',summary:{checks:7,healthy:2,degraded:4,stuck:1,broken:0,critical:1,warnings:3},checks:[
 {key:'database',label:'Base operacional',status:'healthy',detail:'Postgres responde.',metrics:{connected:true}},
 {key:'canonical',label:'Fuentes canónicas',status:'healthy',detail:'Las 3 fuentes aprobadas están registradas.',metrics:{registered:3,expected:3}},
 {key:'support-v2',label:'Trazabilidad física v2',status:'degraded',detail:'Conteo observado 89 cadenas / 332 observaciones.',metrics:{blocks:89,observations:332,zeroObservationBlocks:1}},
 {key:'process',label:'Proceso erizo',status:'stuck',detail:'1 run abierto lleva más de 24 h sin actualización.',metrics:{openRuns:2,staleRuns:1,stageAttention:1}},
 {key:'vision',label:'Vision / color',status:'degraded',detail:'Uni Vision aún no tiene referencias de color activas aprobadas.',metrics:{openAiConfigured:true,activeReferences:0}},
 {key:'communications',label:'WhatsApp Intelligence',status:'degraded',detail:'Canales configurados, pero todavía no hay mensajes raw ingeridos.',metrics:{webhookConfigured:true,activeChannels:20,messages:0}},
 {key:'automation',label:'Supervisión automática',status:'degraded',detail:'El health es live bajo demanda; no hay cron de supervisión declarado en producción.',metrics:{scheduledHealthCheck:false}},
],alerts:[
 {id:'process-stale',severity:'critical',domain:'process',title:'Proceso de erizo estancado',detail:'1 run abierto supera 24 h sin actualización.',actionPath:'/proceso-erizo'},
 {id:'vision-references',severity:'warning',domain:'vision',title:'Referencias de color pendientes',detail:'Uni Vision requiere referencias reales aprobadas.',actionPath:'/proceso-erizo'},
 {id:'whatsapp-no-messages',severity:'warning',domain:'communications',title:'WhatsApp sin ingesta observada',detail:'Hay canales configurados, pero no existe evidencia raw recibida todavía.',actionPath:'/comunicaciones'},
 {id:'health-manual',severity:'info',domain:'platform',title:'Supervisión todavía bajo demanda',detail:'El siguiente paso es scheduler autenticado.',actionPath:'/observabilidad'},
],method:{version:'operational-health-v1',staleProcessHours:24,scheduledHealthCheck:false},deployment:{environment:'preview',commit:'qa-health-01'},checkedAt:'2026-08-28T02:00:00.000Z'}

async function mock(page:Page,role:Role='admin'){
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  const json=(body:unknown)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)})
  if(path==='/api/auth')return json({ok:true,operator:{id:`qa-${role}`,fullName:`QA ${role}`,email:`${role}@example.test`,role,plantIds:['ancud']}})
  if(path==='/api/status')return json({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa',checkedAt:new Date().toISOString()})
  if(path==='/api/receptions')return json({receptions:[]})
  if(path==='/api/operational-health')return json(health)
  if(path==='/api/supplier-intelligence')return json({ok:true,suppliers:[]})
  if(path==='/api/supplier-economic-intelligence')return json({ok:true,suppliers:[]})
  if(path==='/api/supplier-support-intelligence')return json({ok:true,status:'not_imported',summary:{blocks:0,observations:0,autoLinkedBlocks:0,exceptions:0},suppliers:[]})
  if(path==='/api/plant-readiness')return json({plants:[]})
  if(path==='/api/rollforward-reconciliation')return json({ok:true,support:{blocks:0,rows:0},summary:{autoLinkedBlocks:0,conflicts:0,ambiguous:0,unmatched:0},blocks:[]})
  if(path==='/api/rollforward-resolutions')return json({ok:true,resolutions:[]})
  if(path==='/api/canonical-status')return json({sources:[],datasets:{}})
  if(path==='/api/canonical-category-mix')return json({ok:true,categories:[]})
  return json({ok:true})
 })
}

test('home surfaces compact operational alerts without horizontal overflow',async({page},testInfo)=>{
 await mock(page,'admin')
 await page.goto('/')
 await expect(page.getByRole('heading',{name:/Atascado · 1 críticas · 3 warning/})).toBeVisible()
 await expect(page.getByText('Proceso de erizo estancado',{exact:true})).toBeVisible()
 await expect(page.getByText('Referencias de color pendientes',{exact:true})).toBeVisible()
 await expect(page.getByText('WhatsApp sin ingesta observada',{exact:true})).toBeVisible()
 await expect(page.getByRole('link',{name:/Abrir control plane/})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
 await page.screenshot({path:testInfo.outputPath('operational-health-home.png'),fullPage:true})
})

test('operations and quality can inspect expanded control plane',async({page},testInfo)=>{
 const role=testInfo.project.name==='mobile-chromium'?'quality':'operations'
 await mock(page,role)
 await page.goto('/observabilidad')
 await expect(page.getByRole('heading',{name:'Observabilidad y alertas'})).toBeVisible()
 await expect(page.getByText('Proceso erizo',{exact:true})).toBeVisible()
 await expect(page.getByText('1 run abierto lleva más de 24 h sin actualización.',{exact:true})).toBeVisible()
 await expect(page.getByText('scheduledHealthCheck',{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
})

test('finance cannot open operational observability',async({page})=>{
 await mock(page,'finance')
 await page.goto('/observabilidad')
 await expect(page).toHaveURL(/\/$/)
 await expect(page.getByRole('heading',{name:'Observabilidad y alertas'})).toHaveCount(0)
})

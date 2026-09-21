import {expect,test,type Page} from '@playwright/test'

type Role='admin'|'operations'|'finance'|'quality'|'viewer'

const insights={
 ok:true,
 generatedAt:'2026-09-20T15:00:00.000Z',
 routes:[
  {path:'/',visits_7d:12,operators_7d:3,visits_30d:40,operators_30d:5},
  {path:'/recepciones',visits_7d:8,operators_7d:2,visits_30d:25,operators_30d:4},
 ],
 dailyActive:[
  {day:'2026-09-19',operators:3},
  {day:'2026-09-20',operators:2},
 ],
 latestEvents:[
  {created_at:'2026-09-20T15:00:00.000Z',operator_id:'11111111-1111-4111-8111-111111111111',operator_name:'QA Admin',role:'admin',event:'route_visited',path:'/recepciones'},
  {created_at:'2026-09-20T14:58:00.000Z',operator_id:'11111111-1111-4111-8111-111111111111',operator_name:null,role:'admin',event:'route_visited',path:'/'},
 ],
 feedback:{
  total:10,up:7,down:3,pctUp:70,
  recentDowns:[
   {created_at:'2026-09-20T12:00:00.000Z',operator_name:'QA Admin',comment:'Respuesta genérica',question:'¿Cuál es el rendimiento del lote 42?',answer:'El lote muestra parámetros estándar.'},
  ],
 },
}

async function mock(page:Page,role:Role='admin'){
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  const json=(body:unknown,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)})
  if(path==='/api/auth')return json({ok:true,operator:{id:`qa-${role}`,fullName:`QA ${role}`,email:`${role}@example.test`,role,plantIds:['ancud']}})
  if(path==='/api/status')return json({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa12345',checkedAt:'2026-09-20T15:00:00.000Z'})
  if(path==='/api/pilot-insights')return role==='admin'?json(insights):json({ok:false,error:'forbidden'},403)
  if(path==='/api/pilot-events')return json({ok:true,received:1},201)
  return json({ok:true})
 })
}

test('admin sees pilot telemetry with routes, adoption, events and Seafood AI feedback',async({page},testInfo)=>{
 await mock(page,'admin')
 await page.goto('/admin/pilotaje')
 await expect(page.getByRole('heading',{name:'Pilotaje'})).toBeVisible()
 const routes=page.getByLabel('Visitas por ruta')
 await expect(routes.getByText('/recepciones',{exact:true})).toBeVisible()
 await expect(routes.getByText('40',{exact:true})).toBeVisible()
 const adoption=page.getByLabel('Operadores activos por día')
 await expect(adoption.getByText(/20[-/.]0?9[-/.]2026/)).toBeVisible()
 const events=page.getByLabel('Últimos eventos')
 await expect(events.getByText('QA Admin · admin')).toBeVisible()
 await expect(events.getByText('/recepciones').first()).toBeVisible()
 const feedback=page.getByLabel('Feedback de Seafood AI')
 await expect(feedback.getByText('10',{exact:true})).toBeVisible()
 await expect(feedback.getByText('7 · 70%')).toBeVisible()
 await expect(feedback.getByText('¿Cuál es el rendimiento del lote 42?')).toBeVisible()
 await expect(page.getByText(/criterio de reactivación de UX/)).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
 await page.screenshot({path:testInfo.outputPath('admin-pilotaje.png'),fullPage:true})
})

test('finance is redirected away from pilot page',async({page})=>{
 await mock(page,'finance')
 await page.goto('/admin/pilotaje')
 await expect(page).toHaveURL(/\/es\/?$/)
 await expect(page.getByRole('heading',{name:'Pilotaje'})).toHaveCount(0)
})

test('client beacon batches a route visit without query strings',async({page})=>{
 await page.addInitScript(()=>{
  const w=window as unknown as {__pilotBeacons:{url:string;body:string}[]}
  w.__pilotBeacons=[]
  const original=navigator.sendBeacon.bind(navigator)
  navigator.sendBeacon=(url,data)=>{void new Response(data??null).text().then(body=>w.__pilotBeacons.push({url:String(url),body}));return original(url,data)}
 })
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  const json=(body:unknown,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)})
  if(path==='/api/auth')return json({ok:true,operator:{id:'11111111-1111-4111-8111-111111111111',fullName:'QA Admin',email:'admin@example.test',role:'admin',plantIds:['ancud']}})
  if(path==='/api/status')return json({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa12345',checkedAt:'2026-09-20T15:00:00.000Z'})
  if(path==='/api/pilot-events')return json({ok:true,received:1},201)
  return json({ok:true})
 })
 await page.goto('/recepciones?plantId=ancud&secreto=1')
 await page.waitForSelector('.app-shell')
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')))
 await expect.poll(async()=>page.evaluate(()=>(window as unknown as {__pilotBeacons:{url:string;body:string}[]}).__pilotBeacons.length)).toBeGreaterThan(0)
 const beacons=await page.evaluate(()=>(window as unknown as {__pilotBeacons:{url:string;body:string}[]}).__pilotBeacons)
 const payload=JSON.parse(beacons[0].body) as {events?:Array<{event:string;path:string}>}
 expect(payload.events?.length).toBeGreaterThan(0)
 for(const event of payload.events??[]){
  expect(event.event).toBe('route_visited')
  expect(event.path.startsWith('/')).toBe(true)
  expect(event.path).not.toContain('?')
  expect(event.path).not.toContain('plantId')
  expect(event.path).not.toContain('secreto')
 }
})

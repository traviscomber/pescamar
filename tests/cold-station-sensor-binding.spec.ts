import {readFile} from 'node:fs/promises'
import {expect,test,type Locator,type Page} from '@playwright/test'

test('cold control binds assets and manual fallback to canonical physical stations without simulating sensors',async()=>{
 const [page,api,migration,app]=await Promise.all([
  readFile('src/pages/ColdChainControl.tsx','utf8'),
  readFile('api/cold-chain.ts','utf8'),
  readFile('db/migrations/040_cold_sensor_station_scope.sql','utf8'),
  readFile('src/App.tsx','utf8'),
 ])
 expect(app).toContain('import("./pages/ColdChainControl")')
 expect(page).toContain("api<StationsPayload>('/api/plant-stations')")
 expect(page).toContain("station.station_type==='cold'")
 expect(page).toContain("action:'upsertAsset',plantId,stationId")
 expect(page).toContain("source:'manual'")
 expect(page).toContain('idempotencyKey:`manual-${crypto.randomUUID()}`')
 expect(page).toContain("device.active&&device.deviceType==='sensor'")
 expect(page).toContain('La telemetría automática no se digita aquí')
 expect(page).not.toContain('Origen lectura')
 expect(page).not.toContain("source==='sensor'")
 expect(page).toContain('!writesEnabled')
 expect(api).toContain("station.station_type!=='cold'")
 expect(migration).toContain("device_station<>asset_station")
 expect(migration).toContain("device_type<>'sensor'")
})

async function mock(page:Page,writesEnabled=true){
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  const json=(body:unknown)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)})
  if(path==='/api/auth')return json({ok:true,operator:{id:'qa-admin',fullName:'QA Admin',email:'qa@example.test',role:'admin',plantIds:[]}})
  if(path==='/api/receptions')return json({receptions:[]})
  if(path==='/api/history')return json({records:[],summary:null})
  if(path==='/api/status')return json({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa',checkedAt:new Date().toISOString()})
  if(path==='/api/pallets')return json({ok:true,writesEnabled,pallets:[]})
  if(path==='/api/plant-stations')return json({ok:true,writesEnabled,stations:[{id:'11111111-1111-4111-8111-111111111111',plant_id:'ancud',code:'cold-01',name:'Frío 1',station_type:'cold',active:true,devices:[{id:'22222222-2222-4222-8222-222222222222',deviceType:'sensor',manufacturer:'QA',model:'T1',protocol:'test',stableIdentifier:'SENSOR-QA-1',active:true}]}]})
  if(path==='/api/cold-chain')return json({ok:true,writesEnabled,assets:[{id:'33333333-3333-4333-8333-333333333333',plant_id:'ancud',station_id:'11111111-1111-4111-8111-111111111111',code:'TUN-01',name:'Túnel 1',asset_type:'tunnel',active:true}],runs:[{id:'44444444-4444-4444-8444-444444444444',plant_id:'ancud',asset_id:'33333333-3333-4333-8333-333333333333',run_code:'FRIO-QA-1',status:'open',min_allowed_c:-20,max_allowed_c:-15,observed_min_c:null,observed_max_c:null,last_observed_c:null,observation_count:0,deviation_count:0,started_at:new Date().toISOString(),completed_at:null,asset_code:'TUN-01',asset_name:'Túnel 1',asset_type:'tunnel',loads:[]}]})
  return json({})
 })
}

function panel(page:Page,heading:string){return page.locator('section.panel').filter({has:page.getByRole('heading',{name:heading,exact:true})})}
function selectByLabel(scope:Locator,label:string){return scope.locator('label').filter({hasText:new RegExp(`^${label}`)}).locator('select')}
function inputByLabel(scope:Locator,label:string){return scope.locator('label').filter({hasText:new RegExp(`^${label}`)}).locator('input')}
async function selectAncud(page:Page){await panel(page,'Activo de frío').locator('select').first().selectOption('ancud')}

test('cold page renders physical station and registered sensor without exposing a manual sensor source',async({page},testInfo)=>{
 const errors:string[]=[]
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text())})
 await mock(page,true)
 await page.goto('/frio/detalle')
 await expect(page.getByRole('heading',{name:'Cadena de frío',exact:true})).toBeVisible()
 await selectAncud(page)
 const assetPanel=panel(page,'Activo de frío'),runPanel=panel(page,'Operar ciclo')
 await expect(selectByLabel(assetPanel,'Estación de frío')).toContainText('cold-01 · Frío 1')
 await selectByLabel(runPanel,'Ciclo abierto').selectOption('44444444-4444-4444-8444-444444444444')
 await expect(runPanel.getByText('1 sensor registrado en la estación',{exact:true})).toBeVisible()
 await expect(runPanel.getByText(/La telemetría automática no se digita aquí/)).toBeVisible()
 await expect(selectByLabel(runPanel,'Origen lectura')).toHaveCount(0)
 await expect(selectByLabel(runPanel,'Sensor')).toHaveCount(0)
 await expect(inputByLabel(runPanel,'Lectura manual auditada · °C')).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
 expect(errors).toEqual([])
 await page.screenshot({path:testInfo.outputPath('cold-station-sensor.png'),fullPage:true})
})

test('cold controls respect the shared write gate',async({page})=>{
 await mock(page,false)
 await page.goto('/frio/detalle')
 await selectAncud(page)
 const assetPanel=panel(page,'Activo de frío')
 await selectByLabel(assetPanel,'Estación de frío').selectOption('11111111-1111-4111-8111-111111111111')
 await inputByLabel(assetPanel,'Código').fill('TUN-QA')
 await inputByLabel(assetPanel,'Nombre').fill('Túnel QA')
 await expect(page.getByRole('button',{name:'Guardar activo'})).toBeDisabled()
 await expect(page.getByRole('button',{name:'Iniciar ciclo'})).toBeDisabled()
})

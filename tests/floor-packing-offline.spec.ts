import {expect,test} from '@playwright/test'

const reception={id:'11111111-1111-4111-8111-111111111111',reception_number:301,plant_id:'ancud',supplier:'Proveedor Floor',species:'Erizo',extraction_zone:'Zona QA',source_reference:null,guide_kg:120,gross_kg:118,tare_kg:5,drained_kg:110,accepted_kg:108,temperature_c:8,quality_status:'Clasificado',evidence_count:1,evidence:[],received_at:'2026-09-02T12:00:00.000Z'}
const station={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',plant_id:'ancud',code:'packing-01',name:'Packing 01',station_type:'packing',active:true,config:{},devices:[]}
const auth={ok:true,operator:{id:'qa-operations',fullName:'QA Operations',email:'operations@example.test',role:'operations',plantIds:['ancud']}}

async function commonRoute(route:import('@playwright/test').Route,writesEnabled:boolean,stationCalls:{value:number}):Promise<boolean>{
 const path=new URL(route.request().url()).pathname
 const json=async(body:unknown,status=200)=>{await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});return true}
 if(path==='/api/auth')return json(auth)
 if(path==='/api/receptions')return json({receptions:[reception]})
 if(path==='/api/status')return json({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:1},commit:'qa-floor-write',checkedAt:new Date().toISOString()})
 if(path==='/api/plant-execution'&&route.request().method()==='GET')return json({ok:true,writesEnabled,mode:writesEnabled?'write-enabled':'safe-read-only'})
 if(path==='/api/plant-stations'){stationCalls.value++;return json({ok:true,writesEnabled,stations:writesEnabled?[station]:[]})}
 return false
}

test('Floor remains read-only and never queries station tables while Plant Execution gate is disabled',async({page})=>{
 const stationCalls={value:0}
 await page.route('**/api/**',async route=>{if(await commonRoute(route,false,stationCalls))return;await route.fulfill({status:200,contentType:'application/json',body:'{}'})})
 await page.goto('/floor')
 await expect(page.getByText('Modo seguro',{exact:true})).toBeVisible()
 await page.getByLabel('Peso de estación').fill('2,50')
 await expect(page.getByRole('button',{name:/Crear packing unit/})).toBeDisabled()
 await page.waitForTimeout(100)
 expect(stationCalls.value).toBe(0)
})

test('Floor creates one idempotent packing request when gate and a real station are available',async({page})=>{
 const stationCalls={value:0},posts:Array<Record<string,unknown>>=[]
 await page.route('**/api/**',async route=>{
  if(await commonRoute(route,true,stationCalls))return
  const path=new URL(route.request().url()).pathname
  if(path==='/api/plant-execution'&&route.request().method()==='POST'){
   const body=route.request().postDataJSON() as Record<string,unknown>;posts.push(body)
   await route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,idempotent:false,packingUnit:{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',packing_unit_code:body.packingUnitCode}})});return
  }
  await route.fulfill({status:200,contentType:'application/json',body:'{}'})
 })
 await page.goto('/floor')
 await expect(page.getByText('Escritura habilitada',{exact:true})).toBeVisible()
 await expect(page.getByLabel('Estación de planta')).toHaveValue(station.id)
 await page.getByLabel('Peso de estación').fill('2,50')
 await page.getByRole('button',{name:/Crear packing unit/}).click()
 await expect(page.getByRole('status')).toContainText('registrada')
 expect(posts).toHaveLength(1)
 expect(posts[0].action).toBe('createPackingUnit')
 expect(posts[0].stationId).toBe(station.id)
 expect(posts[0].receptionId).toBe(reception.id)
 expect(posts[0].netKg).toBe(2.5)
 expect(String(posts[0].packingUnitCode)).toMatch(/^PK-ANCUD-/)
 expect(String(posts[0].idempotencyKey)).toMatch(/^floor:ancud:/)
})

test('a network failure queues the same packing identity and replays it once connectivity returns',async({page})=>{
 const stationCalls={value:0},posts:Array<Record<string,unknown>>=[]
 let postAttempt=0
 await page.route('**/api/**',async route=>{
  if(await commonRoute(route,true,stationCalls))return
  const path=new URL(route.request().url()).pathname
  if(path==='/api/plant-execution'&&route.request().method()==='POST'){
   const body=route.request().postDataJSON() as Record<string,unknown>;posts.push(body);postAttempt++
   if(postAttempt===1){await route.abort('internetdisconnected');return}
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,idempotent:true,packingUnit:{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',packing_unit_code:body.packingUnitCode}})});return
  }
  await route.fulfill({status:200,contentType:'application/json',body:'{}'})
 })
 await page.goto('/floor')
 await page.getByLabel('Peso de estación').fill('1,75')
 await page.getByRole('button',{name:/Crear packing unit/}).click()
 await expect(page.getByRole('status')).toContainText('pendiente de sincronización')
 await expect(page.getByText('1 pendiente de sync',{exact:true})).toBeVisible()
 await page.evaluate(()=>window.dispatchEvent(new Event('online')))
 await expect(page.getByRole('status')).toContainText('1 operación pendiente sincronizada')
 await expect(page.getByText('Sin cola pendiente',{exact:true})).toBeVisible()
 expect(posts).toHaveLength(2)
 expect(posts[1].idempotencyKey).toBe(posts[0].idempotencyKey)
 expect(posts[1].packingUnitCode).toBe(posts[0].packingUnitCode)
})

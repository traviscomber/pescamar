import {expect,test} from '@playwright/test'

const reception=(id:string,number:number,plantId:string,supplier:string)=>({id,reception_number:number,plant_id:plantId,supplier,species:'Erizo',extraction_zone:'Zona QA',source_reference:null,guide_kg:120,gross_kg:118,tare_kg:5,drained_kg:110,accepted_kg:108,temperature_c:8,quality_status:'Clasificado',evidence_count:1,evidence:[],received_at:'2026-09-02T12:00:00.000Z'})

test('Floor Station is scoped to operator plants and remains read-only while the write gate is off',async({page})=>{
 let stationCalls=0
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  const json=(body:unknown,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)})
  if(path==='/api/auth')return json({ok:true,operator:{id:'qa-quality',fullName:'QA Quality',email:'quality@example.test',role:'quality',plantIds:['ancud']}})
  if(path==='/api/receptions')return json({receptions:[reception('11111111-1111-4111-8111-111111111111',101,'ancud','Proveedor Ancud'),reception('22222222-2222-4222-8222-222222222222',202,'quellon','Proveedor Quellón')]})
  if(path==='/api/status')return json({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:2},commit:'qa-floor',checkedAt:new Date().toISOString()})
  if(path==='/api/plant-execution')return json({ok:true,writesEnabled:false,mode:'safe-read-only'})
  if(path==='/api/plant-stations'){stationCalls++;return json({ok:true,writesEnabled:false,stations:[]})}
  return json({})
 })
 await page.goto('/floor/detalle')
 await expect(page.getByRole('heading',{name:'Estación de planta'})).toBeVisible()
 await expect(page.getByText('REC-101',{exact:true})).toBeVisible()
 await expect(page.getByText('Erizo · Proveedor Ancud',{exact:true})).toBeVisible()
 await expect(page.getByText(/Proveedor Quellón/)).toHaveCount(0)
 await expect(page.getByText('Sin escrituras DB')).toBeVisible()
 const confirm=page.getByRole('button',{name:/Crear packing unit/})
 await expect(confirm).toBeDisabled()
 await page.getByLabel('Peso de estación').fill('12,48')
 await expect(confirm).toBeDisabled()
 await expect(confirm).toContainText('Persistencia bloqueada por gate #68')
 expect(stationCalls).toBe(0)
})

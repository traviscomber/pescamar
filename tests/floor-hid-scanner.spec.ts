import {expect,test} from '@playwright/test'

const reception=(id:string,number:number,plantId:string,supplier:string)=>({id,reception_number:number,plant_id:plantId,supplier,species:'Erizo',extraction_zone:'Zona QA',source_reference:null,guide_kg:120,gross_kg:118,tare_kg:5,drained_kg:110,accepted_kg:108,temperature_c:8,quality_status:'Clasificado',evidence_count:1,evidence:[],received_at:'2026-09-02T12:00:00.000Z'})

test('USB HID scanner selects only an authorized lot by code',async({page})=>{
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  const json=(body:unknown,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)})
  if(path==='/api/auth')return json({ok:true,operator:{id:'qa-quality',fullName:'QA Quality',email:'quality@example.test',role:'quality',plantIds:['ancud']}})
  if(path==='/api/receptions')return json({receptions:[reception('11111111-1111-4111-8111-111111111111',101,'ancud','Proveedor Uno'),reception('22222222-2222-4222-8222-222222222222',102,'ancud','Proveedor Dos'),reception('33333333-3333-4333-8333-333333333333',202,'quellon','Proveedor Quellón')]})
  if(path==='/api/status')return json({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:3},commit:'qa-hid',checkedAt:new Date().toISOString()})
  return json({})
 })
 await page.goto('/floor')
 const scanner=page.getByLabel('Scanner HID')
 await scanner.fill('REC-102')
 await scanner.press('Enter')
 await expect(page.getByText('REC-102',{exact:true})).toBeVisible()
 await expect(page.getByRole('status')).toHaveText('Lote REC-102 seleccionado')
 await scanner.fill('REC-202')
 await scanner.press('Enter')
 await expect(page.getByRole('alert')).toHaveText('Código no corresponde a un lote autorizado')
 await expect(page.getByText('REC-102',{exact:true})).toBeVisible()
})

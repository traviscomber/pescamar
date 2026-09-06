import {readFile} from 'node:fs/promises'
import {expect,test,type Locator,type Page} from '@playwright/test'

test('physical Label Engine preserves validated-label, printer and idempotency gates',async()=>{
 const [page,api,options,access,vercel]=await Promise.all([
  readFile('src/pages/LabelPrintControl.tsx','utf8'),
  readFile('api/label-engine.ts','utf8'),
  readFile('api/label-engine-options.ts','utf8'),
  readFile('src/access.ts','utf8'),
  readFile('vercel.json','utf8'),
 ])
 expect(page).toContain("request<EnginePayload>('/api/label-engine')")
 expect(page).toContain("request<OptionsPayload>('/api/label-engine-options')")
 expect(page).toContain("idempotencyKey:`label-print-${crypto.randomUUID()}`")
 expect(api).toContain("label.status!=='validated'")
 expect(api).toContain("d.device_type='printer'")
 expect(api).toContain("${copies},'queued'")
 expect(api).toContain("['printed','reprinted'].includes(source.status)")
 expect(options).toContain("status<>'voided'")
 expect(options).toContain("l.status='validated'")
 expect(options).toContain("d.device_type='printer'")
 expect(access).toContain('"/impresion-etiquetas":["admin","operations","quality"]')
 expect(vercel).toContain('"source": "/impresion-etiquetas"')
 expect(vercel).toContain('"source": "/impresion-etiquetas/detalle"')
})

async function mock(page:Page,writesEnabled=true){
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  const json=(body:unknown)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)})
  if(path==='/api/auth')return json({ok:true,operator:{id:'11111111-1111-4111-8111-111111111111',fullName:'QA Calidad',email:'qa@example.test',role:'quality',plantIds:['ancud']}})
  if(path==='/api/receptions')return json({receptions:[]})
  if(path==='/api/history')return json({records:[],summary:null})
  if(path==='/api/status')return json({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa',checkedAt:new Date().toISOString()})
  if(path==='/api/label-engine')return json({ok:true,writesEnabled,templates:[{id:'22222222-2222-4222-8222-222222222222',plant_id:'ancud',code:'erizo-box',version:1,name:'Caja erizo',width_mm:100,height_mm:60,barcode_format:'code128',definition:{fields:[]},active:true}],jobs:[]})
  if(path==='/api/label-engine-options')return json({ok:true,packingUnits:[{id:'33333333-3333-4333-8333-333333333333',plant_id:'ancud',reception_id:'44444444-4444-4444-8444-444444444444',packing_unit_code:'BOX-ANC-001',product:'Erizo',species:'Erizo',grade:'A',format:'bandeja',net_kg:12.5,status:'packed',packed_at:new Date().toISOString()}],labels:[{id:'55555555-5555-4555-8555-555555555555',plant_id:'ancud',reception_id:'44444444-4444-4444-8444-444444444444',label_code:'LBL-001',product:'Erizo',grade:'A',net_kg:12.5,status:'validated',species:'Erizo',packing_format:'bandeja'}],printers:[{id:'66666666-6666-4666-8666-666666666666',plant_id:'ancud',station_id:'77777777-7777-4777-8777-777777777777',station_code:'pack-01',station_name:'Packing 1',stable_identifier:'PRINTER-QA-1',manufacturer:'QA',model:'P1',protocol:null}]})
  return json({})
 })
}

function printPanel(page:Page){return page.locator('section.panel').filter({has:page.getByRole('heading',{name:'Enviar a cola',exact:true})})}
function selectByLabel(scope:Locator,label:string){return scope.locator('label').filter({hasText:new RegExp(`^${label}`)}).locator('select')}
async function selectPrintIntent(page:Page){
 const scope=printPanel(page)
 await selectByLabel(scope,'Caja').selectOption('33333333-3333-4333-8333-333333333333')
 await selectByLabel(scope,'Etiqueta validada').selectOption('55555555-5555-4555-8555-555555555555')
 await selectByLabel(scope,'Plantilla').selectOption('22222222-2222-4222-8222-222222222222')
 await selectByLabel(scope,'Impresora').selectOption('66666666-6666-4666-8666-666666666666')
}

test('quality can prepare a physical print job without overflow',async({page})=>{
 const errors:string[]=[]
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text())})
 await mock(page,true)
 await page.goto('/impresion-etiquetas/detalle')
 await expect(page.getByRole('heading',{name:'Impresión de etiquetas',exact:true})).toBeVisible()
 await selectPrintIntent(page)
 await expect(page.getByRole('button',{name:'Encolar impresión'})).toBeEnabled()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
 expect(errors).toEqual([])
})

test('physical print mutations disable with the shared kill switch',async({page})=>{
 await mock(page,false)
 await page.goto('/impresion-etiquetas/detalle')
 await selectPrintIntent(page)
 await expect(page.getByRole('button',{name:'Encolar impresión'})).toBeDisabled()
})

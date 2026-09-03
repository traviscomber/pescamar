import {expect,test} from '@playwright/test'

test('imports distinguishes packing source coverage from identity review',async({page})=>{
  const consoleErrors:string[]=[]
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())})
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname
    if(path==='/api/auth')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,operator:{id:'qa-admin',fullName:'QA Admin',email:'admin@example.test',role:'admin',plantIds:[]}})})
    if(path==='/api/plant-state')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,plants:[],history:[]})})
    if(path==='/api/status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa',checkedAt:new Date().toISOString()})})
    if(path==='/api/canonical-status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,sources:[{file_hash:'qa-packing',file_name:'packing pulpo pescamar 2026-2.xlsx',source_kind:'packing_octopus_2026',period_start:'2026-08-05',period_end:'2026-08-18',record_count:562,notes:null}],datasets:{production:[{rows:223,flagged:0,guide_kg:1000,received_kg:950}],ledger:[],stock:[],transfers:[],packing:[{rows:446,flagged:0,kg:8920,pack_format:'BLOQUE'},{rows:116,flagged:116,kg:2372,pack_format:'IQF'}]}})})
    if(path==='/api/canonical-connections')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,connections:{production:{target:'Recepciones / Calidad / Producción',mode:'eligible_evidence',reception_ready:223,quality_ready:223,review_required:0},parties:{target:'Proveedores y clientes',mode:'exact_identity_only',exact:12,missing:0,ambiguous:0},packing:{target:'Lotes / Inventario',mode:'exact_lot_only',product_family:'pulpo',lots:4,exact_lots:0,unmatched_lots:4,outside_coverage_lots:4,unresolved_within_coverage_lots:0,boxes:562,lot_referenced_boxes:446,unreferenced_boxes:116,unreferenced_kg:2372,kg:11292,upstream_last_date:'2026-07-13T00:00:00.000Z',packing_first_date:'2026-08-05T00:00:00.000Z',packing_last_date:'2026-08-24T00:00:00.000Z'},finance:{target:'Finanzas',mode:'unique_date_amount_only',exact:0,unmatched:0,ambiguous:0},stock:{target:'Inventario',mode:'staging_only',rows:51,kg:18864.9,flagged:0}},governance:{promotion:'blocked',writesLive:false,rule:'Los gaps de fuente no son revisiones de identidad ni crean transacciones live.'}})})
    return route.fulfill({status:200,contentType:'application/json',body:'{}'})
  })
  await page.goto('/importaciones')
  await expect(page.getByRole('heading',{name:'Importar planilla',exact:true})).toBeVisible()
  const packingConnection=page.locator('.detail-alerts > div').filter({hasText:'Packing pulpo → lotes'}).first()
  await expect(packingConnection).toBeVisible()
  await expect(packingConnection).toContainText('0 lotes exactos')
  await expect(packingConnection).toContainText('4 fuera de cobertura upstream')
  await expect(packingConnection).toContainText('0 requieren revisión')
  await expect(packingConnection).toContainText('446/562 cajas con lote')
  await expect(packingConnection).toContainText('116 sin referencia de lote')
  await expect(packingConnection.locator('em')).toHaveText('COBERTURA')
  await expect(packingConnection).not.toContainText('REVISAR')
  expect(consoleErrors).toEqual([])
})

import {expect,test} from '@playwright/test'

test('canonical imports surface exposes audited quality without promoting live data',async({page})=>{
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname
    const json=(body:unknown)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)})
    if(path==='/api/auth')return json({ok:true,operator:{id:'qa-admin',fullName:'QA Admin',email:'admin@example.test',role:'admin',plantIds:['ancud'],organizationId:'pescamar'}})
    if(path==='/api/status')return json({ok:true,persistence:{database:true,files:true}})
    if(path==='/api/canonical-status')return json({sources:[{file_hash:'hash-cuenta',file_name:'CUENTA2.xlsx',source_kind:'finance_stock',period_start:'2024-10-28',period_end:'2026-08-01',record_count:1094,notes:null}],datasets:{production:[{rows:224,flagged:13,guide_kg:0,received_kg:0}],ledger:[{rows:968,source_rows:1018,reference_rows:50,flagged:50,inflow_clp:1000,outflow_clp:500,final_balance_clp:500}],stock:[],transfers:[{rows:25,flagged:0,amount_clp:1000}],packing:[{rows:562,flagged:116,kg:11292}]}})
    if(path==='/api/canonical-connections')return json({connections:{production:{target:'Recepciones / Calidad / Producción',mode:'eligible_evidence',reception_ready:0,review_required:13,flagged:13,non_unique_context_rows:0,non_unique_contexts:0},parties:{target:'Proveedores y clientes',mode:'exact_identity_only',exact:0,missing:0,ambiguous:0},packing:{target:'Lotes / Inventario',mode:'exact_lot_only',exact_lots:0,outside_coverage_lots:0,unresolved_within_coverage_lots:0,lot_referenced_boxes:446,boxes:562,unreferenced_boxes:116,product_family:'pulpo'},finance:{target:'Finanzas',mode:'unique_date_amount_or_group_total',direct_exact_transfers:0,grouped_exact_transfers:0,grouped_exact_groups:0,unmatched:0,ambiguous:0},stock:{target:'Inventario',mode:'staging_only',rows:0,kg:0,flagged:0}},governance:{promotion:'blocked',writesLive:false,rule:'Sin promoción implícita.'}})
    if(path==='/api/canonical-quality')return json({readOnly:true,datasets:{production:{missing_guide_price:183,missing_or_nonstandard_guide:5,process_before_reception:3,production_before_process:8,production_before_reception:2},ledger:{movement_rows:968,reference_rows:50,canonical_balance_mismatch_rows:0},packing:{missing_lot_boxes:116,missing_lot_kg:2372}},assessment:{blockers:[],reviews:['production_guide_price_coverage','packing_lot_traceability','ledger_reference_rows'],status:'review_required'}})
    if(path==='/api/canonical-source-coverage')return json({readOnly:true,sources:[{file_hash:'hash-cuenta',file_name:'CUENTA2.xlsx',source_kind:'finance_stock',declared_start:'2024-10-28',declared_end:'2026-08-01',observed_start:'2024-10-28',observed_end:'2026-08-25',observed_records:968,start_status:'aligned',end_status:'declared_end_stale'}],assessment:{total:1,drifted:1,clean:false}})
    return json({plants:[],history:[]})
  })

  await page.goto('/importaciones')
  await expect(page.getByRole('heading',{name:'Importar planilla',exact:true})).toBeVisible()
  await expect(page.getByRole('heading',{name:'Qué sabemos y qué falta validar',exact:true})).toBeVisible()
  await expect(page.getByText(/968 movimientos · 50 filas preservadas como referencia/)).toBeVisible()
  await expect(page.getByText(/0 discrepancias materiales de saldo canónico/)).toBeVisible()
  await expect(page.getByText(/183 sin precio guía/)).toBeVisible()
  await expect(page.getByText(/116 cajas sin lote · 2\.372 kg sin referencia de lote/)).toBeVisible()
  await expect(page.getByText(/CUENTA2\.xlsx: declarado .* observado/)).toBeVisible()
  await expect(page.getByText(/no la reescribe silenciosamente/)).toBeVisible()
  await expect(page.getByText(/Promoción bloqueada/)).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
})

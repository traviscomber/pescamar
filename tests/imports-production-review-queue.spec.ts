import {expect,test} from '@playwright/test'

test('imports exposes canonical production review as read-only lineage evidence',async({page})=>{
  const consoleErrors:string[]=[]
  const reviewMethods:string[]=[]
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())})
  await page.route('**/api/**',async route=>{
    const request=route.request(),path=new URL(request.url()).pathname
    if(path==='/api/canonical-production-review'){
      reviewMethods.push(request.method())
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,rows:[
        {source_file_hash:'hash-2026',source_file:'planilla de produccion 2026.xlsx',source_row:221,event_date:'2026-06-12T00:00:00.000Z',supplier_name:'Patricio Diaz',lot_code:'mdq213100626',guide_number:'123',guide_kg:60,received_kg:59.6,reception_date:'2026-06-12T00:00:00.000Z',process_date:'2026-06-11T00:00:00.000Z',production_date:'2026-06-12T00:00:00.000Z',data_quality_flags:['date_sequence_inconsistent'],context_rows:1,review_reasons:['date_sequence_inconsistent']},
        {source_file_hash:'hash-context',source_file:'planilla de produccion 2026.xlsx',source_row:156,event_date:'2026-05-25T00:00:00.000Z',supplier_name:'Gladys Mansilla',lot_code:'fq152230526',guide_number:'511',guide_kg:354,received_kg:354,reception_date:'2026-05-25T00:00:00.000Z',process_date:'2026-05-25T00:00:00.000Z',production_date:'2026-05-26T00:00:00.000Z',data_quality_flags:[],context_rows:2,review_reasons:['non_unique_context']},
        {source_file_hash:'hash-2025',source_file:'planilla de produccion 2025.xlsx',source_row:20,event_date:'2025-04-02T00:00:00.000Z',supplier_name:'Eugenio Mardones',lot_code:'ig-demo',guide_number:'10',guide_kg:100,received_kg:98,reception_date:'2025-04-02T00:00:00.000Z',process_date:null,production_date:'2025-04-03T00:00:00.000Z',data_quality_flags:['missing_process_date'],context_rows:1,review_reasons:['missing_process_date']}
      ],summary:{rows:54,flaggedRows:50,nonUniqueContextRows:4,nonUniqueContexts:2,firstDate:'2025-03-22T00:00:00.000Z',lastDate:'2026-06-12T00:00:00.000Z',bySource:[{source_file:'planilla de produccion 2025.xlsx',rows:39,flagged_rows:37,non_unique_context_rows:2},{source_file:'planilla de produccion 2026.xlsx',rows:15,flagged_rows:13,non_unique_context_rows:2}]},governance:{mode:'evidence_only',writesHistorical:false,writesLive:false,rule:'Esta cola expone evidencia canónica para revisión humana. No corrige, elimina, fusiona ni deduplica registros históricos.'}})})
    }
    if(path==='/api/auth')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,operator:{id:'qa-admin',fullName:'QA Admin',email:'admin@example.test',role:'admin',plantIds:[]}})})
    if(path==='/api/plant-state')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,plants:[],history:[]})})
    if(path==='/api/status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa',checkedAt:new Date().toISOString()})})
    if(path==='/api/canonical-status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,sources:[],datasets:{production:[{rows:224,flagged:50,guide_kg:50959.7,received_kg:49183.6}],ledger:[],stock:[],transfers:[],packing:[]}})})
    if(path==='/api/canonical-connections')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,connections:{production:{target:'Recepciones / Calidad / Producción',mode:'eligible_evidence',reception_ready:607,review_required:54,flagged:50,non_unique_context_rows:4,non_unique_contexts:2,production_before_process:26,date_sequence_inconsistent:13,missing_process_date:5,missing_reception_date:5,missing_received_kg:4,process_before_reception:2,production_before_reception:2,yield_formula_error:1}},governance:{promotion:'blocked',writesLive:false,rule:'Solo lectura.'}})})
    return route.fulfill({status:200,contentType:'application/json',body:'{}'})
  })

  await page.goto('/importaciones')
  await expect(page.getByRole('heading',{name:'Importar planilla',exact:true})).toBeVisible()
  const queue=page.getByTestId('canonical-production-review-queue')
  await expect(queue).toBeVisible()
  await expect(queue).toContainText('54 pendientes')
  await expect(queue).toContainText('50 filas con flags')
  await expect(queue).toContainText('4 filas en 2 contextos no únicos')
  await expect(queue).toContainText('Evidencia intacta')
  await expect(queue).toContainText('planilla de produccion 2026.xlsx')
  await expect(queue.getByTestId('canonical-review-row').filter({hasText:'Fila 221'})).toContainText('Patricio Diaz')
  await expect(queue.getByTestId('canonical-review-row').filter({hasText:'Fila 221'})).toContainText('mdq213100626')
  await expect(queue.getByTestId('canonical-review-row').filter({hasText:'Fila 221'})).toContainText('secuencia de fechas inconsistente')
  await expect(queue.getByTestId('canonical-review-row').filter({hasText:'Fila 156'})).toContainText('contexto base no único')
  expect(reviewMethods).toEqual(['GET'])
  expect(consoleErrors).toEqual([])
})

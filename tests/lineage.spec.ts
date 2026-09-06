import {expect,test,type Page} from '@playwright/test'

const receptionId='11111111-1111-4111-8111-111111111111'
const historicalId='22222222-2222-4222-8222-222222222222'

async function mockLineage(page:Page){
  await page.route('**/api/**',async route=>{
    const url=new URL(route.request().url()),path=url.pathname
    if(path==='/api/auth')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,operator:{id:'qa-operations',fullName:'QA Operations',email:'ops@example.test',role:'operations',plantIds:['ancud'],organizationId:'pescamar'}})})
    if(path==='/api/status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,persistence:{database:true,files:true},metrics:{}})})
    if(path==='/api/receptions')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({receptions:[{id:receptionId,reception_number:2401,plant_id:'ancud',plant_name:'Ancud',supplier_id:'supplier-1',supplier:'Proveedor QA',species:'Erizo',gross_kg:100,tare_kg:5,net_kg:95,guide_kg:100,received_at:'2026-09-03T12:00:00.000Z',status:'production',source:'manual',source_reference:null,evidence_kind:'Guía',evidence_label:'Guía QA',evidence_url:null,evidence_note:null,evidence_created_at:null}]})})
    if(path==='/api/historical-lineage'){
      expect(route.request().headers()['x-seafood-organization-id']).toBe('pescamar')
      if(url.searchParams.get('recordId'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,schemaVersion:'seafood.historical-lineage.v1',organizationId:'pescamar',organization:{id:'pescamar',implementationId:'pescamar',implementationName:'Pescamar',isolationMode:'single_organization_legacy'},siteId:'Pescamar',lotId:'mdn149220526',recordId:historicalId,mode:'canonical_historical',events:[
        {id:`historical-reception:${historicalId}`,schemaVersion:'seafood.event.v1',organizationId:'pescamar',siteId:'Pescamar',lotId:'mdn149220526',type:'reception',occurredAt:'2026-05-21T00:00:00.000Z',title:'Recepción histórica · guía 90',detail:'Patricio Diaz',actor:null,metrics:{historical:true,canonical:true,supplier:'Patricio Diaz',guideKg:64.8,receivedKg:63},source:{system:'pescamar',entityType:'historical_production_record',entityId:historicalId}},
        {id:`historical-process:${historicalId}`,schemaVersion:'seafood.event.v1',organizationId:'pescamar',siteId:'Pescamar',lotId:'mdn149220526',type:'production',occurredAt:'2026-05-22T00:00:00.000Z',title:'Proceso histórico',detail:'Pescamar',actor:null,metrics:{historical:true,canonical:true,processSite:'Pescamar'},source:{system:'pescamar',entityType:'historical_production_record',entityId:historicalId}},
        {id:`historical-production:${historicalId}`,schemaVersion:'seafood.event.v1',organizationId:'pescamar',siteId:'Pescamar',lotId:'mdn149220526',type:'production',occurredAt:'2026-06-25T00:00:00.000Z',title:'Producción histórica',detail:null,actor:null,metrics:{historical:true,canonical:true,gradeBreakdown:{A1:{kg:3.3,boxes:1}}},source:{system:'pescamar',entityType:'historical_production_record',entityId:historicalId}},
        {id:`historical-evidence:${historicalId}`,schemaVersion:'seafood.event.v1',organizationId:'pescamar',siteId:'Pescamar',lotId:'mdn149220526',type:'evidence',occurredAt:'2026-08-20T00:00:00.000Z',title:'Fuente canónica · planilla de produccion 2026.xlsx',detail:'Fila 153 · evidencia histórica de solo lectura',actor:null,metrics:{historical:true,canonical:true,sourceFile:'planilla de produccion 2026.xlsx',sourceRow:153},source:{system:'pescamar',entityType:'historical_production_record',entityId:historicalId}},
      ],coverage:{reception:true,evidence:true,quality:false,production:true,vision:false,inventory:false,commercialCommitment:false,dispatch:false,sale:null},permissions:{canSeeCommercial:true},boundary:{readOnly:true,canonicalHistorical:true,liveInventory:false,organizationScoped:false}})})
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,schemaVersion:'seafood.historical-lineage.index.v1',organizationId:'pescamar',year:2026,count:1,records:[{id:historicalId,lotCode:'mdn149220526',sourceFile:'planilla de produccion 2026.xlsx',sourceRow:153,eventDate:'2026-06-25T00:00:00.000Z',receptionDate:'2026-05-21T00:00:00.000Z',processDate:'2026-05-22T00:00:00.000Z',productionDate:'2026-06-25T00:00:00.000Z',guideNumber:'90',supplier:'Patricio Diaz',extractionZone:'quellon',processSite:'Pescamar',plantId:null,guideKg:64.8,receivedKg:63,differenceKg:1.8,qualityFlags:[]}],boundary:{readOnly:true,canonicalHistorical:true,liveInventory:false}})})
    }
    if(path==='/api/lot-lineage'){
      expect(route.request().headers()['x-seafood-organization-id']).toBe('pescamar')
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,schemaVersion:'seafood.lineage.v1',organizationId:'pescamar',organization:{id:'pescamar',implementationId:'pescamar',implementationName:'Pescamar',isolationMode:'single_organization_legacy'},siteId:'ancud',lotId:receptionId,events:[
      {id:`reception:${receptionId}`,schemaVersion:'seafood.event.v1',organizationId:'pescamar',siteId:'ancud',lotId:receptionId,type:'reception',occurredAt:'2026-09-03T12:00:00.000Z',title:'Recepción 2401',detail:'Erizo',actor:'QA Operations',metrics:{supplier:'Proveedor QA',species:'Erizo',grossKg:100},source:{system:'pescamar',entityType:'reception',entityId:receptionId}},
      {id:'quality:q1',schemaVersion:'seafood.event.v1',organizationId:'pescamar',siteId:'ancud',lotId:receptionId,type:'quality',occurredAt:'2026-09-03T13:00:00.000Z',title:'Control de calidad',detail:'Liberado',actor:'QA Quality',metrics:{qualityStatus:'approved',defectPct:2.1},source:{system:'pescamar',entityType:'lot_event',entityId:'q1'}},
      {id:'vision:v1',schemaVersion:'seafood.event.v1',organizationId:'pescamar',siteId:'ancud',lotId:receptionId,type:'vision',occurredAt:'2026-09-03T13:30:00.000Z',title:'Vision · Uni Vision color',detail:'accepted',actor:'QA Quality',metrics:{operatorGrade:'A',suggestedGrade:'A',deltaE:1.42,decision:'accepted',deviceLabel:'Station QA',imageSha256:'a'.repeat(64)},source:{system:'pescamar',entityType:'sea_urchin_color_capture',entityId:'v1'}},
      {id:'production:p1',schemaVersion:'seafood.event.v1',organizationId:'pescamar',siteId:'ancud',lotId:receptionId,type:'production',occurredAt:'2026-09-03T14:00:00.000Z',title:'Producción',detail:null,actor:'QA Operations',metrics:{lineName:'Erizo',outputKg:10.5,yieldPct:11.1},source:{system:'pescamar',entityType:'lot_event',entityId:'p1'}},
      {id:'inventory:i1',schemaVersion:'seafood.event.v1',organizationId:'pescamar',siteId:'ancud',lotId:receptionId,type:'inventory',occurredAt:'2026-09-03T15:00:00.000Z',title:'Inventario · IN',detail:null,actor:'QA Operations',metrics:{movedKg:10.5,toLocation:'Cámara 1'},source:{system:'pescamar',entityType:'inventory_movement',entityId:'i1'}},
      {id:'commercial:c1',schemaVersion:'seafood.event.v1',organizationId:'pescamar',siteId:'ancud',lotId:receptionId,type:'commercial_commitment',occurredAt:'2026-09-03T16:00:00.000Z',title:'Compromiso · OV-1',detail:'Erizo Grade A',actor:'QA Sales',metrics:{customer:'Cliente QA',allocatedKg:8,status:'confirmed'},source:{system:'pescamar',entityType:'sales_order_allocation',entityId:'c1'}},
    ],coverage:{reception:true,evidence:false,quality:true,production:true,vision:true,inventory:true,commercialCommitment:true,dispatch:false,sale:false},permissions:{canSeeCommercial:true},boundary:{organizationScoped:false}})})
    }
    return route.fulfill({status:200,contentType:'application/json',body:'{}'})
  })
}

test('Trazabilidad actual shows attributed lineage without inventing missing stages',async({page},testInfo)=>{
  await mockLineage(page)
  await page.goto('/lineage?mode=live')
  await expect(page.getByRole('heading',{name:'Trazabilidad actual'})).toBeVisible()
  await expect(page.getByText('Powered by Seafood Event Graph.',{exact:false})).toBeVisible()
  await expect(page.getByText('Pescamar',{exact:true}).first()).toBeVisible()
  await expect(page.getByText('6/9',{exact:true})).toBeVisible()
  await expect(page.getByText('Sin evento')).toHaveCount(3)
  await expect(page.getByRole('heading',{name:'Eventos atribuibles'})).toBeVisible()
  await expect(page.locator('.lineage-events li')).toHaveCount(6)
  await expect(page.getByText('Grade A · ΔE 1.42 · accepted · Station QA',{exact:true})).toBeVisible()
  await expect(page.getByText('Cliente QA',{exact:false}).first()).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
  await page.screenshot({path:testInfo.outputPath('trazabilidad-actual.png'),fullPage:true})
})

test('Trazabilidad histórica exposes canonical evidence without presenting it as live',async({page},testInfo)=>{
  await mockLineage(page)
  await page.goto('/lineage?mode=historical&year=2026')
  await expect(page.getByRole('heading',{name:'Trazabilidad histórica'})).toBeVisible()
  await expect(page.getByRole('combobox',{name:'Vista'})).toHaveValue('historical')
  await expect(page.getByText('Histórico canónico · solo lectura. 1 registros operacionales en 2026.',{exact:false})).toBeVisible()
  await expect(page.getByRole('combobox',{name:'Registro'})).toContainText('mdn149220526')
  await expect(page.getByText('HISTÓRICO · SOLO LECTURA')).toBeVisible()
  await expect(page.getByText('Recepción histórica · guía 90')).toBeVisible()
  await expect(page.getByText('Fuente canónica · planilla de produccion 2026.xlsx')).toBeVisible()
  await expect(page.getByText('Sin evento')).toHaveCount(5)
  await expect(page.getByText(/No modifica ni completa artificialmente la operación live/)).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
  await page.screenshot({path:testInfo.outputPath('trazabilidad-historica.png'),fullPage:true})
})

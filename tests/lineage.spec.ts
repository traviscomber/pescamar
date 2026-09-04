import {expect,test,type Page} from '@playwright/test'

const receptionId='11111111-1111-4111-8111-111111111111'

async function mockLineage(page:Page){
  await page.route('**/api/**',async route=>{
    const url=new URL(route.request().url()),path=url.pathname
    if(path==='/api/auth')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,operator:{id:'qa-operations',fullName:'QA Operations',email:'ops@example.test',role:'operations',plantIds:['ancud']}})})
    if(path==='/api/status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,persistence:{database:true,files:true},metrics:{}})})
    if(path==='/api/receptions')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({receptions:[{id:receptionId,reception_number:2401,plant_id:'ancud',plant_name:'Ancud',supplier_id:'supplier-1',supplier:'Proveedor QA',species:'Erizo',gross_kg:100,tare_kg:5,net_kg:95,guide_kg:100,received_at:'2026-09-03T12:00:00.000Z',status:'production',source:'manual',source_reference:null,evidence_kind:'Guía',evidence_label:'Guía QA',evidence_url:null,evidence_note:null,evidence_created_at:null}]})})
    if(path==='/api/lot-lineage')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,schemaVersion:'seafood.lineage.v1',organizationId:'pescamar',siteId:'ancud',lotId:receptionId,events:[
      {id:`reception:${receptionId}`,schemaVersion:'seafood.event.v1',organizationId:'pescamar',siteId:'ancud',lotId:receptionId,type:'reception',occurredAt:'2026-09-03T12:00:00.000Z',title:'Recepción 2401',detail:'Erizo',actor:'QA Operations',metrics:{supplier:'Proveedor QA',species:'Erizo',grossKg:100},source:{system:'pescamar',entityType:'reception',entityId:receptionId}},
      {id:'quality:q1',schemaVersion:'seafood.event.v1',organizationId:'pescamar',siteId:'ancud',lotId:receptionId,type:'quality',occurredAt:'2026-09-03T13:00:00.000Z',title:'Control de calidad',detail:'Liberado',actor:'QA Quality',metrics:{qualityStatus:'approved',defectPct:2.1},source:{system:'pescamar',entityType:'lot_event',entityId:'q1'}},
      {id:'vision:v1',schemaVersion:'seafood.event.v1',organizationId:'pescamar',siteId:'ancud',lotId:receptionId,type:'vision',occurredAt:'2026-09-03T13:30:00.000Z',title:'Vision · Uni Vision color',detail:'accepted',actor:'QA Quality',metrics:{operatorGrade:'A',suggestedGrade:'A',deltaE:1.42,decision:'accepted',deviceLabel:'Station QA',imageSha256:'a'.repeat(64)},source:{system:'pescamar',entityType:'sea_urchin_color_capture',entityId:'v1'}},
      {id:'production:p1',schemaVersion:'seafood.event.v1',organizationId:'pescamar',siteId:'ancud',lotId:receptionId,type:'production',occurredAt:'2026-09-03T14:00:00.000Z',title:'Producción',detail:null,actor:'QA Operations',metrics:{lineName:'Erizo',outputKg:10.5,yieldPct:11.1},source:{system:'pescamar',entityType:'lot_event',entityId:'p1'}},
      {id:'inventory:i1',schemaVersion:'seafood.event.v1',organizationId:'pescamar',siteId:'ancud',lotId:receptionId,type:'inventory',occurredAt:'2026-09-03T15:00:00.000Z',title:'Inventario · IN',detail:null,actor:'QA Operations',metrics:{movedKg:10.5,toLocation:'Cámara 1'},source:{system:'pescamar',entityType:'inventory_movement',entityId:'i1'}},
      {id:'commercial:c1',schemaVersion:'seafood.event.v1',organizationId:'pescamar',siteId:'ancud',lotId:receptionId,type:'commercial_commitment',occurredAt:'2026-09-03T16:00:00.000Z',title:'Compromiso · OV-1',detail:'Erizo Grade A',actor:'QA Sales',metrics:{customer:'Cliente QA',allocatedKg:8,status:'confirmed'},source:{system:'pescamar',entityType:'sales_order_allocation',entityId:'c1'}},
    ],coverage:{reception:true,evidence:false,quality:true,production:true,vision:true,inventory:true,commercialCommitment:true,dispatch:false,sale:false},permissions:{canSeeCommercial:true}})})
    return route.fulfill({status:200,contentType:'application/json',body:'{}'})
  })
}

test('Seafood Event Graph shows attributed lineage without inventing missing stages',async({page},testInfo)=>{
  await mockLineage(page)
  await page.goto('/lineage')
  await expect(page.getByRole('heading',{name:'Lineage operacional del lote'})).toBeVisible()
  await expect(page.getByText('Pescamar',{exact:true}).first()).toBeVisible()
  await expect(page.getByText('6/9',{exact:true})).toBeVisible()
  await expect(page.getByText('Sin evento')).toHaveCount(3)
  await expect(page.getByRole('heading',{name:'Secuencia atribuible'})).toBeVisible()
  await expect(page.locator('.lineage-events li')).toHaveCount(6)
  await expect(page.getByText('Grade A · ΔE 1.42 · accepted · Station QA',{exact:true})).toBeVisible()
  await expect(page.getByText('Cliente QA',{exact:false}).first()).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
  await page.screenshot({path:testInfo.outputPath('seafood-lineage.png'),fullPage:true})
})

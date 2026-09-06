import {expect,test} from '@playwright/test'

test('inventory preserves canonical dates and explains upstream packing coverage',async({page})=>{
  const consoleErrors:string[]=[]
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())})
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname
    if(path==='/api/auth')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,operator:{id:'qa-admin',fullName:'QA Admin',email:'admin@example.test',role:'admin',plantIds:[]}})})
    if(path==='/api/inventory')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,locations:[],movements:[],lots:[],permissions:{canWrite:true}})})
    if(path==='/api/canonical-inventory-evidence')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,stock:[],packing:[{pack_format:'BLOQUE',boxes:176,flagged:0,kg:3520,lots:1,first_date:'2026-08-24T00:00:00.000Z',last_date:'2026-08-24T00:00:00.000Z'}],packingSources:[{file_name:'packing pulpo pescamar 2026-2.xlsx',source_kind:'packing_octopus_2026',product_family:'pulpo',declared_start:'2026-08-05T00:00:00.000Z',declared_end:'2026-08-18T00:00:00.000Z',observed_start:'2026-08-05T00:00:00.000Z',observed_end:'2026-08-24T00:00:00.000Z',observed_rows:176,rows_with_lot:176,lots:1,metadata_period_mismatch:true}],upstreamCoverage:{source:'historical_production_records',first_date:'2025-03-22T00:00:00.000Z',last_date:'2026-07-13T00:00:00.000Z',rows:617,rows_with_lot:617},lotLinks:[{lot_code:'I04-260824',boxes:176,packing_kg:'3520.0',production_rows:0,exact_lot_match:false,linkage_status:'outside_upstream_coverage',first_packing_date:'2026-08-24T00:00:00.000Z',last_packing_date:'2026-08-24T00:00:00.000Z',first_reception_date:null,last_reception_date:null}],summary:{stockRows:0,packingBoxes:176,packingKg:3520,packingLots:1,matchedLots:0,unmatchedLots:1,outsideCoverageLots:1,unresolvedWithinCoverageLots:0},governance:{linkageRule:'match_exact_or_hold',rule:'Evidencia canónica de prueba.'}})})
    if(path==='/api/status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa',checkedAt:new Date().toISOString()})})
    return route.fulfill({status:200,contentType:'application/json',body:'{}'})
  })
  await page.goto('/inventario/detalle')
  await expect(page.getByRole('heading',{name:'Inventario',exact:true})).toBeVisible()
  await expect(page.getByRole('region',{name:'Evidencia canónica de inventario'})).toBeVisible()
  await expect(page.getByText('Packing pulpo',{exact:true})).toBeVisible()
  await expect(page.getByText(/Producción upstream no cubre 1 lote de packing/)).toBeVisible()
  const canonicalRow=page.getByRole('row').filter({hasText:'I04-260824'})
  await expect(canonicalRow).toBeVisible()
  await expect(canonicalRow.getByRole('cell').nth(4)).toHaveText('24 ago 2026')
  await expect(canonicalRow.getByRole('cell').nth(5)).toContainText('Fuera de cobertura')
  await expect(page.getByText(/metadata del archivo declara cierre 18 ago 2026/)).toBeVisible()
  expect(consoleErrors).toEqual([])
})

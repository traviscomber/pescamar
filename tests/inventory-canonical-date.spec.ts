import {expect,test} from '@playwright/test'

test('inventory renders canonical ISO evidence without shifting the source calendar date',async({page})=>{
  const consoleErrors:string[]=[]
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())})
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname
    if(path==='/api/auth')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,operator:{id:'qa-admin',fullName:'QA Admin',email:'admin@example.test',role:'admin',plantIds:[]}})})
    if(path==='/api/inventory')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,locations:[],movements:[],lots:[],permissions:{canWrite:true}})})
    if(path==='/api/canonical-inventory-evidence')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,stock:[],packing:[],lotLinks:[{lot_code:'I04-260824',boxes:176,packing_kg:'3520.0',production_rows:0,exact_lot_match:false,first_packing_date:'2026-08-24T00:00:00.000Z',last_packing_date:'2026-08-24T00:00:00.000Z',first_reception_date:null,last_reception_date:null}],summary:{stockRows:0,packingBoxes:176,packingKg:3520,packingLots:1,matchedLots:0,unmatchedLots:1},governance:{rule:'Evidencia canónica de prueba.'}})})
    if(path==='/api/status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa',checkedAt:new Date().toISOString()})})
    return route.fulfill({status:200,contentType:'application/json',body:'{}'})
  })
  await page.goto('/inventario')
  await expect(page.getByRole('heading',{name:'Inventario',exact:true})).toBeVisible()
  await expect(page.getByRole('region',{name:'Evidencia canónica de inventario'})).toBeVisible()
  const canonicalRow=page.getByRole('row').filter({hasText:'I04-260824'})
  await expect(canonicalRow).toBeVisible()
  await expect(canonicalRow.getByRole('cell').nth(4)).toHaveText('24 ago 2026')
  expect(consoleErrors).toEqual([])
})

import {expect,test} from '@playwright/test'

test('commercial sales select active mastered customers without writing the party master',async({page})=>{
  const partnerWrites:string[]=[]
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname
    if(path==='/api/auth')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,operator:{id:'qa-admin',fullName:'QA Admin',email:'admin@example.test',role:'admin',plantIds:[]}})})
    if(path==='/api/status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa',checkedAt:new Date().toISOString()})})
    if(path==='/api/receptions')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({receptions:[]})})
    if(path==='/api/commercial')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,lots:[{reception_id:'11111111-1111-4111-8111-111111111111',reception_number:101,plant_id:'ancud',species:'Erizo',supplier:'Proveedor QA',physicalKg:100,dispatchedKg:0,availableKg:100,soldKg:0,revenueClp:0,purchaseCostClp:null,transformationCostClp:0,allocatedCostClp:null,contributionClp:null,contributionPct:null,marginClp:null,marginPct:null}],dispatches:[],sales:[],permissions:{canDispatch:true,canSell:true}})})
    if(path==='/api/partners'){
      if(route.request().method()!=='GET')partnerWrites.push(route.request().method())
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,parties:[{id:'customer-qa',kind:'customer',legal_name:'Cliente QA',active:true},{id:'customer-off',kind:'customer',legal_name:'Cliente Inactivo',active:false},{id:'supplier-qa',kind:'supplier',legal_name:'Proveedor QA',active:true}]})})
    }
    return route.fulfill({status:200,contentType:'application/json',body:'{}'})
  })

  await page.goto('/despachos-ventas')
  await expect(page.getByRole('heading',{name:'Despachos y ventas',exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Registrar venta'}).click()
  const customer=page.getByLabel('Cliente')
  await expect(customer).toHaveRole('combobox')
  await expect(customer.locator('option')).toHaveCount(2)
  await expect(customer).toContainText('Cliente QA')
  await expect(customer).not.toContainText('Cliente Inactivo')
  await expect(customer).not.toContainText('Proveedor QA')
  await customer.selectOption('Cliente QA')
  await expect(customer).toHaveValue('Cliente QA')
  expect(partnerWrites).toEqual([])
})

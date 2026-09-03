import {expect,test} from '@playwright/test'

test('canonical supplier gap prepares a master record but never writes before explicit save',async({page})=>{
 let partnerPosts=0
 let savedBody:Record<string,unknown>|null=null
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  const method=route.request().method()
  if(path==='/api/auth')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,operator:{id:'qa-admin',fullName:'QA Admin',email:'admin@example.test',role:'admin',plantIds:[]}})})
  if(path==='/api/status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa',checkedAt:new Date().toISOString()})})
  if(path==='/api/receptions')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({receptions:[]})})
  if(path==='/api/partners'&&method==='POST'){
   partnerPosts+=1
   savedBody=route.request().postDataJSON() as Record<string,unknown>
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,partyId:'11111111-1111-4111-8111-111111111111'})})
  }
  if(path==='/api/partners')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,parties:[],suppliers:[],customers:[],purchases:[],invoices:[],permissions:{canWrite:true}})})
  if(path==='/api/canonical-party-evidence')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,suppliers:[{supplier_name:'Patricio Diaz',source_rows:270,original_labels:1,original_values:['Patricio Diaz'],received_kg:12450,flagged:0,party_matches:0,party_id:null,party_name:null,identity_status:'missing_party'}],transferMatches:[],summary:{suppliers:1,exactParties:0,missingParties:1,ambiguousParties:0,exactSenderMatches:0},governance:{mode:'evidence_only',writesParties:false,rule:'No se crean parties desde nombres históricos.'}})})
  if(path==='/api/supplier-intelligence')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,summary:{suppliers:0,scored:0,preferred:0,highConfidence:0,canonicalLots:0,rowMassBalanceRows:0,rollforwardRows:0,massReviewRows:0},suppliers:[],method:{version:'qa',rule:'qa'}})})
  if(path==='/api/supplier-support-intelligence')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:'not_imported',suppliers:[],summary:{blocks:0,observations:0,autoLinkedBlocks:0,exceptions:0,suppliersWithSupport:0}})})
  if(path==='/api/supplier-economic-intelligence')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,suppliers:[],summary:{suppliers:0,scored:0,historicalScored:0,liveScored:0,mixed:0}})})
  return route.fulfill({status:200,contentType:'application/json',body:'{}'})
 })

 await page.goto('/proveedores-clientes')
 const gapRow=page.getByRole('row').filter({hasText:'Patricio Diaz'})
 await expect(gapRow).toContainText('Falta ficha')
 await gapRow.getByRole('button',{name:'Preparar alta'}).click()

 await expect(page.getByRole('heading',{name:'Crear proveedor'})).toBeVisible()
 await expect(page.getByLabel('Razón social')).toHaveValue('Patricio Diaz')
 await expect(page.getByText('Alta preparada desde evidencia canónica')).toBeVisible()
 await expect(page.getByText(/Se precargó sólo el nombre normalizado/)).toBeVisible()
 expect(partnerPosts).toBe(0)

 await page.getByRole('button',{name:'Guardar ficha'}).click()
 await expect.poll(()=>partnerPosts).toBe(1)
 expect(savedBody).toMatchObject({kind:'supplier',legalName:'Patricio Diaz'})
})

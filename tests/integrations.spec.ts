import {expect,test,type Page} from '@playwright/test'

type Role='admin'|'viewer'
async function mockApp(page:Page,role:Role){
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  if(path==='/api/auth')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,operator:{id:`qa-${role}`,fullName:`QA ${role}`,email:`${role}@example.test`,role,plantIds:role==='admin'?[]:['ancud'],organizationId:'pescamar'}})})
  if(path==='/api/status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,persistence:{database:true,files:true},metrics:{}})})
  if(path==='/api/receptions')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({receptions:[]})})
  if(path==='/api/integrations'){
   expect(route.request().headers()['x-seafood-organization-id']).toBe('pescamar')
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,schemaVersion:'seafood.integration.v1',organization:{id:'pescamar',implementationId:'pescamar',implementationName:'Pescamar',isolationMode:'single_organization_legacy'},adapters:[
    {id:'pescamar-canonical-workbook',label:'Pescamar · canonical workbook',direction:'southbound',protocol:'file',status:'evidenced',mapsTo:'canonical source evidence / historical lineage',idempotency:'implemented',evidence:'Fuente canónica protegida por identidad/hash.',organizationId:'pescamar',mutationEnabled:false},
    {id:'seafood-rest-inbound',label:'Generic REST inbound',direction:'southbound',protocol:'rest',status:'foundation',mapsTo:'seafood.integration.v1 → seafood.event.v1',idempotency:'required',evidence:'Contrato reusable definido; writer no habilitado.',organizationId:'pescamar',mutationEnabled:false},
    {id:'mqtt-edge',label:'MQTT edge gateway',direction:'southbound',protocol:'mqtt',status:'planned',mapsTo:'telemetry / measurement events',idempotency:'required',evidence:'No se declara broker ni hardware operacional.',organizationId:'pescamar',mutationEnabled:false}
   ],guardrails:['authenticated organization context','adapter allowlist','idempotency before mutation'],writePlane:{genericInboundEnabled:false,webhookInboundEnabled:false,mqttEnabled:false,industrialGatewayEnabled:false},message:'Registry read-only: ningún adapter genérico de escritura está habilitado.'})})
  }
  return route.fulfill({status:200,contentType:'application/json',body:'{}'})
 })
}

test('Integration Data Plane distinguishes evidenced, foundation and planned adapters with write plane off',async({page},testInfo)=>{
 await mockApp(page,'admin')
 await page.goto('/integrations')
 await expect(page.getByRole('heading',{name:'Integrations',exact:true})).toBeVisible()
 await expect(page.getByText('1',{exact:true})).toHaveCount(3)
 await expect(page.getByText('OFF',{exact:true})).toBeVisible()
 await expect(page.getByText('Pescamar · canonical workbook',{exact:true})).toBeVisible()
 await expect(page.getByText('Generic REST inbound',{exact:true})).toBeVisible()
 await expect(page.getByText('MQTT edge gateway',{exact:true})).toBeVisible()
 await expect(page.getByText(/ningún adapter genérico de escritura está habilitado/i)).toBeVisible()
 await expect(page.getByText('seafood.integration.v1',{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
 await page.screenshot({path:testInfo.outputPath('integration-data-plane.png'),fullPage:true})
})

test('Integration Data Plane is not exposed to viewer role',async({page})=>{
 await mockApp(page,'viewer')
 await page.goto('/integrations')
 await expect(page).toHaveURL(/\/$/)
 await expect(page.getByRole('heading',{name:'Integrations',exact:true})).toHaveCount(0)
})

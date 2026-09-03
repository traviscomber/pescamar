import {expect,test} from '@playwright/test'

test('rollout accepts an explicit structural migration baseline without fabricating historical timestamps',async({page})=>{
  const schemaMethods:string[]=[]
  const consoleErrors:string[]=[]
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())})
  await page.route('**/api/**',async route=>{
    const request=route.request(),path=new URL(request.url()).pathname
    if(path==='/api/auth')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,operator:{id:'qa-admin',fullName:'QA Admin',email:'admin@example.test',role:'admin',plantIds:[]}})})
    if(path==='/api/status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa',checkedAt:new Date().toISOString()})})
    if(path==='/api/plant-readiness')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,plants:[],summary:{blocked:0,inProgress:0,readyForHumanUat:0,readyForHumanLiveReview:0,live:0},gate:{version:'qa',rule:'Sólo evidencia real.'},disclaimer:'QA'})})
    if(path==='/api/plant-execution-readiness')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,plants:[],rule:'Evidencia física separada.'})})
    if(path==='/api/schema-preflight'){
      schemaMethods.push(request.method())
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,expected:{count:39,first:'001_core.sql',latest:'041_schema_migration_baseline.sql',migrations:[]},runtimeCompatibility:{status:'compatible',present:11,total:11,landmarks:[{name:'receptions',present:true}]},executionEvidence:{status:'baseline_verified',tracked:true,trackerTables:['public.schema_migrations'],baselineRows:38,appliedRows:1,missing:[],unexpected:[],invalid:[]},pilotGate:{status:'pass',reason:'Baseline estructural explícito verificado; fechas históricas no reconstruidas.'},governance:{writesDatabase:false,rule:'El baseline no inventa fechas históricas y las migraciones nuevas se registran individualmente.'}})})
    }
    return route.fulfill({status:200,contentType:'application/json',body:'{}'})
  })

  await page.goto('/rollout')
  await expect(page.getByRole('heading',{name:'UAT por planta',exact:true})).toBeVisible()
  const preflight=page.getByTestId('schema-preflight')
  await expect(preflight).toBeVisible()
  await expect(preflight).toContainText('Compatibilidad estructural')
  await expect(preflight).toContainText('11/11 objetos críticos presentes')
  await expect(preflight).toContainText('39 migraciones')
  await expect(preflight).toContainText('041_schema_migration_baseline.sql')
  await expect(preflight).toContainText('Baseline explícito reconciliado')
  await expect(preflight).toContainText('38 migraciones históricas verificadas')
  await expect(preflight).toContainText('Gate formal del piloto · PASS')
  await expect(preflight).toContainText('fechas históricas')
  expect(schemaMethods).toEqual(['GET'])
  expect(consoleErrors).toEqual([])
})

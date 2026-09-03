import {expect,test} from '@playwright/test'

test('rollout separates structural compatibility from migration execution evidence',async({page})=>{
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
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,expected:{count:38,first:'001_core.sql',latest:'040_cold_sensor_station_scope.sql',migrations:[]},runtimeCompatibility:{status:'compatible',present:11,total:11,landmarks:[{name:'receptions',present:true}]},executionEvidence:{status:'missing',tracked:false,trackerTables:[]},pilotGate:{status:'hold',reason:'El entorno no conserva una bitácora de migraciones aplicada que permita demostrar qué archivos se ejecutaron y en qué orden.'},governance:{writesDatabase:false,rule:'Compatibilidad estructural no equivale a evidencia de ejecución. Este endpoint sólo inspecciona; no aplica ni registra migraciones.'}})})
    }
    return route.fulfill({status:200,contentType:'application/json',body:'{}'})
  })

  await page.goto('/rollout')
  await expect(page.getByRole('heading',{name:'UAT por planta',exact:true})).toBeVisible()
  const preflight=page.getByTestId('schema-preflight')
  await expect(preflight).toBeVisible()
  await expect(preflight).toContainText('Compatibilidad estructural')
  await expect(preflight).toContainText('11/11 objetos críticos presentes')
  await expect(preflight).toContainText('38 migraciones')
  await expect(preflight).toContainText('040_cold_sensor_station_scope.sql')
  await expect(preflight).toContainText('PASS')
  await expect(preflight).toContainText('Evidencia de ejecución de migraciones')
  await expect(preflight).toContainText('HOLD')
  await expect(preflight).toContainText('no contiene una bitácora de migraciones aplicada')
  await expect(preflight).toContainText('no aplica ni registra migraciones')
  expect(schemaMethods).toEqual(['GET'])
  expect(consoleErrors).toEqual([])
})

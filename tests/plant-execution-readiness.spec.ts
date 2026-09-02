import {readFile} from 'node:fs/promises'
import {expect,test,type Page} from '@playwright/test'

test('Plant Execution readiness remains evidence-only and separate from LIVE gate',async()=>{
 const [api,component,rollout,contract]=await Promise.all([
  readFile('api/plant-execution-readiness.ts','utf8'),
  readFile('src/components/PlantExecutionReadiness.tsx','utf8'),
  readFile('src/pages/Rollout.tsx','utf8'),
  readFile('PLANT_EXECUTION_CONTRACT.md','utf8'),
 ])
 expect(api).toContain("['admin','operations'].includes(operator.role)")
 expect(api).toContain("status<>'voided'")
 expect(api).toContain("r.observation_count>0")
 expect(api).toContain("status in ('released','rejected')")
 expect(api).toContain('hasPhysicalUatEvidence')
 expect(api).toContain('No modifica el gate UAT/LIVE')
 expect(component).toContain("fetch('/api/plant-execution-readiness'")
 expect(component).toContain('Señal separada del gate LIVE')
 expect(rollout).toContain('<PlantExecutionReadiness/>')
 expect(contract).toContain('no equivale a UAT')
 expect(contract).toContain('nunca sustituye aceptación humana')
})

async function mock(page:Page){
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  const json=(body:unknown)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)})
  if(path==='/api/auth')return json({ok:true,operator:{id:'qa-operations',fullName:'QA Operations',email:'operations@example.test',role:'operations',plantIds:['ancud']}})
  if(path==='/api/receptions')return json({receptions:[]})
  if(path==='/api/history')return json({records:[],summary:null})
  if(path==='/api/status')return json({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa',checkedAt:new Date().toISOString()})
  if(path==='/api/plant-readiness')return json({plants:[{plantId:'ancud',score:0,completed:0,total:9,latestActivityAt:null,uat:{state:'blocked',humanAcceptanceRequired:true,blockers:[]},liveReadiness:{state:'uat_incomplete',requiredConsecutiveCloseDays:3,consecutiveCloseDays:0,continuityEvidenceComplete:false,humanAcceptanceRequired:true,supportIndependenceRequiresHumanConfirmation:true,autoLive:false},metrics:{users:1,operationsUsers:1,operationsCredentials:1,qualityUsers:1,qualityCredentials:1,viewerUsers:0,receptions:0,receptionsWithEvidence:0,qualityLots:0,productionLots:0,locatedKg:0,salesOrders:0,dispatches:0,sales:0,endToEndReceptions:0,dailyCloses:0,distinctCloseDays:0},checks:[]}],gate:{version:'qa',rule:'Gate UAT separado'},disclaimer:'QA'})
  if(path==='/api/plant-execution-readiness')return json({ok:true,rule:'Esta señal mide configuración y evidencia física observada. No modifica el gate UAT/LIVE ni reemplaza aceptación humana.',plants:[{plantId:'ancud',completed:2,total:6,score:33,hasPhysicalUatEvidence:false,checks:[{key:'station',label:'Estación física',complete:true,detail:'2 estaciones activas'},{key:'devices',label:'Hardware registrado',complete:true,detail:'3 dispositivos activos'},{key:'packing',label:'Packing real',complete:false,detail:'Sin packing units live'},{key:'pallet',label:'Pallet trazable',complete:false,detail:'Sin pallet físico cerrado'},{key:'cold',label:'Frío con evidencia',complete:false,detail:'Sin evidencia'},{key:'regulatory',label:'Control regulatorio ejercitado',complete:false,detail:'Sin ejercicio'}],metrics:{stations:2,devices:3,packingUnits:0,closedPallets:0,linkedColdAssets:0,coldRunsWithEvidence:0,resolvedHolds:0}}]})
  return json({})
 })
}

test('rollout shows physical evidence without promoting a plant to LIVE',async({page},testInfo)=>{
 await mock(page)
 await page.goto('/rollout')
 await expect(page.getByRole('heading',{name:'Plant Execution readiness'})).toBeVisible()
 await expect(page.getByText('33%')).toBeVisible()
 await expect(page.getByText('2/6 señales observadas')).toBeVisible()
 await expect(page.getByText('pendiente')).toBeVisible()
 await expect(page.getByText('No modifica el gate UAT/LIVE',{exact:false})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
 await page.screenshot({path:testInfo.outputPath('plant-execution-readiness.png'),fullPage:true})
})

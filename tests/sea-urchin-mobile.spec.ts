import {expect,test} from '@playwright/test'

const runId='11111111-1111-4111-8111-111111111111'
const receptionId='22222222-2222-4222-8222-222222222222'
const orangePng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAALUlEQVR4nGO806PLQEvARFPTRy0YtWDUglELRi0YtWDUglELRi0YtWDUAioCAL1xAdXUvMl1AAAAAElFTkSuQmCC','base64')

test('erizo mobile station exposes camera and analyzes an uploaded photo',async({page},testInfo)=>{
  await page.route('**/api/**',async route=>{
    const url=new URL(route.request().url()),path=url.pathname
    if(path==='/api/auth')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,operator:{id:'qa-quality',fullName:'QA Quality',email:'quality@example.test',role:'quality',plantIds:['ancud']}})})
    if(path==='/api/receptions')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({receptions:[]})})
    if(path==='/api/history')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({records:[],summary:null})})
    if(path==='/api/status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:0},commit:'qa',checkedAt:new Date().toISOString()})})
    if(path==='/api/sea-urchin-mobile')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,run:{runId,receptionId,receptionNumber:321,plantId:'ancud',species:'Erizo',supplier:'Proveedor QA',grade:null,colorStatus:'pending',status:'in_process'},permissions:{canCapture:true}})})
    if(path==='/api/sea-urchin-color'&&route.request().method()==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,run:{id:runId,plantId:'ancud',grade:null},captures:[],references:[],permissions:{canWrite:true,canManageReferences:true}})})
    return route.fulfill({status:200,contentType:'application/json',body:'{}'})
  })

  await page.goto(`/erizo/camara?runId=${runId}`)
  await expect(page.getByRole('heading',{name:'Erizo · Cámara o foto'})).toBeVisible()
  await expect(page.getByText('Dos modos, mismo análisis')).toBeVisible()
  await expect(page.getByRole('button',{name:'Abrir cámara'})).toBeVisible()
  await expect(page.getByRole('button',{name:'Usar foto'})).toBeVisible()
  await expect(page.getByText('REC-321 · Proveedor QA')).toBeVisible()

  const input=page.locator('input[type=file]')
  await input.setInputFiles({name:'muestra-erizo.png',mimeType:'image/png',buffer:orangePng})
  await expect(page.getByText('Luminosidad')).toBeVisible()
  await expect(page.getByText('verde ↔ rojo')).toBeVisible()
  await expect(page.getByText('azul ↔ amarillo')).toBeVisible()
  await expect(page.getByRole('button',{name:'Guardar medición y evidencia'})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false)
  await page.screenshot({path:testInfo.outputPath('erizo-camera-or-photo.png'),fullPage:true})
})

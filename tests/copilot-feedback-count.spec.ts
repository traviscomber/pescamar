import {expect,test,type Page} from '@playwright/test'

// Copilot feedback counter: the Copilot surfaces the ml_feedback aggregate so
// operators perceive the feedback mechanism as alive. It must render the
// localized count when the aggregate endpoint answers and stay hidden when the
// endpoint fails (graceful degradation, no nagging).

function statusPayload(){return {ok:true,persistence:{database:true,files:true},metrics:{}}}
function operatorPayload(){return {ok:true,operator:{id:'qa-operations',fullName:'QA Operaciones',email:'operations@example.test',role:'operations',plantIds:['ancud'],organizationId:'pescamar'}}}

async function mockCopilotShell(page:Page,feedbackResponse:{status:number;body:unknown}){
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  if(path==='/api/auth')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(operatorPayload())})
  if(path==='/api/status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(statusPayload())})
  if(path==='/api/receptions')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({receptions:[]})})
  if(path==='/api/ml-feedback'&&route.request().method()==='GET')return route.fulfill({status:feedbackResponse.status,contentType:'application/json',body:JSON.stringify(feedbackResponse.body)})
  return route.fulfill({status:200,contentType:'application/json',body:'{}'})
 })
}

test('copilot shows the localized feedback counter when the aggregate answers',async({page})=>{
 await mockCopilotShell(page,{status:200,body:{ok:true,counts:{total:12,thisMonth:3}}})
 await page.goto('/pescamar-ia')
 await expect(page.getByText('Tu feedback mejora el sistema: 12 valoraciones · 3 este mes')).toBeVisible()
 await page.goto('/en/pescamar-ia')
 await expect(page.getByText('Your feedback improves the system: 12 ratings · 3 this month')).toBeVisible()
})

test('copilot hides the feedback counter when the aggregate endpoint fails',async({page})=>{
 await mockCopilotShell(page,{status:500,body:{ok:false,error:'No fue posible leer el feedback'}})
 await page.goto('/pescamar-ia')
 await expect(page.getByText(/mejora el sistema/)).toHaveCount(0)
 await expect(page.getByText(/improves the system/)).toHaveCount(0)
})

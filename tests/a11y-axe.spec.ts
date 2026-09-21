// Gate de accesibilidad WCAG AA con axe-core.
//
// Política del gate (acordada con DESIGN.md §18):
// - FALLA el build sólo en violaciones axe de impacto 'critical' o 'serious'
//   dentro de las reglas etiquetadas wcag2a/wcag2aa: eso es lo que bloquea AA.
// - Las violaciones 'moderate'/'minor' se REPORTAN en la salida del test
//   (console.log por ruta) pero NO fallan: romper el build por ruido moderado
//   desincentiva el gate. Cuando un warning se vuelva crítico para el piloto,
//   se promueve a aserción explícita en el spec correspondiente.
// - Escaneo sobre el estado inicial determinista tras goto (drawer cerrado en
//   mobile): el objetivo es medir lo que ve el operador al llegar, no estados
//   transitorios. Nada de interacción previa al scan.
// - Exclusiones axe (rule+selector) sólo si son falso positivo del entorno
//   mockeado; cada una lleva comentario que lo justifica. Ninguna hoy.
import {expect,test,type Page} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import type {Result} from 'axe-core'

async function mockA11yApp(page:Page){
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname
    const json=(body:unknown)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)})
    if(path==='/api/auth')return json({ok:true,operator:{id:'qa-admin',fullName:'QA Admin',email:'admin@example.test',role:'admin',plantIds:['ancud','quellon']}})
    if(path==='/api/status')return json({ok:true,platform:'vercel-functions',environment:'test',persistence:{database:true,files:true},metrics:{pendingDecisions:0,pendingCredits:0,activeOperators:1,receptions:1},commit:'qa',checkedAt:new Date().toISOString()})
    if(path==='/api/history')return json({records:[],summary:null})
    if(path==='/api/receptions')return json({receptions:[qaReception]})
    if(path==='/api/daily-close')return json({ok:true,latest:null,history:[],metrics:{}})
    if(path==='/api/operational-intelligence-overview')return json({schemaVersion:'seafood.operational-intelligence.overview.v1',lots:1,counts:{p1:0,p2:0,p3:0},topSignals:[],boundary:{writesOperationalState:false,liveOnly:true,historicalIncluded:false}})
    if(path==='/api/operational-health')return json({ok:true,status:'healthy',summary:{checks:3,healthy:3,degraded:0,stuck:0,broken:0,critical:0,warnings:0},checks:[],alerts:[],method:{version:'health-v2',staleProcessHours:24,scheduledHealthCheck:true},deployment:{environment:'test',commit:'qa'},checkedAt:new Date().toISOString()})
    if(path==='/api/inventory')return json({locations:[],holdings:[],movements:[]})
    if(path==='/api/sales-orders')return json({orders:[],allocations:[]})
    if(path==='/api/partners')return json({parties:[],suppliers:[],customers:[],purchases:[],invoices:[],permissions:{canWrite:true}})
    if(path==='/api/profitability')return json({items:[],summary:null})
    if(path==='/api/canonical-intelligence-brief')return json({brief:null})
    if(path==='/api/public-health')return json({ok:true,status:'healthy',checkedAt:new Date().toISOString()})
    if(path==='/api/lot-360')return json({reception:qaLotReception,events:[],commercial:null})
    if(path==='/api/lot-control-card')return json({state:{code:'open',label:'En operación',tone:'ready'},blocker:null,blockers:[],nextAction:'Continuar operación',nextRoute:'/',signals:{quality:{label:'Calidad registrada',detail:null,tone:'ready'},balance:{inputKg:null,outputKg:null,yieldPct:null,lossKg:null,tone:'info'},release:{label:'Sin liberación',tone:'pending',kind:'evidence'}},evidence:{count:1},diagnosis:{state:'clear',blockers:[],nextAction:'Continuar operación',unknowns:[]}})
    if(path==='/api/lot-graph')return json({schemaVersion:'seafood.lot-graph.v1',nodes:[],summary:{nodes:0,attention:0,pending:0,japanReleasable:null}})
    if(path==='/api/lot-lifecycle')return json({available:true,state:'open',latest:null,gate:{canClose:false,blockers:[],unknowns:[]},permissions:{canClose:true,canReopen:false}})
    if(path==='/api/lot-continuity')return json({plantId:'ancud',orders:[],inventoryMovements:[],costs:[],totalTransformationCostClp:0})
    return json({})
  })
}

const qaReception={id:'qa-reception-1',reception_number:'QA-1',plant_id:'ancud',supplier:'Proveedor QA',species:'Erizo',extraction_zone:'Guafo',source_reference:'guia-180',guide_kg:100,gross_kg:95,tare_kg:5,drained_kg:88,accepted_kg:86,temperature_c:4,quality_status:'classified',evidence_count:1,evidence:[{label:'Guía de recepción',url:'/api/evidence/qa',createdAt:'2026-09-20T12:00:00.000Z'}],received_at:'2026-09-20T12:00:00.000Z'}

const qaLotReception={id:'qa-reception-1',reception_number:'QA-1',plant_id:'ancud',species:'Erizo',extraction_zone:'Guafo',source_reference:'guia-180',guide_kg:100,gross_kg:95,tare_kg:5,drained_kg:88,accepted_kg:86,temperature_c:4,quality_status:'classified',status:'received',source:'qa',received_at:'2026-09-20T12:00:00.000Z',supplier:'Proveedor QA',evidence:[{label:'Guía de recepción',url:'/api/evidence/qa',note:null,createdAt:'2026-09-20T12:00:00.000Z'}]}

const routes=['/','/recepciones','/inventario','/pescamar-ia','/ordenes-venta','/rentabilidad','/admin/salud','/lotes/qa-reception-1'] as const

function describe(violation:Result){
  return `${violation.impact} ${violation.id}: ${violation.nodes.slice(0,5).map(node=>`${node.target.join(' ')} (${node.html.slice(0,120)})`).join(' | ')}`
}

for(const route of routes){
  test(`axe WCAG AA gate: ${route}`,async({page})=>{
    await mockA11yApp(page)
    await page.goto(route)
    // Guard determinista: el shell autenticado siempre renderiza <main>; sin
    // esto un fallo de mocks podría hacer pasar el scan sobre una página vacía.
    await expect(page.locator('main')).toBeVisible({timeout:15000})
    await page.waitForLoadState('networkidle')
    const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()
    const blocking=result.violations.filter(violation=>violation.impact==='critical'||violation.impact==='serious')
    const warnings=result.violations.filter(violation=>violation.impact==='moderate'||violation.impact==='minor')
    if(warnings.length)console.log(`[axe:${route}] ${warnings.length} warning(s) moderate/minor (no bloquean):\n${warnings.map(describe).join('\n')}`)
    expect(blocking,`${route} tiene violaciones WCAG AA critical/serious:\n${blocking.map(describe).join('\n')}`).toEqual([])
  })
}

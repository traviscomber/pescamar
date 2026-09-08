import {readFile} from 'node:fs/promises'

const [shell,css,modules,app,operatingModel]=await Promise.all([
  readFile(new URL('../src/components/AppShell.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/navigation-groups.css',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/Modules.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/App.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/OperatingModel.tsx',import.meta.url),'utf8'),
])
const failures=[]
const check=(ok,msg)=>{if(!ok)failures.push(msg)}

check(shell.includes("t('nav.today')")&&shell.includes("t('nav.plants')")&&shell.includes("t('nav.commercial')")&&shell.includes("t('nav.intelligence')"),'sidebar must expose the four localized daily workspaces')
check(shell.includes('settings-link')&&shell.includes("t('nav.admin')"),'administration must remain a separate low-frequency destination')
check(!shell.includes("t('nav.more')")&&!shell.includes('<span>Más</span>'),'legacy More navigation must not return')
check(shell.includes('{to:`/plantas/${encodeURIComponent(plantContextId)}`,labelKey:\'nav.overview\',step:1}')&&shell.includes('{to:`/recepciones?${plantQuery}`,labelKey:\'nav.reception\',step:2}')&&shell.includes('{to:`/proceso?${plantQuery}`,labelKey:\'nav.process\',step:3}')&&shell.includes('{to:`/pallets?${plantQuery}`,labelKey:\'nav.packing\',step:4}')&&shell.includes('{to:`/inventario?${plantQuery}`,labelKey:\'nav.inventory\',step:5}')&&shell.includes('{to:`/frio?${plantQuery}`,labelKey:\'nav.cold\',step:6}')&&shell.includes('{to:`/ordenes-venta?${plantQuery}`,labelKey:\'nav.orders\',step:7}')&&shell.includes('{to:`/timeline?${plantQuery}`,labelKey:\'nav.history\',step:8}'),'plant operation must expose the ordered eight-stage workspace flow')
check(shell.includes('{to:"/ordenes-venta",labelKey:"nav.orders",step:1}')&&shell.includes('{to:"/despachos-ventas",labelKey:"nav.dispatch",step:2}')&&shell.includes('{to:"/liquidaciones",labelKey:"nav.settlement",step:3}'),'commercial must expose one ordered three-stage execution flow')
check(!shell.includes('{to:"/proveedores-clientes",labelKey:'),'partner master data must not compete in the daily commercial execution flow')
check(shell.includes('{to:"/pescamar-ia",labelKey:"nav.ask",step:1}')&&shell.includes('{to:"/lineage",labelKey:"nav.investigate",step:2}')&&shell.includes('{to:"/rentabilidad",labelKey:"nav.decide",step:3}'),'intelligence must reduce daily navigation to Ask, Investigate and Decide')
check(!shell.includes('{to:"/edgevision",labelKey:')&&!shell.includes('{to:"/uni",labelKey:'),'specialized vision must not compete in the daily intelligence flow')
check(shell.includes("t('shell.plantFlow')")&&shell.includes("t('shell.operationalFlow')")&&shell.includes("t('shell.commercialFlow')")&&shell.includes("t('shell.intelligenceFlow')")&&shell.includes('aria-label={tabsLabel}'),'workspace flows must expose localized process semantics for assistive technology')
check(shell.includes('workspace-step-index'),'workspace flows must render stage numbers')
check(css.includes('.operation-flow')&&css.includes('.commercial-flow')&&css.includes('.intelligence-flow')&&css.includes('.workspace-step-index'),'workspace flow hierarchy must be styled explicitly')
check(css.includes('a:not(:last-child):before'),'workspace stages must preserve visible directional continuity')
check(modules.includes('admin-hub-grid')&&modules.includes("locale==='en'?'Administration':'Administración'"),'administration must remain a localized categorized hub')
check(modules.includes("{to:'/uni',label:'Uni'")&&app.includes('<Route path="/uni"')&&app.includes('<Route path="/edgevision" element={<Navigate to="/uni" replace/>}/>'),'specialized EdgeVision/Uni access must remain reachable from administration with legacy redirect')
check(modules.includes("modelo-operativo")&&modules.includes('<OperatingModel/>'),'coded operating model must remain reachable from administration')
check(operatingModel.includes("title:'Sistema / automatización'")&&operatingModel.includes("title:'Operador generalista'")&&operatingModel.includes("title:'Responsable comercial / administrativo'")&&operatingModel.includes("title:'Gerente / supervisor'")&&operatingModel.includes("title:'Administración técnica'"),'operating model must preserve the five responsibility lanes')
check(operatingModel.includes("title:'Recepción'")&&operatingModel.includes("title:'Decisión y mejora'"),'operating model must cover the end-to-end operating flow')
check(operatingModel.includes('2–3 usuarios activos')&&operatingModel.includes('escalar sólo excepciones'),'operating model must preserve minimum staffing and exception-only escalation principles')

if(failures.length){console.error('Navigation flow smoke FAILED');failures.forEach(f=>console.error(`- ${f}`));process.exit(1)}
console.log('Navigation flow smoke PASS: four localized workspaces, plant-centric eight-stage flow, separated administration, specialist vision access and operating responsibility model verified')

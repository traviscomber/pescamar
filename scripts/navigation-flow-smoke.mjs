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

check(shell.includes("t('nav.home')")&&shell.includes("t('nav.reception')")&&shell.includes("t('nav.production')")&&shell.includes("t('nav.quality')")&&shell.includes("t('nav.inventory')")&&shell.includes("t('nav.sales')"),'sidebar must expose the six localized daily tasks')
check(shell.includes("t('nav.history')")&&shell.includes("t('nav.reports')")&&shell.includes("t('nav.settings')"),'history, reports and settings must remain separate low-frequency destinations')
check(!shell.includes("t('nav.more')")&&!shell.includes('<span>Más</span>'),'legacy More navigation must not return')
check(shell.includes('{to:`/plantas/${encodeURIComponent(plantContextId)}`,labelKey:\'nav.overview\',step:1}')&&shell.includes('{to:`/recepciones?${plantQuery}`,labelKey:\'nav.reception\',step:2}')&&shell.includes('{to:`/proceso?${plantQuery}`,labelKey:\'nav.process\',step:3}')&&shell.includes('{to:`/floor?${plantQuery}`,labelKey:\'nav.packing\',step:4}')&&shell.includes('{to:`/pallets?${plantQuery}`,labelKey:\'nav.pallets\',step:5}')&&shell.includes('{to:`/frio?${plantQuery}`,labelKey:\'nav.cold\',step:6}')&&shell.includes('{to:`/inventario?${plantQuery}`,labelKey:\'nav.inventory\',step:7}')&&shell.includes('{to:`/ordenes-venta?${plantQuery}`,labelKey:\'nav.orders\',step:8}')&&shell.includes('{to:`/timeline?${plantQuery}`,labelKey:\'nav.history\',step:9}'),'plant operation must preserve the ordered nine-stage detailed flow')
check(shell.includes('{to:"/ordenes-venta",labelKey:"nav.orders",step:1}')&&shell.includes('{to:"/despachos-ventas",labelKey:"nav.dispatch",step:2}')&&shell.includes('{to:"/liquidaciones",labelKey:"nav.settlement",step:3}'),'sales must preserve the ordered three-stage execution flow')
check(!shell.includes('{to:"/proveedores-clientes",labelKey:'),'partner master data must not compete in the daily sales execution flow')
check(shell.includes('<NavLink to="/lineage"')&&app.includes('<Route path="/pescamar-ia"')&&app.includes('<Route path="/rentabilidad"'),'advanced intelligence capabilities must remain reachable without competing in primary daily navigation')
check(shell.includes("allowed('/control-regulatorio')")&&shell.includes('<NavLink to="/control-regulatorio"')&&app.includes('<Route path="/control-regulatorio"'),'primary Quality must open the broad quality and compliance workspace')
check(modules.includes("{to:'/uni',label:'Revisión visual (Uni)'")&&app.includes('<Route path="/uni"')&&app.includes('<Route path="/edgevision" element={<Navigate to="/uni" replace/>}/>'),'specialized visual review must remain reachable from administration with the legacy redirect')
check(shell.includes("t('shell.plantFlow')")&&shell.includes("t('shell.commercialFlow')")&&shell.includes('aria-label={tabsLabel}'),'detailed workspace flows must expose localized process semantics for assistive technology')
check(shell.includes('aria-label="Trabajo diario"')&&shell.includes('aria-label="Consulta y configuración"'),'primary and secondary navigation groups must expose explicit assistive labels')
check(shell.includes('workspace-step-index'),'detailed workspace flows must render stage numbers')
check(css.includes('.operation-flow')&&css.includes('.commercial-flow')&&css.includes('.workspace-step-index'),'workspace flow hierarchy must be styled explicitly')
check(css.includes('a:not(:last-child):before'),'workspace stages must preserve visible directional continuity')
check(css.includes('.sidebar-section-label')&&css.includes('.sidebar-secondary'),'daily and secondary navigation hierarchy must be styled explicitly')
check(modules.includes('admin-hub-grid')&&modules.includes("locale==='en'?'Administration':'Administración'"),'administration must remain a localized categorized hub')
check(modules.includes("modelo-operativo")&&modules.includes('<OperatingModel/>'),'coded operating model must remain reachable from administration')
check(operatingModel.includes("title:'Sistema / automatización'")&&operatingModel.includes("title:'Operador generalista'")&&operatingModel.includes("title:'Responsable comercial / administrativo'")&&operatingModel.includes("title:'Gerente / supervisor'")&&operatingModel.includes("title:'Administración técnica'"),'operating model must preserve the five responsibility lanes')
check(operatingModel.includes("title:'Recepción'")&&operatingModel.includes("title:'Decisión y mejora'"),'operating model must cover the end-to-end operating flow')
check(operatingModel.includes('2–3 usuarios activos')&&operatingModel.includes('escalar sólo excepciones'),'operating model must preserve minimum staffing and exception-only escalation principles')

if(failures.length){console.error('Navigation flow smoke FAILED');failures.forEach(f=>console.error(`- ${f}`));process.exit(1)}
console.log('Navigation flow smoke PASS: six localized daily tasks, broad quality entry, secondary history/report-close/settings, detailed plant and sales flows, specialist visual review access and operating responsibility model verified')

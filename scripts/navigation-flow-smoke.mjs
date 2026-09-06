import {readFile} from 'node:fs/promises'

const [shell,css,modules,operatingModel]=await Promise.all([
  readFile(new URL('../src/components/AppShell.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/navigation-groups.css',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/Modules.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/OperatingModel.tsx',import.meta.url),'utf8'),
])
const failures=[]
const check=(ok,msg)=>{if(!ok)failures.push(msg)}

check(shell.includes('<span>Hoy</span>')&&shell.includes('<span>Operación</span>')&&shell.includes('<span>Comercial</span>')&&shell.includes('<span>Inteligencia</span>'),'sidebar must expose only the four daily workspaces')
check(shell.includes('<span>Administración</span>'),'administration must remain a separate low-frequency destination')
check(!shell.includes('<span>Más</span>'),'legacy More navigation must not return')
check(shell.includes('{to:"/recepciones",label:"Recepción",step:1}')&&shell.includes('{to:"/frio",label:"Frío",step:6}'),'operation must expose an ordered six-stage flow')
check(shell.includes('{to:"/ordenes-venta",label:"Órdenes",step:1}')&&shell.includes('{to:"/liquidaciones",label:"Liquidación",step:4}'),'commercial must expose one ordered four-stage flow')
check(shell.includes('{to:"/pescamar-ia",label:"Preguntar",step:1}')&&shell.includes('{to:"/lineage",label:"Investigar",step:2}')&&shell.includes('{to:"/rentabilidad",label:"Decidir",step:3}'),'intelligence must reduce daily navigation to Ask, Investigate and Decide')
check(!shell.includes('{to:"/edgevision",label:"EdgeVision"}'),'EdgeVision must not compete in the daily intelligence flow')
check(shell.includes('workspace==="operation"?"Flujo operativo"')&&shell.includes('workspace==="commercial"?"Flujo comercial"')&&shell.includes('workspace==="intelligence"?"Flujo de inteligencia"'),'workspace flows must expose process semantics for assistive technology')
check(shell.includes('workspace-step-index'),'workspace flows must render stage numbers')
check(css.includes('.operation-flow')&&css.includes('.commercial-flow')&&css.includes('.intelligence-flow')&&css.includes('.workspace-step-index'),'workspace flow hierarchy must be styled explicitly')
check(css.includes('a:not(:last-child):before'),'workspace stages must preserve visible directional continuity')
check(modules.includes('title="Configuración y control"')&&modules.includes('admin-hub-grid'),'administration must remain a simple categorized hub')
check(modules.includes("{to:'/edgevision',label:'EdgeVision'"),'specialized EdgeVision access must remain reachable from administration')
check(modules.includes("modelo-operativo")&&modules.includes('<OperatingModel/>'),'coded operating model must remain reachable from administration')
check(operatingModel.includes("title:'Sistema / automatización'")&&operatingModel.includes("title:'Operador generalista'")&&operatingModel.includes("title:'Responsable comercial / administrativo'")&&operatingModel.includes("title:'Gerente / supervisor'")&&operatingModel.includes("title:'Administración técnica'"),'operating model must preserve the five responsibility lanes')
check(operatingModel.includes("title:'Recepción'")&&operatingModel.includes("title:'Decisión y mejora'"),'operating model must cover the end-to-end operating flow')
check(operatingModel.includes('2–3 usuarios activos')&&operatingModel.includes('escalar sólo excepciones'),'operating model must preserve minimum staffing and exception-only escalation principles')

if(failures.length){console.error('Navigation flow smoke FAILED');failures.forEach(f=>console.error(`- ${f}`));process.exit(1)}
console.log('Navigation flow smoke PASS: four workspaces, separated administration, simplified flows and coded operating responsibility model verified')

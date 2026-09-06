import {readFile} from 'node:fs/promises'

const [shell,css,modules]=await Promise.all([
  readFile(new URL('../src/components/AppShell.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/navigation-groups.css',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/Modules.tsx',import.meta.url),'utf8'),
])
const failures=[]
const check=(ok,msg)=>{if(!ok)failures.push(msg)}

check(shell.includes('<span>Hoy</span>')&&shell.includes('<span>Operación</span>')&&shell.includes('<span>Comercial</span>')&&shell.includes('<span>Inteligencia</span>'),'sidebar must expose only the four daily workspaces')
check(shell.includes('<span>Administración</span>'),'administration must remain a separate low-frequency destination')
check(!shell.includes('<span>Más</span>'),'legacy More navigation must not return')
check(shell.includes('{to:"/recepciones",label:"Recepción",step:1}')&&shell.includes('{to:"/frio",label:"Frío",step:6}'),'operation must expose an ordered six-stage flow')
check(shell.includes('workspace==="operation"?"Flujo operativo"'),'operation navigation must have process semantics for assistive technology')
check(shell.includes('workspace-step-index'),'operation flow must render stage numbers')
check(css.includes('.operation-flow')&&css.includes('.workspace-step-index'),'operation flow hierarchy must be styled explicitly')
check(css.includes('a:not(:last-child):before'),'operation stages must preserve visible directional continuity')
check(modules.includes('CONFIGURACIÓN Y CONTROL')&&modules.includes('admin-hub-grid'),'administration must remain a simple categorized hub')

if(failures.length){console.error('Navigation flow smoke FAILED');failures.forEach(f=>console.error(`- ${f}`));process.exit(1)}
console.log('Navigation flow smoke PASS: four workspaces, separated administration and ordered operational process verified')

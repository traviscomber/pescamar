import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [shell,os,modules,i18n,main,appCss,uxCss]=await Promise.all([
 readFile(new URL('../src/components/AppShell.tsx',import.meta.url),'utf8'),
 readFile(new URL('../src/os.ts',import.meta.url),'utf8'),
 readFile(new URL('../src/pages/Modules.tsx',import.meta.url),'utf8'),
 readFile(new URL('../src/i18n.tsx',import.meta.url),'utf8'),
 readFile(new URL('../src/main.tsx',import.meta.url),'utf8'),
 readFile(new URL('../src/app.css',import.meta.url),'utf8'),
 readFile(new URL('../src/ux-unification.css',import.meta.url),'utf8'),
])

assert(shell.includes('<strong className="brand-name">PESCAMAR</strong>')&&shell.includes('<small className="brand-product">Seafood Intelligence OS</small>'),'brand must identify Pescamar first while retaining the OS platform context')
assert(!shell.includes('Implementación 01')&&!shell.includes('implementationLabel'),'implementation numbering must not leak into the daily shell')
assert(i18n.includes("export type Locale='es'|'en'")&&i18n.includes("locale==='es'?'es-CL':'en'"),'the product must retain ES/EN routes while Spanish resolves to the Chilean locale')
assert(main.includes("const next=`/es")&&main.includes('document.documentElement.lang=localeTag(locale)'),'Spanish must remain the default route and declare es-CL semantics')
assert(shell.includes("const switchLocale=()=>{const next=locale==='es'?'en':'es'")&&shell.includes("{locale==='es'?'EN':'ES'}"),'the ES/EN language toggle must remain available')
assert(i18n.includes("'nav.pallets':'Pallets'"),'plant flow must expose Pallets as a separate human-readable stage')
assert(shell.includes("labelKey:'nav.packing',step:4")&&shell.includes("labelKey:'nav.pallets',step:5"),'Packing and Pallets must be distinct steps')
assert(os.includes("label:'Asistente Pescamar'")&&os.includes("label:'Trazabilidad del lote'")&&os.includes("label:'Conexiones con otros sistemas'"),'technical modules must use human-first labels')
assert(!os.includes('Seafood Event Graph ·')&&!os.includes('Adapters, protocolos'),'module descriptions must not require architecture jargon')
assert(modules.includes("label:'Conexiones'")&&modules.includes("label:'Revisión visual (Uni)'")&&modules.includes("label:'Equivalencias históricas'"),'administration must explain specialist areas with familiar concepts first')
assert(appCss.indexOf("./ux-unification.css")>appCss.indexOf("./uni-qa-polish.css"),'UX convergence layer must load after historical system passes')
assert(uxCss.includes('.workspace-tabs{position:sticky')&&uxCss.includes('min-height:44px'),'shared UX layer must preserve workflow context and mobile touch targets')
assert(uxCss.includes('.page-header>.page-actions')&&uxCss.includes('.inline-field>input'),'shared page actions must remain responsive and readable')

if(failures.length){
 console.error('UX language smoke FAILED')
 failures.forEach(failure=>console.error(`- ${failure}`))
 process.exit(1)
}
console.log('UX language smoke PASS: bilingual ES/EN toggle, es-CL default semantics, Pescamar-first branding and human-first workflow labels are protected')

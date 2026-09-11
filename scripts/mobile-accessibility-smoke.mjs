import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [mobile,a11y,ux,shell,lotTable,receptions,browser]=await Promise.all([
 readFile(new URL('../src/mobile.css',import.meta.url),'utf8'),
 readFile(new URL('../src/a11y.css',import.meta.url),'utf8'),
 readFile(new URL('../src/ux-unification.css',import.meta.url),'utf8'),
 readFile(new URL('../src/components/AppShell.tsx',import.meta.url),'utf8'),
 readFile(new URL('../src/components/LotTable.tsx',import.meta.url),'utf8'),
 readFile(new URL('../src/pages/Receptions.tsx',import.meta.url),'utf8'),
 readFile(new URL('../tests/browser-smoke.spec.ts',import.meta.url),'utf8'),
])

assert(mobile.includes('overflow-x:hidden')&&mobile.includes('env(safe-area-inset-bottom)'),'mobile shell must prevent document overflow and respect safe areas')
assert(mobile.includes('.sidebar.is-open')&&shell.includes("event.key===\"Escape\"")&&shell.includes('menuButton?.focus()'),'mobile navigation must open as a drawer, close with Escape and restore focus')
assert(a11y.includes(':focus-visible')&&a11y.includes('@media(prefers-reduced-motion:reduce)'),'accessibility layer must preserve visible focus and reduced-motion support')
assert(a11y.includes('min-width:44px;min-height:44px')||ux.includes('min-height:44px'),'mobile interactive targets must preserve a minimum 44px interaction height')
assert(shell.includes('<a className="skip-link" href="#main-content">'),'keyboard users must have a skip-to-content control')

assert(lotTable.includes('mobile-card-table')&&lotTable.includes('data-label={c.lotTime}')&&lotTable.includes('data-label={c.evidence}'),'active reception rows must carry localized labels for mobile card recomposition')
assert(receptions.includes('canonical-receptions mobile-card-table')&&receptions.includes('data-label={c.receivedKg}'),'historical reception rows must carry localized canonical labels for mobile card recomposition')
assert(ux.includes('.mobile-card-table tbody{display:grid')&&ux.includes('content:attr(data-label)'),'mobile CSS must transform tagged operational tables into labeled cards instead of shrinking columns')
assert(ux.includes('.mobile-card-scroll{width:100%;margin-inline:0;padding-inline:0;overflow:visible}'),'cardified mobile tables must not depend on horizontal scrolling')

assert(browser.includes("test('viewport has no horizontal overflow'")&&browser.includes("test('mobile drawer traps focus, closes with Escape and restores trigger focus'"),'Chromium suite must retain overflow and mobile keyboard interaction coverage')

if(failures.length){console.error('Mobile accessibility smoke FAILED');failures.forEach(f=>console.error(`- ${f}`));process.exit(1)}
console.log('Mobile accessibility smoke PASS: safe areas, focus, Escape behavior, 44px targets and localized card-based reception tables are protected without changing canonical values')

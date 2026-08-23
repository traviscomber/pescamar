import {readFile} from 'node:fs/promises'
import process from 'node:process'

const base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:4173'
const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}

const [indexHtml,mainSource,appCss,mobileCss,a11yCss,authSource]=await Promise.all([
  fetch(base,{redirect:'manual'}).then(async response=>({status:response.status,text:await response.text()})),
  readFile(new URL('../src/main.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/app.css',import.meta.url),'utf8'),
  readFile(new URL('../src/mobile.css',import.meta.url),'utf8'),
  readFile(new URL('../src/a11y.css',import.meta.url),'utf8'),
  readFile(new URL('../api/_auth.ts',import.meta.url),'utf8'),
])

assert(indexHtml.status===200,`home returned HTTP ${indexHtml.status}`)
assert(/<html\s+lang=["']es["']/.test(indexHtml.text),'document language must be es')
assert(/name=["']viewport["'][^>]*width=device-width/.test(indexHtml.text),'mobile viewport meta is missing')
assert(indexHtml.text.includes('id="root"'),'application root is missing')
assert(mainSource.includes("import './app.css'"),'governed app.css entrypoint is not loaded')
assert(appCss.includes('@layer base, premium, control, modules, auth, brand, responsive, accessibility'),'CSS cascade layer order is missing')
assert(appCss.includes("@import './mobile.css' layer(responsive)"),'mobile.css is not assigned to responsive layer')
assert(appCss.includes("@import './a11y.css' layer(accessibility)"),'a11y.css is not assigned to accessibility layer')
assert(mobileCss.includes('@media(max-width:720px)'),'mobile breakpoint contract is missing')
assert(mobileCss.includes('safe-area-inset-bottom'),'safe-area support is missing')
assert(a11yCss.includes(':focus-visible'),'visible focus contract is missing')
assert(a11yCss.includes('prefers-reduced-motion'),'reduced-motion contract is missing')
assert(a11yCss.includes('min-width:44px')&&a11yCss.includes('min-height:44px'),'touch target contract is missing')
assert(authSource.includes('process.env.VERCEL_ENV !== "production" && process.env.AUTH_BYPASS === "true"'),'production auth bypass must remain impossible')

if(failures.length){
  console.error('Release smoke FAILED')
  for(const failure of failures)console.error(`- ${failure}`)
  process.exit(1)
}
console.log('Release smoke PASS: shell, layered CSS, mobile, accessibility and auth contracts verified')

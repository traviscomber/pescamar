import {readFile} from 'node:fs/promises'
import {expect,test} from '@playwright/test'

const CATCH_ALL_SOURCE='/:path((?!api/).*)'

test('every explicit React application route is served by the SPA catch-all',async()=>{
 const app=await readFile('src/App.tsx','utf8')
 const config=JSON.parse(await readFile('vercel.json','utf8')) as {rewrites?:Array<{source?:string;destination?:string}>}
 const routePaths=[...app.matchAll(/<Route path="([^"]+)"/g)].map(match=>match[1]).filter(path=>path.startsWith('/')&&path!=='/')
 const rewrites=(config.rewrites??[]).map(item=>({source:item.source??'',destination:item.destination??''}))
 const catchAll=rewrites.find(item=>item.source===CATCH_ALL_SOURCE)
 expect(catchAll?.destination).toBe('/index.html')
 expect(rewrites.some(item=>item.source==='/en'&&item.destination==='/en.html')).toBe(true)
 expect(rewrites.some(item=>item.source==='/en/:path*'&&item.destination==='/en.html')).toBe(true)
 // Every client route (none of which live under /api) is covered by the catch-all.
 const uncovered=routePaths.filter(path=>path.startsWith('/api/'))
 expect(uncovered).toEqual([])
 // No rewrite may send /api traffic to the SPA shell.
 const apiToShell=rewrites.filter(item=>item.destination==='/index.html'&&/^\/api(\/|$)/.test(item.source))
 expect(apiToShell).toEqual([])
})

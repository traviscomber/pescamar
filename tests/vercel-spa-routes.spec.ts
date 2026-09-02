import {readFile} from 'node:fs/promises'
import {expect,test} from '@playwright/test'

test('every explicit React application route is directly reachable through Vercel',async()=>{
 const app=await readFile('src/App.tsx','utf8')
 const config=JSON.parse(await readFile('vercel.json','utf8')) as {rewrites?:Array<{source?:string;destination?:string}>}
 const routePaths=[...app.matchAll(/<Route path="([^"]+)"/g)].map(match=>match[1]).filter(path=>path.startsWith('/')&&path!=='/')
 const rewrites=new Map((config.rewrites??[]).map(item=>[item.source,item.destination]))
 const missing=[...new Set(routePaths.filter(path=>rewrites.get(path)!=='/index.html'))].sort()
 expect(missing).toEqual([])
})

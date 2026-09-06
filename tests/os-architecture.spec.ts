import {expect,test,type Page} from '@playwright/test'
import {readFile} from 'node:fs/promises'
import {osModules,osStages} from '../src/os'

async function mockAdmin(page:Page){
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  if(path==='/api/auth')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,operator:{id:'qa-admin',fullName:'QA Admin',email:'admin@example.test',role:'admin',plantIds:[]}})})
  if(path==='/api/receptions')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({receptions:[]})})
  if(path==='/api/status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,persistence:{database:true,files:true},metrics:{}})})
  return route.fulfill({status:200,contentType:'application/json',body:'{}'})
 })
}

test('Seafood Intelligence OS registry has six ordered systems and unique module routes',async()=>{
 expect(osStages.map(stage=>stage.order)).toEqual([1,2,3,4,5,6])
 expect(new Set(osStages.map(stage=>stage.id)).size).toBe(6)
 const paths=osModules.map(module=>module.path)
 expect(new Set(paths).size).toBe(paths.length)
})

test('every canonical OS module is routed and governed by an access contract',async()=>{
 const [app,access]=await Promise.all([readFile('src/App.tsx','utf8'),readFile('src/access.ts','utf8')])
 for(const module of osModules){
  expect(app,`${module.path} must be mounted`).toContain(`path=\"${module.path}\"`)
  expect(access,`${module.path} must have access governance`).toContain(`\"${module.path}\"`)
 }
})

test('admin console exposes infrequent controls without recreating the full OS map',async({page})=>{
 await mockAdmin(page)
 await page.goto('/modulos')
 await expect(page.getByRole('heading',{name:'Configuración y control'})).toBeVisible()
 const console=page.getByRole('region',{name:'Administración del sistema'})
 for(const group of ['Operación y planta','Control y cumplimiento','Datos e integración','Usuarios y sistema'])await expect(console.getByRole('heading',{name:group})).toBeVisible()
 await expect(console.getByRole('link',{name:/Modelo operativo/})).toBeVisible()
 await expect(console.getByRole('link',{name:/Auditoría operacional/})).toBeVisible()
 await expect(console.getByRole('link',{name:/EdgeVision/})).toBeVisible()
 await expect(page.getByText('Un core operacional. Múltiples implementaciones.')).toHaveCount(0)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true)
})

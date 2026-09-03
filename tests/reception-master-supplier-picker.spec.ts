import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'

const modalUrl=new URL('../src/components/ReceptionModal.tsx',import.meta.url)

test('reception modal only accepts active mastered suppliers',async()=>{
  const source=await readFile(modalUrl,'utf8')
  expect(source).toContain("fetch('/api/partners',{cache:'no-store'})")
  expect(source).toContain("party.kind==='supplier'&&party.active")
  expect(source).toContain('Selecciona un proveedor del maestro')
  expect(source).toContain('supplierRef=useRef<HTMLSelectElement|null>')
  expect(source).toContain('<select ref={supplierRef}')
  expect(source).not.toContain('placeholder="Nombre o razón social"')
  expect(source).not.toContain("fetch('/api/partners',{method:'POST'")
})

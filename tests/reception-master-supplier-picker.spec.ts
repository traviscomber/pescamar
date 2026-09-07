import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'

const modalUrl=new URL('../src/components/ReceptionModal.tsx',import.meta.url)

test('reception modal only accepts active mastered suppliers and keeps manual selection as fallback',async()=>{
  const source=await readFile(modalUrl,'utf8')
  expect(source).toContain("fetch('/api/partners',{cache:'no-store'})")
  expect(source).toContain("party.kind==='supplier'&&party.active")
  expect(source).toContain("activeSuppliers.find((party)=>sameName(party.legal_name,cleaned))")
  expect(source).toContain("documentaryReady?'Corregir contexto documental':'Completar contexto manualmente'")
  expect(source).toContain("activeSuppliers.length?'Selecciona un proveedor':'Sin proveedores activos'")
  expect(source).toContain('Confirma el proveedor documental')
  expect(source).not.toContain('placeholder="Nombre o razón social"')
  expect(source).not.toContain("fetch('/api/partners',{method:'POST'")
})

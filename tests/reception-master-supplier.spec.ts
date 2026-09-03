import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'

const apiUrl=new URL('../api/receptions.ts',import.meta.url)

test('live reception never creates supplier identities implicitly',async()=>{
  const source=await readFile(apiUrl,'utf8')
  expect(source).toContain("where kind='supplier'::party_kind and active")
  expect(source).toContain('supplierMatches.length===0')
  expect(source).toContain('supplierMatches.length>1')
  expect(source).toContain('El proveedor no existe como ficha activa en el maestro')
  expect(source).toContain('La identidad del proveedor es ambigua en el maestro')
  expect(source).not.toContain('insert into parties')
  expect(source).not.toContain('inserted_party')
})

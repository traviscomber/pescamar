import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'

const apiUrl=new URL('../api/commercial.ts',import.meta.url)

test('commercial dispatches and sales never create customer identities implicitly',async()=>{
  const source=await readFile(apiUrl,'utf8')
  expect(source).toContain("kind='customer'::party_kind and active")
  expect(source).toContain('customer_master_missing')
  expect(source).toContain('customer_master_ambiguous')
  expect(source).toContain('El cliente no existe como ficha activa en Proveedores y clientes')
  expect(source).toContain('La identidad del cliente es ambigua en el maestro')
  expect(source).not.toContain("insert into parties(kind,legal_name)")
  expect(source).not.toContain("on conflict(kind,legal_name) do update set active=true")
})

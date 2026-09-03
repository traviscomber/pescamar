import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'

const apiUrl=new URL('../api/credits.ts',import.meta.url)

test('credit requests require one active mastered supplier and never create parties implicitly',async()=>{
  const source=await readFile(apiUrl,'utf8')
  expect(source).toContain("kind='supplier'::party_kind and active")
  expect(source).toContain('credit_supplier_master_missing')
  expect(source).toContain('credit_supplier_master_ambiguous')
  expect(source).toContain('El proveedor no existe como ficha activa en Proveedores y clientes')
  expect(source).toContain('La identidad del proveedor es ambigua en el maestro')
  expect(source).not.toContain("insert into parties")
  expect(source).not.toContain("select 'fisher'")
})

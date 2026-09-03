import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'

const canonicalImportUrl=new URL('../api/canonical-import.ts',import.meta.url)

test('canonical import kind must match the approved source kind',async()=>{
  const source=await readFile(canonicalImportUrl,'utf8')
  expect(source).toContain("production:new Set(['production_2026'])")
  expect(source).toContain("ledger:new Set(['finance_stock'])")
  expect(source).toContain("stock:new Set(['finance_stock'])")
  expect(source).toContain("transfers:new Set(['finance_stock'])")
  expect(source).toContain("packing:new Set(['packing_octopus_2026'])")
  expect(source).toContain('if(!sourceSupports(kind,src.source_kind))')
  expect(source).toContain('La clase de importación no corresponde al tipo de fuente canónica aprobada')
  expect(source).toContain('sourceKind,rows:rows.length,idempotent:true,immutable:true')
})

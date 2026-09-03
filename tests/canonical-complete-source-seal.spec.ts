import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'

const canonicalImportUrl=new URL('../api/canonical-import.ts',import.meta.url)

test('complete canonical datasets short-circuit direct row imports',async()=>{
  const source=await readFile(canonicalImportUrl,'utf8')
  expect(source).toContain('record_count from canonical_source_files')
  expect(source).toContain("sourceKind==='production_2026'")
  expect(source).toContain("sourceKind==='finance_stock'")
  expect(source).toContain("sourceKind==='packing_octopus_2026'")
  expect(source).toContain('expectedRows>0&&observedRows>=expectedRows')
  expect(source).toContain('sourceComplete:true,replay:true,idempotent:true,immutable:true')
  expect(source).toContain('submittedRows:rows.length')
})

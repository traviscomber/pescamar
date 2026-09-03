import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'

const historicalImportUrl=new URL('../api/historical-import.ts',import.meta.url)
const canonicalImportUrl=new URL('../api/canonical-import.ts',import.meta.url)

test('historical production import is append-only per source hash and row',async()=>{
  const source=await readFile(historicalImportUrl,'utf8')
  expect(source).toContain('on conflict(source_file_hash,source_row) do nothing')
  expect(source).not.toContain('on conflict(source_file_hash,source_row) do update')
  expect(source).toContain('immutable:true')
  expect(source).toContain('duplicates=Math.max(0,clean.length-inserted)')
})

test('canonical source imports never overwrite existing lineage rows',async()=>{
  const source=await readFile(canonicalImportUrl,'utf8')
  expect(source).toContain('on conflict(source_file_hash,source_row) do nothing')
  expect(source.match(/on conflict\(source_file_hash,sheet_name,source_row\) do nothing/g)).toHaveLength(4)
  expect(source).not.toContain('do update set')
  expect(source).toContain('idempotent:true,immutable:true')
})

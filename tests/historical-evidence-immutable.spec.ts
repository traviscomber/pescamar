import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'

const historicalImportUrl=new URL('../api/historical-import.ts',import.meta.url)

test('historical production import is append-only per source hash and row',async()=>{
  const source=await readFile(historicalImportUrl,'utf8')
  expect(source).toContain('on conflict(source_file_hash,source_row) do nothing')
  expect(source).not.toContain('on conflict(source_file_hash,source_row) do update')
  expect(source).toContain('immutable:true')
  expect(source).toContain('duplicates=Math.max(0,clean.length-inserted)')
})

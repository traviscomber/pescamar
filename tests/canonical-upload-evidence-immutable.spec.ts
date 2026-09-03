import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'

const canonicalUploadUrl=new URL('../api/canonical-upload.ts',import.meta.url)
const supportImportUrl=new URL('../api/production-support-import.ts',import.meta.url)

test('canonical workbook upload never overwrites source evidence',async()=>{
  const source=await readFile(canonicalUploadUrl,'utf8')
  expect(source).toContain('on conflict(source_file_hash,source_row) do nothing')
  expect(source).toContain('on conflict(source_file_hash,sheet_name,source_row) do nothing')
  expect(source).toContain('on conflict(source_file_hash,parser_version,sheet_name,source_block) do nothing')
  expect(source).toContain('on conflict(source_file_hash,parser_version,sheet_name,source_block,source_row) do nothing')
  expect(source).not.toContain(' do update set ')
  expect(source).toContain('immutable:true')
})

test('production support upload never overwrites source evidence',async()=>{
  const source=await readFile(supportImportUrl,'utf8')
  expect(source).toContain('on conflict(source_file_hash,parser_version,sheet_name,source_block) do nothing')
  expect(source).toContain('on conflict(source_file_hash,parser_version,sheet_name,source_block,source_row) do nothing')
  expect(source).not.toContain(' do update set ')
  expect(source).toContain('immutable:true')
})

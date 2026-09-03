import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'

const canonicalUploadUrl=new URL('../api/canonical-upload.ts',import.meta.url)

test('canonical workbook replay does not mutate source registry metadata',async()=>{
  const source=await readFile(canonicalUploadUrl,'utf8')
  expect(source).toContain('select file_name,source_kind,canonical from canonical_source_files')
  expect(source).not.toContain('update canonical_source_files')
  expect(source).toContain('sourceRecordCount,idempotent:true,immutable:true,writesLive:false')
  expect(source).toContain('on conflict(source_file_hash,source_row) do nothing')
  expect(source).toContain('on conflict(source_file_hash,parser_version,sheet_name,source_block) do nothing')
})

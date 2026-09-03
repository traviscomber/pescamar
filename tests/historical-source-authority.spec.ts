import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'

const historicalImportUrl=new URL('../api/historical-import.ts',import.meta.url)

test('historical import requires approved source or exact existing lineage',async()=>{
  const source=await readFile(historicalImportUrl,'utf8')
  expect(source).toContain('from canonical_source_files where file_hash=${fileHash}')
  expect(source).toContain('source_file_hash=${fileHash} and source_file=${fileName}')
  expect(source).toContain("sourceAuthority=approved?'canonical_source_files':'existing_lineage'")
  expect(source).toContain('La fuente histórica no está aprobada en el registro canónico ni corresponde a un linaje existente')
  expect(source).toContain('on conflict(source_file_hash,source_row) do nothing')
  expect(source).toContain('idempotent:true,immutable:true')
})

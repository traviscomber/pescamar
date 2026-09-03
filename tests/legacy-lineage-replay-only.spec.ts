import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'

const historicalImportUrl=new URL('../api/historical-import.ts',import.meta.url)

test('unregistered legacy lineage cannot gain new source rows',async()=>{
  const source=await readFile(historicalImportUrl,'utf8')
  expect(source).toContain("sourceAuthority=approved?'canonical_source_files':'existing_lineage'")
  expect(source).toContain('source_row=any(${requestedRows}::int[])')
  expect(source).toContain('requestedRows.some(sourceRow=>!knownRows.has(sourceRow))')
  expect(source).toContain('La fuente legacy sólo admite replay de filas ya registradas; no se pueden añadir filas sin el archivo canónico verificable')
  expect(source).toContain('legacyReplayOnly:!approved')
  expect(source).toContain('on conflict(source_file_hash,source_row) do nothing')
})

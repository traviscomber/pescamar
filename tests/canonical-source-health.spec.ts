import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'

test('canonical source health separates ingestion integrity from quality review',async()=>{
 const source=await readFile('api/canonical-source-health.ts','utf8')
 expect(source).toContain("schemaVersion:'seafood.canonical.source-health.v1'")
 expect(source).toContain("production_2026:['production']")
 expect(source).toContain("finance_stock:['account','stock','transfers']")
 expect(source).toContain("packing_octopus_2026:['packing']")
 expect(source).toContain("integrity:'reference' as Integrity")
 expect(source).toContain("integrity:integrity(expected,actual)")
 expect(source).toContain("qualityReviewSources:measurable.filter(item=>n(item.flaggedRows)>0||n(item.futureRows)>0).length")
 expect(source).toContain("governance:'legacy_replay_only'")
 expect(source).toContain("promotionAllowed:false")
 expect(source).toContain('Flags y fechas futuras son señales de revisión, no prueba automática de error.')
 expect(source).not.toContain('insert into receptions')
 expect(source).not.toContain('insert into inventory_movements')
 expect(source).not.toContain('insert into parties')
 expect(source).not.toContain('update canonical_source_files')
})

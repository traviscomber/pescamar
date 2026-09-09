import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'

test('canonical source health separates ingestion integrity from quality review',async()=>{
 const [health,endpoint,routed]=await Promise.all([
  readFile('api/_canonical-source-health.ts','utf8'),
  readFile('api/canonical-source-health.ts','utf8'),
  readFile('api/_copilot-route-evidence.ts','utf8'),
 ])
 expect(health).toContain("schemaVersion:'seafood.canonical.source-health.v1'")
 expect(health).toContain("production_2026:['production']")
 expect(health).toContain("finance_stock:['account','stock','transfers']")
 expect(health).toContain("packing_octopus_2026:['packing']")
 expect(health).toContain("integrity:'reference' as CanonicalSourceIntegrity")
 expect(health).toContain("integrity:integrity(expected,actual)")
 expect(health).toContain("qualityReviewSources:measurable.filter(item=>n(item.flaggedRows)>0||n(item.futureRows)>0).length")
 expect(health).toContain("governance:'legacy_replay_only' as const")
 expect(health).toContain("promotionAllowed:false as const")
 expect(health).toContain('Flags y fechas futuras son señales de revisión, no prueba automática de error.')
 expect(health).not.toContain('insert into receptions')
 expect(health).not.toContain('insert into inventory_movements')
 expect(health).not.toContain('insert into parties')
 expect(health).not.toContain('update canonical_source_files')
 expect(endpoint).toContain("import {buildCanonicalSourceHealth} from './_canonical-source-health.js'")
 expect(endpoint).not.toContain("from './_db.js'")
 expect(routed).toContain("selected.includes('canonical_intelligence')")
 expect(routed).toContain("['admin','operations'].includes(operator.role)")
 expect(routed).toContain('sourceHealth:sourceHealthRaw')
})

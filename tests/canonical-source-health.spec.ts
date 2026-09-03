import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'

const apiUrl=new URL('../api/canonical-source-health.ts',import.meta.url)
const componentUrl=new URL('../src/components/CanonicalSourceHealth.tsx',import.meta.url)
const appUrl=new URL('../src/App.tsx',import.meta.url)

test('source health remains read-only and only measures contracted source kinds',async()=>{
  const source=await readFile(apiUrl,'utf8')
  expect(source).toContain("production_2026:['production']")
  expect(source).toContain("finance_stock:['account','stock','transfers']")
  expect(source).toContain("packing_octopus_2026:['packing']")
  expect(source).toContain("integrity:'reference'")
  expect(source).toContain("governance:'legacy_replay_only'")
  expect(source).toContain("writes:false")
  expect(source).not.toContain('insert into ')
  expect(source).not.toContain('delete from ')
  expect(source).not.toContain('update canonical_')
})

test('source health separates row integrity from quality review signals',async()=>{
  const source=await readFile(apiUrl,'utf8')
  expect(source).toContain("expected===actual")
  expect(source).toContain("actual<expected?'partial':'over'")
  expect(source).toContain('flaggedRows')
  expect(source).toContain('futureRows')
  expect(source).toContain('Flags y fechas futuras son señales de revisión, no prueba automática de error.')
})

test('dashboard only exposes corporate source health to admin and operations',async()=>{
  const component=await readFile(componentUrl,'utf8')
  const app=await readFile(appUrl,'utf8')
  expect(component).toContain("operator?.role==='admin'||operator?.role==='operations'")
  expect(component).toContain("fetch('/api/canonical-source-health'")
  expect(component).toContain('Integridad canónica')
  expect(component).toContain('Evidencia legacy preservada')
  expect(app).toContain('import { CanonicalSourceHealth }')
  expect(app).toContain('<CanonicalSourceHealth/>')
})

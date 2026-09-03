import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'

const apiUrl=new URL('../api/copilot.ts',import.meta.url)
const uiUrl=new URL('../src/pages/Copilot.tsx',import.meta.url)
const healthUrl=new URL('../api/_canonical-source-health.ts',import.meta.url)

test('Pescamar IA receives canonical source health only with corporate history scope',async()=>{
  const source=await readFile(apiUrl,'utf8')
  expect(source).toContain("if(context.scope.corporateHistory)")
  expect(source).toContain('buildCanonicalSourceHealth()')
  expect(source).toContain('context.data.canonical_health=canonicalHealth')
  expect(source).toContain("id:'canonical_health'")
  expect(source).toContain("path:'/importaciones'")
})

test('Pescamar IA distinguishes ingestion integrity from quality review',async()=>{
  const source=await readFile(apiUrl,'utf8')
  expect(source).toContain('observedRows = expectedRows')
  expect(source).toContain('flaggedRows o futureRows requieren revisión')
  expect(source).toContain('no prueban por sí solos que la ingestión esté incompleta')
  expect(source).toContain('integrity=reference')
  expect(source).toContain('legacyEvidence es evidencia histórica replay-only')
})

test('canonical health uses one shared contract for API and AI',async()=>{
  const source=await readFile(healthUrl,'utf8')
  const api=await readFile(apiUrl,'utf8')
  expect(source).toContain('export async function buildCanonicalSourceHealth()')
  expect(api).toContain("from './_canonical-source-health.js'")
  expect(source).toContain("finance_stock:['account','stock','transfers']")
})

test('Copilot UI renders canonical health and inventory citations',async()=>{
  const source=await readFile(uiUrl,'utf8')
  expect(source).toContain('canonical_inventory|canonical_health')
  expect(source).toContain('¿La data canónica está completa y qué requiere revisión?')
})

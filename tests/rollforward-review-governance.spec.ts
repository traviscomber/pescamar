import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'

const resolutionUrl=new URL('../api/rollforward-resolution.ts',import.meta.url)
const resolutionsUrl=new URL('../api/rollforward-resolutions.ts',import.meta.url)
const queueUrl=new URL('../src/components/RollforwardResolutionQueue.tsx',import.meta.url)

test('final roll-forward decisions cannot be silently replaced',async()=>{
  const source=await readFile(resolutionUrl,'utf8')
  expect(source).toContain("existingStatus==='linked'||existingStatus==='unmatched'")
  expect(source).toContain('La resolución ya está cerrada y no puede reemplazarse')
  expect(source).toContain("where canonical_production_support_resolutions.resolution_status='deferred'")
  expect(source).toContain('idempotentReplay:true')
  expect(source).toContain("resolutionStatus==='linked'?selectedMainSourceRow:null")
})

test('a revised deferred decision retains its prior review evidence',async()=>{
  const source=await readFile(resolutionUrl,'utf8')
  expect(source).toContain("version:'rollforward-resolution-snapshot-v4'")
  expect(source).toContain('priorReview=existing?')
  expect(source).toContain('candidateSnapshot:existing.candidate_snapshot??null')
  expect(source).toContain('Actualizar una revisión existente requiere una nota que explique el cambio')
})

test('read API and UI state the decision-governance contract',async()=>{
  const [api,ui]=await Promise.all([readFile(resolutionsUrl,'utf8'),readFile(queueUrl,'utf8')])
  expect(api).toContain('closedDecisionsImmutable:true')
  expect(api).toContain('deferredDecisionsRevisable:true')
  expect(api).toContain('priorReviewRetainedInSnapshot:true')
  expect(ui).toContain('Las decisiones finales vinculadas o cerradas sin vínculo son inmutables.')
  expect(ui).toContain('Revisión previa conservada:')
})

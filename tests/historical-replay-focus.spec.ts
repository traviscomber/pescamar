import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'
import {routeSeafoodQuery} from '../api/_seafood-query-router'

const evidenceUrl=new URL('../api/_copilot-historical-lineage.ts',import.meta.url)
const routedEvidenceUrl=new URL('../api/_copilot-route-evidence.ts',import.meta.url)

test('explicit historical lot code routes to historical evidence',()=>{
  const route=routeSeafoodQuery({question:'Revisa el lote histórico mm120060625 y dime hasta dónde llega la evidencia',hasLot:false,hasPhotos:false,seniorUrchin:false})
  expect(route.route).toBe('investigative')
  expect(route.intent).toBe('investigate_historical_lot')
  expect(route.focusHistoricalLotCode).toBe('mm120060625')
  expect(route.requiredCapabilities).toContain('historical_lineage')
  expect(route.requiredCapabilities).toContain('canonical_intelligence')
  expect(route.writesAllowed).toBe(false)
})

test('focused historical replay remains read-only and never promotes to live',async()=>{
  const source=await readFile(evidenceUrl,'utf8')
  const routed=await readFile(routedEvidenceUrl,'utf8')
  expect(source).toContain("lower(lot_code)=lower(${focus})")
  expect(source).toContain('focusMatchCount:focusRecords.length')
  expect(source).toContain('promotionAllowed:false')
  expect(source).toContain('liveInventory:false')
  expect(source).toContain('packing:false,inventory:false,commercialCommitment:false,dispatch:false,sale:false,finance:false')
  expect(source).not.toContain('insert into receptions')
  expect(source).not.toContain('insert into inventory_movements')
  expect(source).not.toContain('insert into sales_orders')
  expect(source).not.toContain('insert into settlements')
  expect(routed).toContain('route.focusHistoricalLotCode??null')
})

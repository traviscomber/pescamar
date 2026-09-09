import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'

const financeUrl=new URL('../api/canonical-finance-evidence.ts',import.meta.url)
const partyUrl=new URL('../api/canonical-party-evidence.ts',import.meta.url)

test('canonical finance evidence excludes non-transactional workbook rows and recomputes movement delta',async()=>{
  const source=await readFile(financeUrl,'utf8')
  expect(source).toContain('transactional_rows')
  expect(source).toContain('amount_without_date_rows')
  expect(source).toContain('dated_zero_rows')
  expect(source).toContain('reference_rows')
  expect(source).toContain('recomputed_delta_clp')
  expect(source).toContain('source_final_balance_clp')
  expect(source).toContain("event_date is not null and (coalesce(inflow_clp,0)<>0 or coalesce(outflow_clp,0)<>0)")
  expect(source).toContain("movementRule:'Sólo una fila fechada con entrada o salida distinta de cero se considera movimiento transaccional.'")
  expect(source).toContain("balanceRule:'El saldo operativo no se toma del valor cacheado del workbook.")
  expect(source).toContain('a.event_date is not null and coalesce(a.inflow_clp,0)<>0')
})

test('canonical party evidence never upgrades historical names or bank senders into master parties',async()=>{
  const source=await readFile(partyUrl,'utf8')
  expect(source).toContain("then 'exact_party'")
  expect(source).toContain("then 'historical_name_only'")
  expect(source).toContain("else 'ambiguous_party'")
  expect(source).toContain('exactPartyTransferMatches')
  expect(source).toContain('historicalNameOnlyTransfers')
  expect(source).toContain('ambiguousPartyTransfers')
  expect(source).not.toContain('exactSenderMatches')
  expect(source).toContain('Sólo identity_status=exact_party implica vínculo')
  expect(source).toContain('no se crean parties desde similitud, aliases o remitentes')
})

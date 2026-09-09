import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'

test('canonical quality keeps monetary ledger detail out of Quality responses',async()=>{
 const source=await readFile('api/canonical-quality.ts','utf8')
 expect(source).toContain("const financialDetailVisible=['admin','operations','finance'].includes(operator.role)")
 expect(source).toContain('const ledgerDataset=financialDetailVisible?ledger:{')
 expect(source).toContain('canonical_balance_mismatch_rows:ledger.canonical_balance_mismatch_rows')
 expect(source).toContain('last_movement_source_row:ledger.last_movement_source_row')
 expect(source).toContain('datasets:{production,ledger:ledgerDataset,packing,stock,transfers,sources}')
 expect(source).toContain('Quality receives ledger quality counts and lineage only; monetary balances and monetary differences remain reserved to admin, operations and finance.')
 const redactedBlock=source.slice(source.indexOf('const ledgerDataset=financialDetailVisible?ledger:{'),source.indexOf('return res.status(200).json'))
 expect(redactedBlock).not.toContain('max_balance_diff_clp:ledger.max_balance_diff_clp')
 expect(redactedBlock).not.toContain('final_recomputed_balance_clp:ledger.final_recomputed_balance_clp')
})

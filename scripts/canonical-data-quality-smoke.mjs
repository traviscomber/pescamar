import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [status,connections,quality]=await Promise.all([
  readFile(new URL('../api/canonical-status.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/canonical-connections.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/canonical-quality.ts',import.meta.url),'utf8'),
])

const movementRule="event_date is not null and (inflow_clp is not null or outflow_clp is not null)"
assert(status.includes(movementRule),'canonical status must classify ledger movements from dated monetary rows only')
assert(status.includes('reference_rows'),'canonical status must expose preserved ledger reference rows')
assert(status.includes('source_rows'),'canonical status must distinguish source rows from financial movements')
assert(status.includes('filter(where is_movement))[1] final_balance_clp'),'final canonical balance must come from the last valid movement, not a trailing summary row')
assert(connections.includes(movementRule),'finance reconciliation must use the audited ledger movement boundary')
assert(connections.includes('ledger_reference_rows'),'canonical connections must expose non-movement reference rows')
assert(connections.includes('ledger_summary_rows'),'canonical connections must expose pure summary rows')
assert(connections.includes('a.is_movement and a.event_date=t.event_date'),'transfer matching must ignore reference rows')
assert(connections.includes('El saldo canónico se recompone desde entradas/salidas'),'governance must state that source running-balance formulas are not trusted as canonical truth')
assert(connections.includes('writesLive:false'),'canonical quality diagnostics must remain read-only toward live operations')
assert(quality.includes("schemaVersion:'seafood.canonical.quality.v1'"),'canonical quality API must expose a versioned contract')
assert(quality.includes("promotionToLive:'blocked_without_deterministic_reconciliation'"),'canonical quality API must block implicit promotion to live operations')
assert(quality.includes('abs(coalesce(balance_clp,0)-coalesce(recomputed_balance,0))>0.01'),'balance diagnostics must ignore sub-cent numeric noise')
assert(quality.includes('partition by source_file_hash'),'balance diagnostics must recompute independently per source file')
assert(quality.includes('missing_guide_price'),'production guide price coverage must remain explicit')
assert(quality.includes('missing_lot_boxes'),'packing lot traceability must remain explicit')
assert(quality.includes('readOnly:true'),'canonical quality diagnostics must be read-only')

if(failures.length){
  console.error('Canonical data quality smoke FAILED')
  for(const failure of failures)console.error(`- ${failure}`)
  process.exit(1)
}
console.log('Canonical data quality smoke PASS: ledger movements, preserved references, recomputed balance, source-scoped diagnostics and safe promotion boundary verified')

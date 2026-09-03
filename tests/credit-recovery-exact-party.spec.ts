import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'

const approvalsUrl=new URL('../api/approvals.ts',import.meta.url)

test('settlement credit recovery uses exact supplier party identity only',async()=>{
  const source=await readFile(approvalsUrl,'utf8')
  expect(source).toContain('left join credit_accounts ca on ca.party_id=r.supplier_id')
  expect(source).not.toContain('lower(trim(ap.legal_name))=lower(trim(p.legal_name))')
  expect(source).not.toContain('a.party_id=r.supplier_id or')
})

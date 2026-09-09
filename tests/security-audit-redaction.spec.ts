import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('security audit browser DTO',()=>{
  it('does not select or expose auth event metadata',()=>{
    const api=readFileSync('api/security-audit.ts','utf8')
    const ui=readFileSync('src/components/SecurityAudit.tsx','utf8')
    expect(api).not.toContain('e.metadata')
    expect(api).not.toMatch(/events\s*:\s*eventRows[^}]*metadata/)
    expect(ui).not.toContain('metadata?:')
    expect(api).toContain('e.event_type,e.occurred_at,o.full_name as operator_name')
  })
})

import {readFile} from 'node:fs/promises'
import {expect,test} from '@playwright/test'

test('Label Engine keeps every mutation behind the Plant Execution gate',async()=>{
 const api=await readFile('api/label-engine.ts','utf8')
 const gate=api.indexOf("if(req.method==='POST'&&!writesEnabled())")
 const auth=api.indexOf('const operator=await requireOperator(req)')
 expect(gate).toBeGreaterThan(-1)
 expect(auth).toBeGreaterThan(gate)
 expect(api).toContain("action==='createTemplateVersion'")
 expect(api).toContain("action==='queuePrint'")
})

test('label templates are append-only and print jobs snapshot payloads idempotently',async()=>{
 const api=await readFile('api/label-engine.ts','utf8')
 const migration=await readFile('db/migrations/034_label_engine.sql','utf8')
 expect(api).toContain('insert into label_templates')
 expect(api.toLowerCase()).not.toContain('update label_templates')
 expect(api).toContain('payload_snapshot')
 expect(api).toContain('idempotency_key')
 expect(migration).toContain("unique(plant_id,idempotency_key)")
 expect(migration).toContain('label_templates_scope_code_version_unique')
})

test('Label Engine never claims a queued job was physically printed',async()=>{
 const api=await readFile('api/label-engine.ts','utf8')
 expect(api).toContain("const status=sourceJobId?'reprinted':'queued'")
 expect(api).not.toContain("status='printed'")
 expect(api).not.toContain("status='sent'")
})

import {readFile} from 'node:fs/promises'
import {expect,test} from '@playwright/test'

test('Plant Execution binds idempotency key to the full normalized packing intent',async()=>{
 const api=await readFile('api/plant-execution.ts','utf8')
 expect(api).toContain("createHash('sha256')")
 expect(api).toContain("'payloadFingerprint'")
 expect(api).toContain('packingSpecId||null')
 expect(api).toContain('seaUrchinRunId||null')
 expect(api).toContain('packingUnitCode,netKg,grossKg,tareKg,product,grade,format')
 expect(api).toContain('event.payload_fingerprint===payloadFingerprint')
})

test('the conflict winner is re-read and validated before packing materialization',async()=>{
 const api=await readFile('api/plant-execution.ts','utf8')
 const insert=api.indexOf('on conflict(plant_id,idempotency_key) do nothing')
 const reread=api.indexOf('if(!event)event=await eventSelect()',insert)
 const validate=api.indexOf("if(!same)return res.status(409).json({ok:false,error:'Idempotency key ya fue utilizada para otra operación de packing'})",reread)
 const materialize=api.indexOf('let packing=',validate)
 expect(insert).toBeGreaterThan(-1)
 expect(reread).toBeGreaterThan(insert)
 expect(validate).toBeGreaterThan(reread)
 expect(materialize).toBeGreaterThan(validate)
})

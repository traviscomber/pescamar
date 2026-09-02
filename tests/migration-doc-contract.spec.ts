import {readdir,readFile} from 'node:fs/promises'
import {expect,test} from '@playwright/test'

test('database README documents every canonical migration file',async()=>{
 const [files,readme]=await Promise.all([readdir('db/migrations'),readFile('db/README.md','utf8')])
 const migrations=files.filter(file=>/^\d{3}_.+\.sql$/.test(file)).sort()
 expect(migrations.length).toBeGreaterThan(0)
 for(const migration of migrations)expect(readme).toContain(`\`${migration}\``)
 expect(readme).toContain('todos')
 expect(readme).toContain('db/migrations/')
})

test('pilot acceptance reflects linked UAT and human LIVE gates',async()=>{
 const pilot=await readFile('PILOT_ACCEPTANCE.md','utf8')
 expect(pilot).toContain('Flujo E2E en un mismo lote')
 expect(pilot).toContain('reception_id')
 expect(pilot).toContain('3 días consecutivos')
 expect(pilot).toContain('aceptación humana explícita')
 expect(pilot).toContain('db/migrations/')
})

import {readFile} from 'node:fs/promises'
import {expect,test} from '@playwright/test'

const requiredServerVariables=['DATABASE_URL','CRON_SECRET','WHATSAPP_WEBHOOK_SECRET','ADMIN_SETUP_TOKEN'] as const

test('example environment documents required operational server variables',async()=>{
 const example=await readFile('.env.example','utf8')
 for(const variable of requiredServerVariables)expect(example).toMatch(new RegExp(`^${variable}=`, 'm'))
})

import {expect,test} from '@playwright/test'
import {assessCommunicationsReadiness} from '../api/_communications-health'

const base={webhookConfigured:true,activeChannels:1,interpretedChannels:1,criticalPending:0,messages:12,messages24h:3,pendingInsights:0}

test('historical messages cannot mask the absence of active channels',()=>{
 const result=assessCommunicationsReadiness({...base,activeChannels:0,interpretedChannels:0,messages:120})
 expect(result.status).toBe('degraded')
 expect(result.warning?.id).toBe('whatsapp-no-active-channels')
})

test('WhatsApp Intelligence requires at least one interpreted channel',()=>{
 const result=assessCommunicationsReadiness({...base,activeChannels:4,interpretedChannels:0})
 expect(result.status).toBe('degraded')
 expect(result.warning?.id).toBe('whatsapp-no-interpreted-channels')
})

test('critical pending insight keeps communications degraded',()=>{
 const result=assessCommunicationsReadiness({...base,criticalPending:2})
 expect(result.status).toBe('degraded')
 expect(result.warning).toBeNull()
 expect(result.detail).toContain('2 insight(s) críticos')
})

test('communications becomes healthy only with configuration channels interpretation and ingesta',()=>{
 const result=assessCommunicationsReadiness(base)
 expect(result.status).toBe('healthy')
 expect(result.warning).toBeNull()
})

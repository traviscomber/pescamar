import {expect,test} from '@playwright/test'
import {purchaseDecisionFor,purchaseScoreFor} from '../src/supplierDecision'

const supplier={score:88,coverage:90,confidence:'alta' as const,components:[{key:'quality',weight:30,score:92},{key:'yield',weight:25,score:88},{key:'consistency',weight:15,score:86},{key:'compliance',weight:10,score:90},{key:'profitability',weight:10,score:null},{key:'incidents',weight:10,score:91}]}

test('shared decision engine uses the same 90/10 performance and economics rule',()=>{
 const economics={score:70}
 expect(purchaseScoreFor(supplier,economics)).toBe(88.4)
 expect(purchaseDecisionFor({supplier,economics,support:undefined,supportStatus:'not_imported'}).label).toBe('Priorizar compra')
})

test('physical reconciliation exception takes precedence over a strong score',()=>{
 const decision=purchaseDecisionFor({supplier,economics:{score:70},support:{exceptions:1},supportStatus:'ready'})
 expect(decision.label).toBe('Revisar trazabilidad')
 expect(decision.level).toBe('warning')
})

test('weak economics prevents a strong performance score from being prioritized',()=>{
 const decision=purchaseDecisionFor({supplier,economics:{score:28},support:undefined,supportStatus:'not_imported'})
 expect(decision.label).toBe('Negociar antes de comprar')
})

test('relative price is only a fallback when Grade A economics is absent',()=>{
 expect(purchaseDecisionFor({supplier,economics:undefined,support:undefined,supportStatus:'not_imported',relativePricePct:18}).label).toBe('Negociar antes de comprar')
 expect(purchaseDecisionFor({supplier,economics:{score:70},support:undefined,supportStatus:'not_imported',relativePricePct:18}).label).toBe('Priorizar compra')
})

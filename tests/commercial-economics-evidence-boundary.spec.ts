import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'

test('commercial lot economics keep transformation cost unknown until evidence exists',async()=>{
 const source=await readFile('api/commercial.ts','utf8')
 expect(source).toContain('(select sum(tc.amount_clp) from transformation_costs tc where tc.reception_id=r.id) transformation_cost_clp')
 expect(source).not.toContain('(select coalesce(sum(tc.amount_clp),0) from transformation_costs tc where tc.reception_id=r.id) transformation_cost_clp')
 expect(source).toContain('transformationCost=row.transformation_cost_clp==null?null:Number(row.transformation_cost_clp)')
 expect(source).toContain('soldTransformationCost=transformationCost==null||base<=0?null:transformationCost*(sold/base)')
 expect(source).toContain('totalKnownCost=soldPurchaseCost==null||soldTransformationCost==null?null:soldPurchaseCost+soldTransformationCost')
 expect(source).toContain('contribution=totalKnownCost==null?null:revenue-totalKnownCost')
})

import {expect,test} from '@playwright/test'
import {assessCommercialReadiness} from '../api/_plant-readiness-rules.js'

test('commercial readiness accepts plant-scoped live commercial signals',()=>{
 const result=assessCommercialReadiness({plantOrders:1,dispatches:0,sales:0,linkedEndToEndReceptions:0})
 expect(result.complete).toBe(true)
 expect(result.aggregateSignals).toBe(1)
 expect(result.detail).toContain('1 eventos/órdenes vigentes')
})

test('commercial readiness accepts a linked corporate-order allocation',()=>{
 const result=assessCommercialReadiness({plantOrders:0,dispatches:0,sales:0,linkedEndToEndReceptions:1})
 expect(result.complete).toBe(true)
 expect(result.aggregateSignals).toBe(0)
 expect(result.detail).toContain('señal comercial vigente enlazada')
})

test('commercial readiness stays incomplete without any live commercial evidence',()=>{
 const result=assessCommercialReadiness({plantOrders:0,dispatches:0,sales:0,linkedEndToEndReceptions:0})
 expect(result.complete).toBe(false)
 expect(result.detail).toBe('Sin orden vigente, asignación enlazada, despacho ni venta')
})

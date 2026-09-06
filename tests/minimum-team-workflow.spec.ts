import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'

test('operating model separates automation, physical confirmation and next eliminations',async()=>{
 const model=await readFile('src/pages/OperatingModel.tsx','utf8')
 for(const phrase of ['Qué debe tocar una persona','Sistema','Persona','Siguiente eliminación','Recepción','Producción','Packing','Inventario'])expect(model).toContain(phrase)
 expect(model).toContain('Un dato heredable o calculable no debe convertirse en una nueva tarea humana')
})

test('packing normal path is scan and weight while manual context stays fallback',async()=>{
 const floor=await readFile('src/pages/FloorStation.tsx','utf8')
 expect(floor).toContain('Escanear lote')
 expect(floor).toContain('Confirmar peso')
 expect(floor).toContain('Confirmar packing')
 expect(floor).toContain('Contexto automático')
 expect(floor).toContain('Corregir contexto manualmente')
 expect(floor).toContain('idempotencyKey')
 expect(floor).toContain('queueFloorPacking')
})

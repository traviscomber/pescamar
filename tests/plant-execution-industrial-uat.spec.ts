import {readFile} from 'node:fs/promises'
import {expect,test} from '@playwright/test'

test('industrial Plant Execution UAT requires one real traceable chain and negative controls',async()=>{
 const uat=await readFile('PLANT_EXECUTION_UAT.md','utf8')
 expect(uat).toContain('Ancud')
 expect(uat).toContain('Quellón')
 expect(uat).toContain('No se crean estaciones, dispositivos, cajas, pallets, ciclos, etiquetas, holds ni resultados ficticios')
 expect(uat).toContain('recepción → calidad → producción → estación → lectura/peso → packing unit → etiqueta física → pallet → frío → hold regulatorio → intento de despacho bloqueado → release → despacho permitido')
 expect(uat).toContain('replay exactamente una vez')
 expect(uat).toContain('estado `printed` o `reprinted` sólo después de confirmación física')
 expect(uat).toContain('Segundo cold run abierto para el mismo activo → rechazado')
 expect(uat).toContain('Sensor de otra estación → rechazado')
 expect(uat).toContain('Despacho bajo hold → bloqueado incluso si se intenta evitar la UI')
 expect(uat).toContain('las siete señales de Plant Execution readiness')
 expect(uat).toContain('nunca sustituye la aceptación humana')
})

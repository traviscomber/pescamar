import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'

const preflightUrl=new URL('../api/canonical-preflight.ts',import.meta.url)
const importsUrl=new URL('../src/pages/Imports.tsx',import.meta.url)

test('canonical preflight is read-only and requires explicit canonical registration',async()=>{
  const source=await readFile(preflightUrl,'utf8')
  expect(source).toContain("mode:'preflight'")
  expect(source).toContain('writesStaging:false')
  expect(source).toContain('writesLive:false')
  expect(source).toContain('requiresCanonicalRegistration:!registeredCanonical')
  expect(source).toContain('where file_hash=${fileHash} and file_name=${fileName} and canonical=true')
  expect(source).not.toContain('insert into ')
  expect(source).not.toContain('delete from ')
  expect(source).not.toContain('update canonical_')
})

test('canonical preflight validates the three current workbook contracts',async()=>{
  const source=await readFile(preflightUrl,'utf8')
  expect(source).toContain("'planilla de produccion 2026.xlsx'")
  expect(source).toContain("'Producción Pescamar 2026'")
  expect(source).toContain("'CUENTA2.xlsx'")
  expect(source).toContain("'CUENTA CORRIENTE'")
  expect(source).toContain("'STOCK FISICO ERIZOS'")
  expect(source).toContain("'STOCK PULPO'")
  expect(source).toContain("'TRANSF RECIBIDAS'")
  expect(source).toContain("'packing pulpo pescamar 2026-2.xlsx'")
  expect(source).toContain("'BLOQUE'")
  expect(source).toContain("'IQF'")
})

test('imports requires preflight pass before canonical staging publication',async()=>{
  const source=await readFile(importsUrl,'utf8')
  expect(source).toContain("fetch('/api/canonical-preflight'")
  expect(source).toContain("!canonicalPreflight?.structureOk||!canonicalPreflight.registeredCanonical")
  expect(source).toContain('La publicación requiere preflight estructural PASS y un hash canónico previamente aprobado.')
  expect(source).toContain('Seleccionar y analizar XLSX')
  expect(source).toContain('Publicar staging canónico')
  expect(source).toContain("canonicalPreflight.registeredCanonical&&canonicalPreflight.structureOk&&canonicalFile")
})

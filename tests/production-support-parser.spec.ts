import {expect,test} from '@playwright/test'
import ExcelJS from 'exceljs'
import {parseProductionSupport} from '../api/_production-support-parser'

test('production support metadata never reads the next chain',()=>{
 const workbook=new ExcelJS.Workbook()
 const sheet=workbook.addWorksheet('Diaz termiando')

 sheet.getCell(5,3).value='Kilos Guia'
 sheet.getCell(5,4).value='Kilos Aceptados'
 sheet.getCell(5,5).value='D (destinado)'
 sheet.getCell(4,3).value=100
 sheet.getCell(6,2).value='A'
 sheet.getCell(6,3).value=10
 sheet.getCell(6,4).value=9
 sheet.getCell(6,5).value=1

 sheet.getCell(5,6).value='Kilos Guia'
 sheet.getCell(5,7).value='Kilos Aceptados'
 sheet.getCell(5,8).value='D (destinado)'
 sheet.getCell(3,6).value='mdq99'
 sheet.getCell(4,6).value=101
 sheet.getCell(6,6).value=20
 sheet.getCell(6,7).value=18
 sheet.getCell(6,8).value=2

 const parsed=parseProductionSupport(workbook)
 const first=parsed.rows.find(row=>row.sourceBlock===3)
 const second=parsed.rows.find(row=>row.sourceBlock===6)

 expect(parsed.parserVersion).toBe('production-support-v2')
 expect(parsed.blocks).toBe(2)
 expect(parsed.rows).toHaveLength(2)
 expect(first?.guideNumber).toBe('100')
 expect(first?.lotReference).toBeNull()
 expect(first?.dataQualityFlags).toContain('missing_lot_reference')
 expect(second?.guideNumber).toBe('101')
 expect(second?.lotReference).toBe('mdq99')
})

test('first Isla Guafo chain keeps its fourth destination column inside the block',()=>{
 const workbook=new ExcelJS.Workbook()
 const sheet=workbook.addWorksheet('Isla Guafo')

 sheet.getCell(6,3).value='Kilos Guia'
 sheet.getCell(6,4).value='Kilos Aceptados'
 sheet.getCell(6,5).value='Total'
 sheet.getCell(6,6).value='D (RGA)'
 sheet.getCell(4,2).value=new Date('2026-04-09T00:00:00Z')
 sheet.getCell(4,3).value='ig02'
 sheet.getCell(5,4).value=3343
 sheet.getCell(7,2).value='GA'
 sheet.getCell(7,3).value=120
 sheet.getCell(7,4).value=105
 sheet.getCell(7,6).value=18

 sheet.getCell(6,7).value='Kilos Guia'
 sheet.getCell(6,8).value='Kilos Aceptados'
 sheet.getCell(6,9).value='D (RGA)'
 sheet.getCell(4,7).value=new Date('2026-04-10T00:00:00Z')
 sheet.getCell(4,8).value='ig05'
 sheet.getCell(5,7).value=3346

 const parsed=parseProductionSupport(workbook)
 const first=parsed.rows.find(row=>row.sourceBlock===3)

 expect(parsed.blocks).toBe(2)
 expect(first?.guideNumber).toBe('3343')
 expect(first?.lotReference).toBe('ig02')
 expect(first?.destinedKg).toBe(18)
})

test('physical chain with no grade observations remains canonical block evidence',()=>{
 const workbook=new ExcelJS.Workbook()
 const sheet=workbook.addWorksheet('Diaz termiando')

 sheet.getCell(5,3).value='Kilos Guia'
 sheet.getCell(5,4).value='Kilos Aceptados'
 sheet.getCell(5,5).value='D (destinado)'
 sheet.getCell(4,3).value=109
 sheet.getCell(4,4).value='mdq185'

 const parsed=parseProductionSupport(workbook)
 const block=parsed.blockRecords[0]

 expect(parsed.blocks).toBe(1)
 expect(parsed.rows).toHaveLength(0)
 expect(block?.guideNumber).toBe('109')
 expect(block?.lotReference).toBe('mdq185')
 expect(block?.observationCount).toBe(0)
 expect(block?.dataQualityFlags).toContain('no_grade_observations')
})

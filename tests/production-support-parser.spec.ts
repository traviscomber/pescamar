import {expect,test} from '@playwright/test'
import ExcelJS from 'exceljs'
import {parseProductionSupport} from '../api/_production-support-parser'

test('production support metadata never reads the next three-column chain',()=>{
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

 expect(parsed.rows).toHaveLength(2)
 expect(first?.guideNumber).toBe('100')
 expect(first?.lotReference).toBeNull()
 expect(first?.dataQualityFlags).toContain('missing_lot_reference')
 expect(second?.guideNumber).toBe('101')
 expect(second?.lotReference).toBe('mdq99')
})

type CellValue=string|number|Date|null
export type WorkbookData={sheetName:string;sheetCount:number;rows:CellValue[][]}

export async function readWorkbook(file:File):Promise<WorkbookData>{
  if(file.size>15*1024*1024)throw new Error('El archivo supera el máximo de 15 MB')
  if(file.name.toLowerCase().endsWith('.csv'))return readCsv(file)
  if(!file.name.toLowerCase().endsWith('.xlsx'))throw new Error('Formato no permitido. Usa XLSX o CSV')
  const {Workbook}=await import('exceljs')
  const workbook=new Workbook()
  await workbook.xlsx.load(await file.arrayBuffer())
  const sheet=workbook.worksheets[0]
  if(!sheet)throw new Error('El archivo no contiene hojas')
  if(sheet.rowCount>10000||sheet.columnCount>200)throw new Error('La planilla excede el límite de 10.000 filas o 200 columnas')
  const rows=Array.from({length:sheet.rowCount},(_,rowIndex)=>Array.from({length:sheet.columnCount},(_,columnIndex)=>cellValue(sheet.getCell(rowIndex+1,columnIndex+1).value)))
  return {sheetName:sheet.name,sheetCount:workbook.worksheets.length,rows}
}

function cellValue(value:unknown):CellValue{
  if(value==null)return null
  if(typeof value==='string'||typeof value==='number'||value instanceof Date)return value
  if(typeof value==='object'){
    const cell=value as {result?:unknown;text?:unknown;richText?:Array<{text?:string}>}
    if(cell.result!=null)return cellValue(cell.result)
    if(cell.text!=null)return String(cell.text)
    if(cell.richText)return cell.richText.map(part=>part.text??'').join('')
  }
  return String(value)
}

async function readCsv(file:File):Promise<WorkbookData>{
  const rows=parseCsv(await file.text())
  if(rows.length>10000||Math.max(0,...rows.map(row=>row.length))>200)throw new Error('La planilla excede el límite de 10.000 filas o 200 columnas')
  return {sheetName:'CSV',sheetCount:1,rows}
}

function parseCsv(text:string):CellValue[][]{
  const rows:string[][]=[];let row:string[]=[],cell='',quoted=false
  for(let index=0;index<text.length;index++){
    const char=text[index],next=text[index+1]
    if(char==='"'&&quoted&&next==='"'){cell+='"';index++;continue}
    if(char==='"'){quoted=!quoted;continue}
    if(char===','&&!quoted){row.push(cell);cell='';continue}
    if((char==='\n'||char==='\r')&&!quoted){if(char==='\r'&&next==='\n')index++;row.push(cell);if(row.some(value=>value!==''))rows.push(row);row=[];cell='';continue}
    cell+=char
  }
  row.push(cell);if(row.some(value=>value!==''))rows.push(row)
  return rows
}

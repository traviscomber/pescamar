import ExcelJS from 'exceljs'
import {createHash} from 'node:crypto'

type SheetProfile={name:string;rows:number;columns:number;hidden:boolean}
type SourceContract={canonicalFileName:string;sourceKind:string;requiredSheets:string[];countRows:(wb:ExcelJS.Workbook)=>Record<string,number>;validate:(wb:ExcelJS.Workbook)=>string[]}

const txt=(value:unknown)=>String(value??'').trim()
const hasValue=(value:unknown)=>value!==null&&value!==undefined&&String(value).trim()!==''
const numberValue=(value:unknown)=>{
  if(value&&typeof value==='object'&&'result' in value)value=(value as {result?:unknown}).result
  if(typeof value==='number'&&Number.isFinite(value))return value
  if(typeof value==='string'&&value.trim()&&Number.isFinite(Number(value)))return Number(value)
  return null
}

function productionRows(wb:ExcelJS.Workbook){
  const ws=wb.getWorksheet('Producción Pescamar 2026')
  if(!ws)return 0
  let rows=0
  for(let r=3;r<=ws.rowCount;r++)if(txt(ws.getCell(r,10).value))rows++
  return rows
}

function accountRows(wb:ExcelJS.Workbook){
  const result={ledger:0,stockErizo:0,stockPulpo:0,transfers:0}
  const ledger=wb.getWorksheet('CUENTA CORRIENTE')
  if(ledger)for(let r=5;r<=ledger.rowCount;r++)if([3,4,5,6].some(c=>hasValue(ledger.getCell(r,c).value)))result.ledger++
  const erizo=wb.getWorksheet('STOCK FISICO ERIZOS')
  if(erizo)for(let r=6;r<=erizo.rowCount;r++)if(Array.from({length:13},(_,i)=>i+1).some(c=>hasValue(erizo.getCell(r,c).value)))result.stockErizo++
  const pulpo=wb.getWorksheet('STOCK PULPO')
  if(pulpo)for(let r=8;r<=pulpo.rowCount;r++)if(Array.from({length:6},(_,i)=>i+1).some(c=>hasValue(pulpo.getCell(r,c).value)))result.stockPulpo++
  const transfers=wb.getWorksheet('TRANSF RECIBIDAS')
  if(transfers)for(let r=7;r<=transfers.rowCount;r++)if([3,4,5,6].some(c=>hasValue(transfers.getCell(r,c).value)))result.transfers++
  return result
}

function packingRows(wb:ExcelJS.Workbook){
  const result={bloque:0,iqf:0,duplicateBoxNumbers:0}
  for(const [sheet,key] of [['BLOQUE','bloque'],['IQF','iqf']] as const){
    const ws=wb.getWorksheet(sheet)
    if(!ws)continue
    const seen=new Set<number>()
    for(let r=6;r<=ws.rowCount;r++){
      const box=numberValue(ws.getCell(r,3).value)
      if(box===null||!Number.isInteger(box))continue
      result[key]++
      if(seen.has(box))result.duplicateBoxNumbers++
      seen.add(box)
    }
  }
  return result
}

const contracts:SourceContract[]=[
  {canonicalFileName:'planilla de produccion 2026.xlsx',sourceKind:'production_2026',requiredSheets:['Producción Pescamar 2026'],countRows:wb=>({production:productionRows(wb)}),validate:wb=>productionRows(wb)>0?[]:['La hoja de producción no contiene filas con lote en la columna esperada.']},
  {canonicalFileName:'CUENTA2.xlsx',sourceKind:'finance_stock',requiredSheets:['CUENTA CORRIENTE','STOCK FISICO ERIZOS','STOCK PULPO','TRANSF RECIBIDAS'],countRows:accountRows,validate:wb=>Object.values(accountRows(wb)).some(value=>value>0)?[]:['Las hojas financieras/stock no contienen filas reconocibles.']},
  {canonicalFileName:'packing pulpo pescamar 2026-2.xlsx',sourceKind:'packing_octopus_2026',requiredSheets:['BLOQUE','IQF'],countRows:packingRows,validate:wb=>{const counts=packingRows(wb),issues:string[]=[];if(counts.bloque+counts.iqf===0)issues.push('No se encontraron cajas con número entero en BLOQUE o IQF.');if(counts.duplicateBoxNumbers>0)issues.push(`Se detectaron ${counts.duplicateBoxNumbers} números de caja repetidos dentro de una misma hoja.`);return issues}},
]

function detectContract(fileName:string,wb:ExcelJS.Workbook){
  const byName=contracts.find(contract=>contract.canonicalFileName===fileName)
  if(byName)return {contract:byName,detectedBy:'filename' as const}
  const sheetNames=new Set(wb.worksheets.map(sheet=>sheet.name))
  const structural=contracts.filter(contract=>contract.requiredSheets.every(name=>sheetNames.has(name)))
  return structural.length===1?{contract:structural[0],detectedBy:'structure' as const}:{contract:null,detectedBy:'unrecognized' as const}
}

export async function analyzeCanonicalWorkbook(fileName:string,buf:Buffer){
  const fileHash=createHash('sha256').update(buf).digest('hex')
  const wb=new ExcelJS.Workbook()
  await wb.xlsx.load(buf)
  const sheets:SheetProfile[]=wb.worksheets.map(sheet=>({name:sheet.name,rows:sheet.rowCount,columns:sheet.columnCount,hidden:sheet.state!=='visible'}))
  const {contract,detectedBy}=detectContract(fileName,wb)
  const missingSheets=contract?contract.requiredSheets.filter(name=>!wb.getWorksheet(name)):[]
  const issues=contract?[...missingSheets.map(name=>`Falta la hoja requerida: ${name}.`),...contract.validate(wb)]:['La estructura no coincide de forma inequívoca con una fuente canónica soportada. Requiere Canonical Intake antes de registrar o publicar.']
  const counts=contract?contract.countRows(wb):{}
  return{fileName,fileHash,fileSize:buf.length,sourceKindCandidate:contract?.sourceKind??null,canonicalFileNameCandidate:contract?.canonicalFileName??null,detectedBy,structureOk:Boolean(contract)&&issues.length===0,requiredSheets:contract?.requiredSheets??[],sheets,counts,issues}
}

export type CanonicalWorkbookAnalysis=Awaited<ReturnType<typeof analyzeCanonicalWorkbook>>

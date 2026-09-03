import ExcelJS from 'exceljs'
import {createHash} from 'node:crypto'
import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;body?:unknown;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type Payload={fileName?:unknown;base64?:unknown}
type SheetProfile={name:string;rows:number;columns:number}

type SourceContract={
  sourceKind:string
  requiredSheets:string[]
  countRows:(wb:ExcelJS.Workbook)=>Record<string,number>
  validate:(wb:ExcelJS.Workbook)=>string[]
}

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

const contracts:Record<string,SourceContract>={
  'planilla de produccion 2026.xlsx':{
    sourceKind:'production_2026',
    requiredSheets:['Producción Pescamar 2026'],
    countRows:wb=>({production:productionRows(wb)}),
    validate:wb=>productionRows(wb)>0?[]:['La hoja de producción no contiene filas con lote en la columna esperada.'],
  },
  'CUENTA2.xlsx':{
    sourceKind:'account_2026',
    requiredSheets:['CUENTA CORRIENTE','STOCK FISICO ERIZOS','STOCK PULPO','TRANSF RECIBIDAS'],
    countRows:accountRows,
    validate:wb=>{
      const counts=accountRows(wb)
      return Object.values(counts).some(value=>value>0)?[]:['Las hojas financieras/stock no contienen filas reconocibles.']
    },
  },
  'packing pulpo pescamar 2026-2.xlsx':{
    sourceKind:'packing_octopus_2026',
    requiredSheets:['BLOQUE','IQF'],
    countRows:packingRows,
    validate:wb=>{
      const counts=packingRows(wb),issues:string[]=[]
      if(counts.bloque+counts.iqf===0)issues.push('No se encontraron cajas con número entero en BLOQUE o IQF.')
      if(counts.duplicateBoxNumbers>0)issues.push(`Se detectaron ${counts.duplicateBoxNumbers} números de caja repetidos dentro de una misma hoja.`)
      return issues
    },
  },
}

export default async function handler(req:Request,res:Response){
  res.setHeader('Cache-Control','no-store, max-age=0')
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false,error:'Método no permitido'})}
  try{
    const operator=await requireOperator(req,['admin','operations'])
    if(!operator)return res.status(403).json({ok:false,error:'Permisos insuficientes'})
    const body=(req.body??{}) as Payload,fileName=txt(body.fileName),base64=txt(body.base64)
    if(!fileName||!base64)return res.status(400).json({ok:false,error:'Archivo requerido'})
    const contract=contracts[fileName]
    if(!contract)return res.status(400).json({ok:false,error:'Nombre de fuente no reconocido para preflight canónico'})
    const buf=Buffer.from(base64.replace(/^data:.*?;base64,/,''),'base64')
    if(!buf.length||buf.length>15*1024*1024)return res.status(413).json({ok:false,error:'Archivo inválido o demasiado grande'})

    const fileHash=createHash('sha256').update(buf).digest('hex')
    const wb=new ExcelJS.Workbook()
    await wb.xlsx.load(buf)
    const sheetProfiles:SheetProfile[]=wb.worksheets.map(sheet=>({name:sheet.name,rows:sheet.rowCount,columns:sheet.columnCount}))
    const missingSheets=contract.requiredSheets.filter(name=>!wb.getWorksheet(name))
    const issues=[...missingSheets.map(name=>`Falta la hoja requerida: ${name}.`),...contract.validate(wb)]
    const counts=contract.countRows(wb)

    const sql=getSql()
    const exactRows=await sql`select file_hash from canonical_source_files where file_hash=${fileHash} and file_name=${fileName} and canonical=true limit 1`
    const nameRows=await sql`select file_hash from canonical_source_files where file_name=${fileName} and canonical=true limit 1`
    const registeredCanonical=Array.isArray(exactRows)&&exactRows.length>0
    const knownCanonicalName=Array.isArray(nameRows)&&nameRows.length>0

    return res.status(200).json({
      ok:true,
      mode:'preflight',
      fileName,
      fileHash,
      fileSize:buf.length,
      sourceKindCandidate:contract.sourceKind,
      registeredCanonical,
      knownCanonicalName,
      structureOk:issues.length===0,
      requiredSheets:contract.requiredSheets,
      sheets:sheetProfiles,
      counts,
      issues,
      governance:{
        writesStaging:false,
        writesLive:false,
        requiresCanonicalRegistration:!registeredCanonical,
        rule:registeredCanonical
          ?'El archivo coincide por nombre y SHA-256 con una fuente canónica aprobada. El preflight no escribió datos.'
          :'El preflight sólo valida estructura. Un hash nuevo debe auditarse y registrarse explícitamente antes de publicar staging.',
      },
    })
  }catch(error){
    console.error('canonical_preflight_failed',error instanceof Error?error.message:'unknown')
    return res.status(400).json({ok:false,error:'No fue posible analizar el XLSX sin publicar datos'})
  }
}

import type ExcelJS from 'exceljs'

type SupportFamily='IG'|'MDQ'|'MI'
export type ProductionSupportRow={sheetName:string;sourceBlock:number;sourceRow:number;familyKey:SupportFamily;eventDate:string|null;supplierName:string;processSite:string;guideNumber:string|null;lotReference:string|null;gradeCode:string;guideKg:number|null;acceptedKg:number|null;destinedKg:number|null;notes:string|null;dataQualityFlags:string[];rawRecord:Record<string,unknown>}
export type ProductionSupportBlock={sheetName:string;sourceBlock:number;familyKey:SupportFamily;eventDate:string|null;supplierName:string;processSite:string;guideNumber:string|null;lotReference:string|null;notes:string|null;observationCount:number;dataQualityFlags:string[];rawRecord:Record<string,unknown>}
type SheetConfig={sheetName:string;familyKey:SupportFamily;headerRow:number;gradeLabelCol:number;gradeStart:number;gradeEnd:number;metadataRows:number[];guideRow:number;supplierName:string;processSite:string;prefix:'ig'|'mdq'|'mi';noteRows:number[]}
const CONFIGS:SheetConfig[]=[
 {sheetName:'Isla Guafo',familyKey:'IG',headerRow:6,gradeLabelCol:2,gradeStart:7,gradeEnd:11,metadataRows:[4,5],guideRow:5,supplierName:'Eugenio Mardones',processSite:'Curanue',prefix:'ig',noteRows:[12,13]},
 {sheetName:'Diaz termiando',familyKey:'MDQ',headerRow:5,gradeLabelCol:2,gradeStart:6,gradeEnd:10,metadataRows:[3,4],guideRow:4,supplierName:'Patricio Diaz',processSite:'Santa Rosa',prefix:'mdq',noteRows:[11,12]},
 {sheetName:'Cesar',familyKey:'MI',headerRow:6,gradeLabelCol:1,gradeStart:7,gradeEnd:12,metadataRows:[3,4,5],guideRow:5,supplierName:'Cesar Gonzalez',processSite:'candelaria',prefix:'mi',noteRows:[]}
]
const parserVersion='production-support-v2'
const normalize=(value:unknown)=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()
const header=(value:unknown)=>normalize(value).replace(/[^a-z]/g,'')
const formulaResult=(value:unknown)=>value&&typeof value==='object'&&'result' in value?(value as {result?:unknown}).result:value
const numberValue=(value:unknown)=>{const raw=formulaResult(value);if(typeof raw==='number'&&Number.isFinite(raw))return raw;if(typeof raw==='string'&&raw.trim()&&Number.isFinite(Number(raw)))return Number(raw);return null}
const textValue=(value:unknown)=>{const raw=formulaResult(value);return raw==null?'':String(raw).trim()}
const dateValue=(value:unknown)=>{const raw=formulaResult(value);return raw instanceof Date&&!Number.isNaN(raw.getTime())?raw.toISOString().slice(0,10):null}
const rawValue=(value:unknown)=>{if(value instanceof Date)return value.toISOString();if(value&&typeof value==='object'&&'formula' in value)return `=${String((value as {formula?:unknown}).formula??'')}`;if(value&&typeof value==='object'&&'text' in value)return String((value as {text?:unknown}).text??'');return value??null}
function lotToken(value:unknown,prefix:SheetConfig['prefix']){const token=normalize(value).replace(/[^a-z0-9]/g,'');if(new RegExp(`^${prefix}\\d+$`).test(token))return token;const reverse=token.match(new RegExp(`^(\\d+)${prefix}$`));return reverse?`${prefix}${reverse[1]}`:null}
function rawCells(ws:ExcelJS.Worksheet,rows:number[],columns:number[]){const out:Record<string,unknown>={},uniqueRows=[...new Set(rows)],uniqueColumns=[...new Set(columns)];for(const row of uniqueRows)for(const column of uniqueColumns){const cell=ws.getCell(row,column);if(cell.value!==null&&cell.value!==undefined)out[cell.address]=rawValue(cell.value)}return out}
function blockStarts(ws:ExcelJS.Worksheet,config:SheetConfig){const starts:number[]=[];for(let column=1;column<=ws.columnCount;column++)if(header(ws.getCell(config.headerRow,column).value)==='kilosguia')starts.push(column);return starts}
function findColumns(ws:ExcelJS.Worksheet,config:SheetConfig,start:number,end:number){let accepted:number|null=null,destined:number|null=null;for(let column=start+1;column<=end;column++){const value=header(ws.getCell(config.headerRow,column).value);if(accepted==null&&value.includes('acept'))accepted=column;if(destined==null&&(value.includes('destin')||value.includes('rga')||value==='d'))destined=column}return {accepted,destined}}
function metadata(ws:ExcelJS.Worksheet,config:SheetConfig,start:number,end:number){
 const columns=[] as number[]
 // Source blocks are delimited by the next "Kilos Guia" header. This handles the
 // four-column first Isla Guafo block and prevents metadata bleed into neighbours.
 for(let column=Math.max(1,start-1);column<=Math.min(ws.columnCount,end);column++)columns.push(column)
 let eventDate:string|null=null,lotReference:string|null=null
 for(const row of config.metadataRows)for(const column of columns){const cell=ws.getCell(row,column).value;if(eventDate==null)eventDate=dateValue(cell);const candidate=lotToken(cell,config.prefix);if(candidate)lotReference=candidate}
 const guideCandidates=columns.map(column=>({column,value:numberValue(ws.getCell(config.guideRow,column).value)})).filter(item=>item.value!=null&&Number.isInteger(item.value as number)).sort((a,b)=>Math.abs(a.column-start)-Math.abs(b.column-start)||a.column-b.column)
 const guideNumber=guideCandidates.length?String(Math.trunc(guideCandidates[0].value as number)):null
 const notes:string[]=[]
 for(const row of config.noteRows)for(const column of columns){const value=ws.getCell(row,column).value;if(value&&typeof formulaResult(value)==='string'){const text=textValue(value);if(text&&!header(text).includes('sum'))notes.push(text)}}
 return {eventDate,lotReference,guideNumber,notes:notes.length?[...new Set(notes)].join(' · '):null,columns}
}
export function parseProductionSupport(workbook:ExcelJS.Workbook){
 const rows:ProductionSupportRow[]=[],blockRecords:ProductionSupportBlock[]=[]
 for(const config of CONFIGS){
  const ws=workbook.getWorksheet(config.sheetName);if(!ws)continue
  const starts=blockStarts(ws,config)
  for(let index=0;index<starts.length;index++){
   const start=starts[index],end=index+1<starts.length?starts[index+1]-1:ws.columnCount,{accepted,destined}=findColumns(ws,config,start,end),meta=metadata(ws,config,start,end),baseFlags:string[]=[]
   if(!meta.guideNumber)baseFlags.push('missing_guide_number')
   if(!meta.lotReference)baseFlags.push('missing_lot_reference')
   if(accepted==null)baseFlags.push('missing_accepted_column')
   if(destined==null)baseFlags.push('missing_destination_column')
   const blockRows:ProductionSupportRow[]=[]
   for(let sourceRow=config.gradeStart;sourceRow<=config.gradeEnd;sourceRow++){
    const gradeCode=textValue(ws.getCell(sourceRow,config.gradeLabelCol).value);if(!gradeCode)continue
    const guideKg=numberValue(ws.getCell(sourceRow,start).value),acceptedKg=accepted==null?null:numberValue(ws.getCell(sourceRow,accepted).value),destinedKg=destined==null?null:numberValue(ws.getCell(sourceRow,destined).value)
    if((guideKg??0)===0&&(acceptedKg??0)===0&&(destinedKg??0)===0)continue
    const rowFlags=[...baseFlags];if(guideKg==null&&acceptedKg!=null)rowFlags.push('accepted_without_grade_guide')
    blockRows.push({sheetName:config.sheetName,sourceBlock:start,sourceRow,familyKey:config.familyKey,eventDate:meta.eventDate,supplierName:config.supplierName,processSite:config.processSite,guideNumber:meta.guideNumber,lotReference:meta.lotReference,gradeCode,guideKg,acceptedKg,destinedKg,notes:meta.notes,dataQualityFlags:rowFlags,rawRecord:rawCells(ws,[...config.metadataRows,config.headerRow,sourceRow,...config.noteRows],[config.gradeLabelCol,...meta.columns,...(accepted==null?[]:[accepted]),...(destined==null?[]:[destined])])})
   }
   rows.push(...blockRows)
   const blockFlags=[...baseFlags];if(!blockRows.length)blockFlags.push('no_grade_observations')
   blockRecords.push({sheetName:config.sheetName,sourceBlock:start,familyKey:config.familyKey,eventDate:meta.eventDate,supplierName:config.supplierName,processSite:config.processSite,guideNumber:meta.guideNumber,lotReference:meta.lotReference,notes:meta.notes,observationCount:blockRows.length,dataQualityFlags:blockFlags,rawRecord:rawCells(ws,[...config.metadataRows,config.headerRow,...config.noteRows],[config.gradeLabelCol,...meta.columns,...(accepted==null?[]:[accepted]),...(destined==null?[]:[destined])])})
  }
 }
 return {parserVersion,rows,blockRecords,blocks:blockRecords.length,bySheet:Object.fromEntries(CONFIGS.map(config=>[config.sheetName,rows.filter(row=>row.sheetName===config.sheetName).length])),blocksBySheet:Object.fromEntries(CONFIGS.map(config=>[config.sheetName,blockRecords.filter(block=>block.sheetName===config.sheetName).length]))}
}
export const PRODUCTION_SUPPORT_PARSER_VERSION=parserVersion

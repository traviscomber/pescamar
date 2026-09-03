export type LotEvidenceInput={lot_code:string|null;reception_date:string|null;process_date:string|null;production_date:string|null;data_quality_flags:string[]|null}
export type ReviewTriageInput=LotEvidenceInput&{context_rows?:number|string|null}
export type ReviewFocus='process_date_review'|'reception_date_review'|'production_date_review'|'source_completion'|'formula_review'|'context_review'|'chronology_review'|'manual_review'
export type LotField='reception'|'process'|'production'

const dateKey=(value:string|null|undefined)=>String(value??'').slice(0,10)

function parseDigits(digits:string,yearDigits:2|4){
  const day=Number(digits.slice(0,2)),month=Number(digits.slice(2,4))
  const year=yearDigits===4?Number(digits.slice(4,8)):2000+Number(digits.slice(4,6))
  if(!Number.isInteger(day)||!Number.isInteger(month)||!Number.isInteger(year)||day<1||day>31||month<1||month>12||year<2000||year>2099)return null
  const date=new Date(Date.UTC(year,month-1,day))
  if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return null
  return date.toISOString().slice(0,10)
}

export function parseLotDate(value:string|null|undefined){
  const text=String(value??'').trim()
  const eight=text.match(/(\d{8})$/)?.[1]
  if(eight){const parsed=parseDigits(eight,4);if(parsed)return parsed}
  const six=text.match(/(\d{6})$/)?.[1]
  return six?parseDigits(six,2):null
}

export function buildLotEvidence(rows:LotEvidenceInput[]){
  let parseableRows=0,processMatches=0,productionMatches=0,receptionMatches=0,flaggedWithLotDate=0,flaggedProcessConflicts=0
  for(const row of rows){
    const lotDate=parseLotDate(row.lot_code)
    if(!lotDate)continue
    parseableRows+=1
    if(lotDate===dateKey(row.process_date))processMatches+=1
    if(lotDate===dateKey(row.production_date))productionMatches+=1
    if(lotDate===dateKey(row.reception_date))receptionMatches+=1
    if((row.data_quality_flags??[]).length){
      flaggedWithLotDate+=1
      if(row.process_date&&lotDate!==dateKey(row.process_date))flaggedProcessConflicts+=1
    }
  }
  return {parseableRows,processMatches,productionMatches,receptionMatches,processMatchRate:parseableRows?processMatches/parseableRows:0,flaggedWithLotDate,flaggedProcessConflicts}
}

export function triageReviewRow(row:ReviewTriageInput){
  const flags=new Set(row.data_quality_flags??[])
  const lotDate=parseLotDate(row.lot_code)
  const lotDateMatches:LotField[]=[]
  if(lotDate&&lotDate===dateKey(row.reception_date))lotDateMatches.push('reception')
  if(lotDate&&lotDate===dateKey(row.process_date))lotDateMatches.push('process')
  if(lotDate&&lotDate===dateKey(row.production_date))lotDateMatches.push('production')
  const hasMissing=flags.has('missing_process_date')||flags.has('missing_reception_date')||flags.has('missing_production_date')||flags.has('missing_received_kg')
  const hasChronology=flags.has('production_before_process')||flags.has('date_sequence_inconsistent')||flags.has('process_before_reception')||flags.has('production_before_reception')
  let focus:ReviewFocus='manual_review'
  if(hasMissing)focus='source_completion'
  else if(flags.has('yield_formula_error'))focus='formula_review'
  else if(hasChronology){
    const processMatch=lotDateMatches.includes('process')
    if(lotDate&&!processMatch&&(lotDateMatches.includes('production')||lotDateMatches.includes('reception')))focus='process_date_review'
    else if(lotDate&&processMatch&&(flags.has('process_before_reception')||flags.has('production_before_reception')||dateKey(row.reception_date)>lotDate))focus='reception_date_review'
    else if(processMatch&&flags.has('production_before_process'))focus='production_date_review'
    else focus='chronology_review'
  }else if(Number(row.context_rows??1)>1)focus='context_review'
  return {focus,lotDate,lotDateMatches,referenceOnly:true}
}

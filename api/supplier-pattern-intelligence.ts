import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
const t=(v:unknown)=>String(v??'').trim()
const n=(v:unknown)=>{const x=Number(v);return Number.isFinite(x)?x:0}
const norm=(v:unknown)=>t(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')
const round1=(v:number)=>Number(v.toFixed(1))
const exact=(a:number,b:number)=>Math.abs(a-b)<=0.1
const pct=(a:number,b:number)=>b?Number((a/b*100).toFixed(1)):null

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
 try{
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  if(!(operator.role==='admin'||operator.plantIds.length>=6))return res.status(403).json({ok:false,error:'Acceso corporativo requerido'})
  const sql=getSql()
  const [blockRaw,rowRaw,mainRaw]=await Promise.all([
   sql`select source_block,guide_number,lot_reference,raw_record
       from canonical_production_support_blocks
       where parser_version='production-support-v2' and sheet_name='Diaz termiando'
         and source_file_hash in(select file_hash from canonical_source_files where canonical and file_name='planilla de produccion 2026.xlsx')
       order by source_block`,
   sql`select source_block,accepted_kg,destined_kg,guide_kg
       from canonical_production_support_rows
       where parser_version='production-support-v2' and sheet_name='Diaz termiando'
         and source_file_hash in(select file_hash from canonical_source_files where canonical and file_name='planilla de produccion 2026.xlsx')`,
   sql`select source_row,guide_number,lot_code,grade_breakdown
       from historical_production_records
       where record_status='operational'
         and lower(coalesce(nullif(btrim(supplier_name),''),nullif(btrim(supplier_original),''),'')) like '%patricio%diaz%'
         and source_file_hash in(select file_hash from canonical_source_files where canonical and file_name='planilla de produccion 2026.xlsx')`
  ])
  const blocks=(Array.isArray(blockRaw)?blockRaw:[]) as any[]
  const rows=(Array.isArray(rowRaw)?rowRaw:[]) as any[]
  const main=(Array.isArray(mainRaw)?mainRaw:[]) as any[]
  const byBlock=new Map<number,any[]>()
  for(const row of rows){const key=n(row.source_block),bucket=byBlock.get(key);if(bucket)bucket.push(row);else byBlock.set(key,[row])}
  const linked=blocks.map(block=>{
   const guide=t(block.guide_number),lotRef=norm(block.lot_reference)
   const candidates=main.filter(record=>t(record.guide_number)===guide||(lotRef&&norm(record.lot_code).startsWith(lotRef)))
   const selected=candidates.length===1?candidates[0]:candidates.find(record=>t(record.guide_number)===guide&&lotRef&&norm(record.lot_code).startsWith(lotRef))
   const support=byBlock.get(n(block.source_block))??[]
   const acceptedKg=round1(support.reduce((sum,row)=>sum+n(row.accepted_kg),0))
   const destinedKg=round1(support.reduce((sum,row)=>sum+n(row.destined_kg),0))
   const guideKg=round1(support.reduce((sum,row)=>sum+n(row.guide_kg),0))
   const grades=(selected?.grade_breakdown&&typeof selected.grade_breakdown==='object'?selected.grade_breakdown:{}) as Record<string,{kg?:unknown}>
   const gradeKg=(key:string)=>round1(n(grades[key]?.kg))
   const raw=block.raw_record&&typeof block.raw_record==='object'?block.raw_record:{}
   const aux=Array.isArray(raw.auxiliaryEvidence)?raw.auxiliaryEvidence:[]
   const numericAux=aux.filter((item:any)=>item?.kind==='number'&&Number.isFinite(Number(item?.value))).map((item:any)=>({cell:t(item.cell),value:n(item.value)}))
   const auxMatches=numericAux.map(item=>({cell:item.cell,value:item.value,matches:['A1','C1','R','PT','D','Vj100'].filter(key=>exact(item.value,gradeKg(key))&&item.value!==0)}))
   return {sourceBlock:n(block.source_block),guide:guide||null,lotReference:t(block.lot_reference)||null,selectedMainSourceRow:selected?n(selected.source_row):null,guideKg,acceptedKg,destinedKg,internalBalanceDeltaKg:round1(guideKg-acceptedKg-destinedKg),grades:{A1:gradeKg('A1'),C1:gradeKg('C1'),R:gradeKg('R'),PT:gradeKg('PT'),D:gradeKg('D'),Vj100:gradeKg('Vj100')},numericAux:auxMatches}
  }).filter(item=>item.selectedMainSourceRow!=null)

  const ordered=[...linked].sort((a,b)=>a.sourceBlock-b.sourceBlock)
  const candidates=[] as {afterBlock:number;beforeN:number;afterN:number;beforeRate:number;afterRate:number;lift:number}[]
  for(let i=5;i<=ordered.length-5;i++){
   const before=ordered.slice(0,i),after=ordered.slice(i)
   const beforeMatches=before.filter(x=>exact(x.acceptedKg,x.grades.A1)).length
   const afterMatches=after.filter(x=>exact(x.acceptedKg,x.grades.A1)).length
   const beforeRate=beforeMatches/before.length,afterRate=afterMatches/after.length
   candidates.push({afterBlock:ordered[i].sourceBlock,beforeN:before.length,afterN:after.length,beforeRate,afterRate,lift:afterRate-beforeRate})
  }
  const best=candidates.sort((a,b)=>b.lift-a.lift)[0]
  const regimeDetected=!!best&&best.afterRate>=0.75&&best.lift>=0.6

  const auxFlat=ordered.flatMap(item=>item.numericAux)
  const auxByGrade=['D','PT','R','A1','C1','Vj100'].map(grade=>({grade,n:auxFlat.filter(item=>item.matches.includes(grade)).length,pct:pct(auxFlat.filter(item=>item.matches.includes(grade)).length,auxFlat.length)}))
  const internalExact=ordered.filter(item=>exact(item.internalBalanceDeltaKg,0)).length
  const acceptedA1=ordered.filter(item=>exact(item.acceptedKg,item.grades.A1)).length
  const patterns=[] as any[]
  if(regimeDetected)patterns.push({id:'supplier-semantic-regime-shift',state:'derived',confidence:'needs-human-validation',evidence:{splitAtSourceBlock:best.afterBlock,beforeBlocks:best.beforeN,afterBlocks:best.afterN,beforeAcceptedEqualsA1Pct:Number((best.beforeRate*100).toFixed(1)),afterAcceptedEqualsA1Pct:Number((best.afterRate*100).toFixed(1)),liftPctPoints:Number((best.lift*100).toFixed(1))},interpretation:'La relación entre Kilos Aceptados del soporte y A1 de la hoja principal cambia de forma abrupta a partir de un punto del registro. Es evidencia de cambio de criterio de registro o semántica, no prueba de cambio operacional.',action:'Tratar los bloques anterior/posterior como regímenes separados hasta confirmar con Pescamar qué cambió en la forma de registrar.'})
  if(auxFlat.length)patterns.push({id:'auxiliary-grade-correspondence',state:'derived',confidence:'needs-human-validation',evidence:{numericAuxCells:auxFlat.length,matchesByGrade:auxByGrade},interpretation:'Los valores auxiliares de filas 11/12 coinciden repetidamente con kilos de categorías de la hoja principal, especialmente D. Esto sugiere que parte de esas celdas son evidencia de reconciliación por categoría y no un KPI independiente.',action:'Usar coincidencias sólo como corroboración histórica; no promoverlas a merma, deuda, yield ni inventario.'})
  patterns.push({id:'support-internal-mass-balance',state:'derived',confidence:'derived',evidence:{linkedBlocks:ordered.length,exactInternalBalances:internalExact,exactInternalBalancePct:pct(internalExact,ordered.length)},interpretation:'Una fracción de los bloques satisface Kilos Guia = Kilos Aceptados + D dentro de la propia hoja auxiliar.',action:'Usar este balance como control de integridad del soporte, no como continuidad de masa de producción.'})

  return res.status(200).json({ok:true,status:'ready',scope:'Patricio Diaz / Diaz termiando',maturity:'pilot-evidence',historicalOnly:true,writesLive:false,predictive:false,summary:{linkedBlocks:ordered.length,acceptedEqualsA1Blocks:acceptedA1,acceptedEqualsA1Pct:pct(acceptedA1,ordered.length),numericAuxCells:auxFlat.length,patternsDetected:patterns.length},patterns,guardrail:'Los patrones describen regularidades de registro observadas. No cambian datos canónicos, no imputan valores faltantes y no habilitan ranking/yield hasta validación humana.',sample:ordered.slice(-12)})
 }catch(error){const message=error instanceof Error?error.message:'';return res.status(message.includes('DATABASE_URL')?503:500).json({ok:false,error:message.includes('DATABASE_URL')?'Base de datos no conectada':'No fue posible construir inteligencia de patrones'})}
}

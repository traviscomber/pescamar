import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type PatternState='observed'|'derived'|'needs-human-validation'
const t=(v:unknown)=>String(v??'').trim()
const n=(v:unknown)=>{const x=Number(v);return Number.isFinite(x)?x:0}
const norm=(v:unknown)=>t(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')
const round1=(v:number)=>Number(v.toFixed(1))
const exact=(a:number,b:number)=>Math.abs(a-b)<=0.1
const pct=(a:number,b:number)=>b?Number((a/b*100).toFixed(1)):null
const acceptedMap:Record<string,string>={GA:'A1',C:'C1',P:'PT',R:'R',V:'Vj100'}
const family=(site:string,lot:string)=>{const s=site.toLowerCase(),l=lot.toLowerCase();if(l.startsWith('ig')||s==='curanue')return'IG';if(l.startsWith('mdq')||s==='santa rosa')return'MDQ';if(l.startsWith('mi')||s==='candelaria')return'MI';return'RF'}

function detectRegime(items:any[],metric:(item:any)=>boolean){
 const ordered=[...items].sort((a,b)=>a.sourceBlock-b.sourceBlock)
 if(ordered.length<10)return null
 const candidates=[] as any[]
 for(let i=5;i<=ordered.length-5;i++){
  const before=ordered.slice(0,i),after=ordered.slice(i)
  const beforeRate=before.filter(metric).length/before.length,afterRate=after.filter(metric).length/after.length
  candidates.push({afterBlock:ordered[i].sourceBlock,beforeN:before.length,afterN:after.length,beforeRate,afterRate,lift:afterRate-beforeRate})
 }
 const best=candidates.sort((a,b)=>Math.abs(b.lift)-Math.abs(a.lift))[0]
 if(!best||Math.abs(best.lift)<0.6||Math.max(best.beforeRate,best.afterRate)<0.75)return null
 return {splitAtSourceBlock:best.afterBlock,beforeBlocks:best.beforeN,afterBlocks:best.afterN,beforePct:Number((best.beforeRate*100).toFixed(1)),afterPct:Number((best.afterRate*100).toFixed(1)),liftPctPoints:Number((best.lift*100).toFixed(1))}
}

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
 try{
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  if(!(operator.role==='admin'||operator.plantIds.length>=6))return res.status(403).json({ok:false,error:'Acceso corporativo requerido'})
  const sql=getSql()
  const [blockRaw,rowRaw,mainRaw]=await Promise.all([
   sql`select sheet_name,source_block,family_key,supplier_name,guide_number,lot_reference,raw_record
       from canonical_production_support_blocks
       where parser_version='production-support-v2'
         and source_file_hash in(select file_hash from canonical_source_files where canonical and file_name='planilla de produccion 2026.xlsx')
       order by supplier_name,source_block`,
   sql`select sheet_name,source_block,grade_code,accepted_kg,destined_kg,guide_kg
       from canonical_production_support_rows
       where parser_version='production-support-v2'
         and source_file_hash in(select file_hash from canonical_source_files where canonical and file_name='planilla de produccion 2026.xlsx')`,
   sql`select source_row,coalesce(nullif(btrim(supplier_name),''),nullif(btrim(supplier_original),''),'Sin proveedor') supplier,
       coalesce(nullif(btrim(process_site_original),''),nullif(btrim(plant_id),''),'Sin planta') process_site,
       guide_number,lot_code,grade_breakdown
       from historical_production_records
       where record_status='operational'
         and source_file_hash in(select file_hash from canonical_source_files where canonical and file_name='planilla de produccion 2026.xlsx')`
  ])
  const blocks=(Array.isArray(blockRaw)?blockRaw:[]) as any[]
  const rows=(Array.isArray(rowRaw)?rowRaw:[]) as any[]
  const main=(Array.isArray(mainRaw)?mainRaw:[]) as any[]
  const byBlock=new Map<string,any[]>()
  for(const row of rows){const key=`${t(row.sheet_name)}:${n(row.source_block)}`,bucket=byBlock.get(key);if(bucket)bucket.push(row);else byBlock.set(key,[row])}

  const evidence=blocks.map(block=>{
   const supplier=t(block.supplier_name),familyKey=t(block.family_key),guide=t(block.guide_number),lotRef=norm(block.lot_reference)
   const pool=main.filter(record=>norm(record.supplier)===norm(supplier)&&family(t(record.process_site),t(record.lot_code))===familyKey)
   const candidates=pool.filter(record=>t(record.guide_number)===guide||(lotRef&&norm(record.lot_code).startsWith(lotRef)))
   const selected=candidates.length===1?candidates[0]:candidates.find(record=>t(record.guide_number)===guide&&lotRef&&norm(record.lot_code).startsWith(lotRef))
   const support=byBlock.get(`${t(block.sheet_name)}:${n(block.source_block)}`)??[]
   const acceptedKg=round1(support.reduce((sum,row)=>sum+n(row.accepted_kg),0)),destinedKg=round1(support.reduce((sum,row)=>sum+n(row.destined_kg),0)),guideKg=round1(support.reduce((sum,row)=>sum+n(row.guide_kg),0))
   const grades=(selected?.grade_breakdown&&typeof selected.grade_breakdown==='object'?selected.grade_breakdown:{}) as Record<string,{kg?:unknown}>
   const gradeKg=(key:string)=>round1(n(grades[key]?.kg))
   const unknownGrades=[...new Set(support.map(row=>t(row.grade_code)).filter(code=>code&&!acceptedMap[code]))]
   const mappedAccepted=selected&&unknownGrades.length===0?round1(support.reduce((sum,row)=>sum+gradeKg(acceptedMap[t(row.grade_code)]),0)):null
   const raw=block.raw_record&&typeof block.raw_record==='object'?block.raw_record:{}
   const aux=Array.isArray(raw.auxiliaryEvidence)?raw.auxiliaryEvidence:[]
   const numericAux=aux.filter((item:any)=>item?.kind==='number'&&Number.isFinite(Number(item?.value))).map((item:any)=>({cell:t(item.cell),value:n(item.value),matches:['A1','C1','R','PT','D','Vj100'].filter(key=>exact(n(item.value),gradeKg(key))&&n(item.value)!==0)}))
   return {supplier,sheetName:t(block.sheet_name),sourceBlock:n(block.source_block),guide:guide||null,lotReference:t(block.lot_reference)||null,linked:!!selected,selectedMainSourceRow:selected?n(selected.source_row):null,guideKg,acceptedKg,destinedKg,mappedAcceptedKg:mappedAccepted,mainDestinationKg:selected?gradeKg('D'):null,internalBalanceDeltaKg:round1(guideKg-acceptedKg-destinedKg),numericAux,unknownGrades}
  })

  const supplierGroups=[...new Set(evidence.map(x=>x.supplier))].map(supplier=>{
   const items=evidence.filter(x=>x.supplier===supplier),linked=items.filter(x=>x.linked)
   const acceptedExact=linked.filter(x=>x.mappedAcceptedKg!=null&&exact(x.acceptedKg,x.mappedAcceptedKg)).length
   const destinationExact=linked.filter(x=>x.mainDestinationKg!=null&&exact(x.destinedKg,x.mainDestinationKg)).length
   const internalExact=items.filter(x=>exact(x.internalBalanceDeltaKg,0)).length
   const fullyReconciled=linked.filter(x=>x.mappedAcceptedKg!=null&&x.mainDestinationKg!=null&&exact(x.acceptedKg,x.mappedAcceptedKg)&&exact(x.destinedKg,x.mainDestinationKg)&&exact(x.internalBalanceDeltaKg,0)).length
   const aux=items.flatMap(x=>x.numericAux)
   const auxByGrade=['D','PT','R','A1','C1','Vj100'].map(grade=>({grade,n:aux.filter(a=>a.matches.includes(grade)).length,pct:pct(aux.filter(a=>a.matches.includes(grade)).length,aux.length)}))
   const patterns:any[]=[]
   const acceptedRegime=detectRegime(linked,x=>x.mappedAcceptedKg!=null&&exact(x.acceptedKg,x.mappedAcceptedKg))
   if(acceptedRegime)patterns.push({id:'accepted-semantics-regime-shift',state:'derived' as PatternState,confidence:'needs-human-validation',evidence:acceptedRegime,interpretation:'La concordancia entre Kilos Aceptados y los grados equivalentes de la hoja principal cambia abruptamente dentro de la serie del proveedor.',action:'Mantener los regímenes separados hasta confirmar si cambió el criterio de registro, proceso o semántica.'})
   const destinationRegime=detectRegime(linked,x=>x.mainDestinationKg!=null&&exact(x.destinedKg,x.mainDestinationKg))
   if(destinationRegime)patterns.push({id:'destination-semantics-regime-shift',state:'derived' as PatternState,confidence:'needs-human-validation',evidence:destinationRegime,interpretation:'La concordancia de D (destinado) con la evidencia D de la hoja principal cambia abruptamente en la serie.',action:'No homogeneizar ambos tramos sin validación humana.'})
   if(aux.length)patterns.push({id:'auxiliary-grade-correspondence',state:'derived' as PatternState,confidence:'needs-human-validation',evidence:{numericAuxCells:aux.length,matchesByGrade:auxByGrade},interpretation:'Las celdas auxiliares coinciden repetidamente con categorías de la hoja principal y funcionan como evidencia de reconciliación, no como KPI independiente.',action:'Usarlas sólo como corroboración histórica hasta confirmar su significado operacional.'})
   patterns.push({id:'support-internal-mass-balance',state:'derived' as PatternState,confidence:'derived',evidence:{blocks:items.length,exactInternalBalances:internalExact,exactInternalBalancePct:pct(internalExact,items.length)},interpretation:'Una fracción de bloques satisface Kilos Guia = Kilos Aceptados + D dentro del soporte.',action:'Usar como control de integridad del soporte, no como yield ni continuidad de producción.'})
   return {supplier,sheetName:items[0]?.sheetName??null,summary:{blocks:items.length,linkedBlocks:linked.length,linkCoveragePct:pct(linked.length,items.length),acceptedExact,acceptedExactPct:pct(acceptedExact,linked.length),destinationExact,destinationExactPct:pct(destinationExact,linked.length),internalBalanceExact:internalExact,internalBalanceExactPct:pct(internalExact,items.length),fullyReconciled,fullyReconciledPct:pct(fullyReconciled,linked.length),numericAuxCells:aux.length},patterns}
  })

  const crossSupplierPatterns=[] as any[]
  if(supplierGroups.length>=2){
   const acceptedRates=supplierGroups.filter(x=>x.summary.linkedBlocks>=5).map(x=>({supplier:x.supplier,pct:x.summary.acceptedExactPct}))
   const destinationRates=supplierGroups.filter(x=>x.summary.linkedBlocks>=5).map(x=>({supplier:x.supplier,pct:x.summary.destinationExactPct}))
   crossSupplierPatterns.push({id:'supplier-recording-heterogeneity',state:'derived',confidence:'needs-human-validation',evidence:{acceptedExactPctBySupplier:acceptedRates,destinationExactPctBySupplier:destinationRates},interpretation:'Los proveedores presentan patrones de conciliación distintos. Esto es evidencia de heterogeneidad de registro, no evidencia de desempeño del proveedor.',action:'Evitar ranking transversal hasta normalizar especie, proceso, período y semántica de captura.'})
  }

  return res.status(200).json({ok:true,status:'ready',scope:'all production support suppliers',maturity:'pilot-evidence',historicalOnly:true,writesLive:false,predictive:false,summary:{suppliers:supplierGroups.length,blocks:evidence.length,linkedBlocks:evidence.filter(x=>x.linked).length,patternsDetected:supplierGroups.reduce((sum,x)=>sum+x.patterns.length,0)+crossSupplierPatterns.length},suppliers:supplierGroups,crossSupplierPatterns,guardrail:'Los patrones describen regularidades del registro histórico. No corrigen datos, no imputan faltantes, no generan yield ni ranking y cualquier cambio de régimen permanece needs-human-validation.',sample:evidence.slice(-18)})
 }catch(error){const message=error instanceof Error?error.message:'';return res.status(message.includes('DATABASE_URL')?503:500).json({ok:false,error:message.includes('DATABASE_URL')?'Base de datos no conectada':'No fue posible construir inteligencia de patrones'})}
}

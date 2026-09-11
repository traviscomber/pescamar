import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type MainRow={source_row:unknown;supplier:unknown;process_site:unknown;guide_number:unknown;lot_code:unknown;received_kg:unknown;event_date:unknown}
type SupportHeader={sheet_name:unknown;source_block:unknown;family_key:unknown;supplier_name:unknown;process_site:unknown;guide_number:unknown;lot_reference:unknown;observation_count:unknown;data_quality_flags:unknown}
type SupportMetricRow={supplier_name:unknown;grade_code:unknown;observations:unknown;guide_kg:unknown;accepted_kg:unknown;destined_kg:unknown;accepted_obs:unknown;destined_obs:unknown;flagged_obs:unknown}
type SupportPeriodRow={supplier_name:unknown;period:unknown;observations:unknown;accepted_kg:unknown;destined_kg:unknown}
type MatchStatus='exact_both'|'guide_only'|'lot_only'|'conflict'|'ambiguous'|'unmatched'

const text=(value:unknown)=>String(value??'').trim()
const normalized=(value:unknown)=>text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')
const n=(value:unknown)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:0}
const pct=(part:number,total:number)=>total?Number((part/total*100).toFixed(1)):null
const flags=(value:unknown)=>Array.isArray(value)?value.map(item=>text(item)).filter(Boolean):[]
const month=(value:unknown)=>{if(!value)return null;const date=new Date(String(value));return Number.isNaN(date.getTime())?null:date.toISOString().slice(0,7)}
function familyFor(site:string,lot:string){const normalizedLot=lot.toLowerCase(),normalizedSite=site.toLowerCase();if(normalizedLot.startsWith('ig')||normalizedSite==='curanue')return'IG';if(normalizedLot.startsWith('mdq')||normalizedSite==='santa rosa')return'MDQ';if(normalizedLot.startsWith('mi')||normalizedSite==='candelaria')return'MI';return'RF'}

export default async function handler(request:Request,response:Response){
 response.setHeader('Cache-Control','no-store')
 if(request.method!=='GET'){response.setHeader('Allow','GET');return response.status(405).json({ok:false,error:'Método no permitido'})}
 try{
  const operator=await requireOperator(request)
  if(!operator)return response.status(401).json({ok:false,error:'Sesión requerida'})
  const sql=getSql()
  let headers:SupportHeader[]=[]
  try{
   const raw=await sql`select sheet_name,source_block,family_key,supplier_name,process_site,guide_number,lot_reference,observation_count,data_quality_flags
    from canonical_production_support_blocks
    where parser_version='production-support-v2'
      and source_file_hash in(select file_hash from canonical_source_files where canonical and (source_kind='production' or file_name ilike '%produccion%'))
    order by sheet_name,source_block`
   headers=(Array.isArray(raw)?raw:[]) as SupportHeader[]
  }catch(error){
   const message=error instanceof Error?error.message:''
   if(message.includes('canonical_production_support_blocks')||message.includes('42P01'))return response.status(200).json({ok:true,status:'migration_required',validationCase:'PV-006',maturity:'implemented',historicalOnly:true,writesLive:false,method:{version:'supplier-support-v3-cross-layer'},summary:{blocks:0,observations:0,autoLinkedBlocks:0,exceptions:0,suppliersWithSupport:0,coveragePct:null},reviewQueue:[],suppliers:[]})
   throw error
  }
  if(!headers.length)return response.status(200).json({ok:true,status:'not_imported',validationCase:'PV-006',maturity:'implemented',historicalOnly:true,writesLive:false,method:{version:'supplier-support-v3-cross-layer'},summary:{blocks:0,observations:0,autoLinkedBlocks:0,exceptions:0,suppliersWithSupport:0,coveragePct:null},reviewQueue:[],suppliers:[]})

  const [mainRaw,metricRaw,supportPeriodRaw]=await Promise.all([
   sql`select h.source_row,
    coalesce(nullif(btrim(h.supplier_name),''),nullif(btrim(h.supplier_original),''),'Sin proveedor') supplier,
    coalesce(nullif(btrim(h.process_site_original),''),nullif(btrim(h.plant_id),''),'Sin planta') process_site,
    h.guide_number,h.lot_code,h.received_kg,coalesce(h.production_date,h.process_date,h.reception_date,h.event_date) event_date
   from historical_production_records h
   where h.record_status='operational'
    and h.source_file_hash in(select file_hash from canonical_source_files where canonical and (source_kind='production' or file_name ilike '%produccion%'))
    and (lower(coalesce(h.process_site_original,h.plant_id,'')) in ('curanue','santa rosa','candelaria')
      or lower(h.lot_code) like 'ig%' or lower(h.lot_code) like 'mdq%' or lower(h.lot_code) like 'mi%')`,
   sql`select supplier_name,grade_code,count(*)::int observations,
      coalesce(sum(guide_kg),0)::numeric guide_kg,
      coalesce(sum(accepted_kg),0)::numeric accepted_kg,
      coalesce(sum(destined_kg),0)::numeric destined_kg,
      count(*) filter(where accepted_kg is not null)::int accepted_obs,
      count(*) filter(where destined_kg is not null)::int destined_obs,
      count(*) filter(where cardinality(data_quality_flags)>0)::int flagged_obs
    from canonical_production_support_rows
    where parser_version='production-support-v2'
      and source_file_hash in(select file_hash from canonical_source_files where canonical and (source_kind='production' or file_name ilike '%produccion%'))
    group by supplier_name,grade_code
    order by supplier_name,grade_code`,
   sql`select supplier_name,date_trunc('month',event_date)::date period,count(*)::int observations,
      coalesce(sum(accepted_kg),0)::numeric accepted_kg,coalesce(sum(destined_kg),0)::numeric destined_kg
    from canonical_production_support_rows
    where parser_version='production-support-v2'
      and source_file_hash in(select file_hash from canonical_source_files where canonical and (source_kind='production' or file_name ilike '%produccion%'))
      and event_date is not null
    group by supplier_name,date_trunc('month',event_date)::date
    order by supplier_name,period`
  ])
  const main=(Array.isArray(mainRaw)?mainRaw:[]) as MainRow[]
  const metricRows=(Array.isArray(metricRaw)?metricRaw:[]) as SupportMetricRow[]
  const supportPeriods=(Array.isArray(supportPeriodRaw)?supportPeriodRaw:[]) as SupportPeriodRow[]
  const candidates=main.map(row=>({sourceRow:n(row.source_row),supplier:text(row.supplier),familyKey:familyFor(text(row.process_site),text(row.lot_code)),guide:text(row.guide_number),lot:text(row.lot_code),receivedKg:n(row.received_kg),period:month(row.event_date)}))

  const blocks=headers.map(header=>{
   const supplier=text(header.supplier_name)||'Proveedor no identificado',familyKey=text(header.family_key),guide=text(header.guide_number),lotReference=text(header.lot_reference)
   const supplierCandidates=candidates.filter(row=>row.familyKey===familyKey&&normalized(row.supplier)===normalized(supplier))
   const guideCandidates=guide?supplierCandidates.filter(row=>row.guide===guide):[]
   const lotToken=normalized(lotReference),lotCandidates=lotToken?supplierCandidates.filter(row=>normalized(row.lot).startsWith(lotToken)):[]
   const guideIds=new Set(guideCandidates.map(row=>row.sourceRow)),lotIds=new Set(lotCandidates.map(row=>row.sourceRow)),intersection=[...guideIds].filter(id=>lotIds.has(id))
   let matchStatus:MatchStatus='unmatched'
   if(intersection.length===1)matchStatus='exact_both'
   else if(guideIds.size&&lotIds.size)matchStatus=intersection.length>1?'ambiguous':'conflict'
   else if(guideIds.size===1)matchStatus='guide_only'
   else if(lotIds.size===1)matchStatus='lot_only'
   else if(guideIds.size||lotIds.size)matchStatus='ambiguous'
   const sourceFlags=flags(header.data_quality_flags)
   return {supplier,sheetName:text(header.sheet_name),sourceBlock:n(header.source_block),familyKey,guide:guide||null,lotReference:lotReference||null,observationCount:n(header.observation_count),flags:sourceFlags,matchStatus}
  })

  const autoLinkedStatuses=new Set<MatchStatus>(['exact_both','guide_only','lot_only'])
  const groups=new Map<string,typeof blocks>()
  for(const block of blocks){const k=normalized(block.supplier),bucket=groups.get(k);if(bucket)bucket.push(block);else groups.set(k,[block])}
  const suppliers=[...groups.values()].map(items=>{
   const supplier=items[0]?.supplier??'Proveedor no identificado',physicalBlocks=items.length,observations=items.reduce((sum,item)=>sum+item.observationCount,0)
   const exactBoth=items.filter(item=>item.matchStatus==='exact_both').length,guideOnly=items.filter(item=>item.matchStatus==='guide_only').length,lotOnly=items.filter(item=>item.matchStatus==='lot_only').length
   const conflicts=items.filter(item=>item.matchStatus==='conflict').length,ambiguous=items.filter(item=>item.matchStatus==='ambiguous').length,unmatched=items.filter(item=>item.matchStatus==='unmatched').length
   const autoLinkedBlocks=exactBoth+guideOnly+lotOnly,exceptions=conflicts+ambiguous+unmatched
   const identitySlots=physicalBlocks*2,identityPresent=items.reduce((sum,item)=>sum+(item.guide?1:0)+(item.lotReference?1:0),0),identityCoverage=identitySlots?identityPresent/identitySlots:0,linkCoverage=physicalBlocks?autoLinkedBlocks/physicalBlocks:0
   const traceabilityScore=Number((100*(linkCoverage*.8+identityCoverage*.2)).toFixed(1)),noGradeObservationBlocks=items.filter(item=>item.observationCount===0||item.flags.includes('no_grade_observations')).length
   const unresolved=items.filter(item=>!autoLinkedStatuses.has(item.matchStatus)).map(item=>({sheetName:item.sheetName,sourceBlock:item.sourceBlock,guide:item.guide,lotReference:item.lotReference,status:item.matchStatus,confidence:'needs-human-validation' as const})).slice(0,5)
   const evidenceRows=metricRows.filter(row=>normalized(row.supplier_name)===normalized(supplier))
   const guideKg=evidenceRows.reduce((sum,row)=>sum+n(row.guide_kg),0),acceptedKg=evidenceRows.reduce((sum,row)=>sum+n(row.accepted_kg),0),destinedKg=evidenceRows.reduce((sum,row)=>sum+n(row.destined_kg),0)
   const acceptedObservations=evidenceRows.reduce((sum,row)=>sum+n(row.accepted_obs),0),destinedObservations=evidenceRows.reduce((sum,row)=>sum+n(row.destined_obs),0),flaggedObservations=evidenceRows.reduce((sum,row)=>sum+n(row.flagged_obs),0)
   const gradeEvidence=evidenceRows.map(row=>({grade:text(row.grade_code),observations:n(row.observations),guideKg:n(row.guide_kg),acceptedKg:n(row.accepted_kg),destinedKg:n(row.destined_kg),acceptedObservations:n(row.accepted_obs),destinedObservations:n(row.destined_obs)}))
   const physicalEvidence={
    guideKg:Number(guideKg.toFixed(1)),acceptedKg:Number(acceptedKg.toFixed(1)),destinedKg:Number(destinedKg.toFixed(1)),
    acceptedVsGuidePct:pct(acceptedKg,guideKg),destinedVsGuidePct:pct(destinedKg,guideKg),
    acceptedObservations,destinedObservations,flaggedObservations,
    confidence:'derived' as const,
    rule:'acceptedVsGuidePct y destinedVsGuidePct son razones históricas derivadas de las celdas pobladas de las hojas auxiliares. No son rendimiento productivo, calidad final ni score de proveedor; la cobertura de accepted/destined es parcial y debe mostrarse junto a los conteos de observaciones.'
   }
   const mainSupplierRows=candidates.filter(row=>normalized(row.supplier)===normalized(supplier))
   const mainReceivedKg=mainSupplierRows.reduce((sum,row)=>sum+row.receivedKg,0)
   const mainPeriods=[...new Set(mainSupplierRows.map(row=>row.period).filter((value):value is string=>Boolean(value)))].sort()
   const supplierSupportPeriods=supportPeriods.filter(row=>normalized(row.supplier_name)===normalized(supplier)).map(row=>({period:month(row.period),observations:n(row.observations),acceptedKg:n(row.accepted_kg),destinedKg:n(row.destined_kg)})).filter(row=>row.period)
   const supportPeriodKeys=new Set(supplierSupportPeriods.map(row=>row.period as string)),overlapPeriods=mainPeriods.filter(period=>supportPeriodKeys.has(period))
   const periodWarnings=supplierSupportPeriods.flatMap(row=>{const received=mainSupplierRows.filter(item=>item.period===row.period).reduce((sum,item)=>sum+item.receivedKg,0);return received>0&&row.acceptedKg>received?[{period:row.period,receivedKg:Number(received.toFixed(1)),acceptedKg:Number(row.acceptedKg.toFixed(1)),reason:'accepted_kg exceeds received_kg at monthly aggregate; grains are not validated as directly comparable'}]:[]})
   const crossLayerEvidence={
    mainReceptionRows:mainSupplierRows.length,
    mainReceivedKg:Number(mainReceivedKg.toFixed(1)),
    mainPeriods,
    supportPeriods:supplierSupportPeriods,
    overlappingPeriods:overlapPeriods.length,
    periodComparabilityWarnings:periodWarnings,
    comparability:'not_validated' as const,
    confidence:'needs-human-validation' as const,
    rule:'La hoja principal y las hojas auxiliares se muestran lado a lado por proveedor y periodo, pero no se calcula accepted/received ni ranking mientras no exista una regla validada que pruebe que ambas capas usan el mismo grano, universo y ventana temporal.'
   }
   return {supplier,physicalBlocks,observations,autoLinkedBlocks,matchCoveragePct:pct(autoLinkedBlocks,physicalBlocks),exactBoth,guideOnly,lotOnly,conflicts,ambiguous,unmatched,exceptions,traceabilityScore,noGradeObservationBlocks,unresolved,physicalEvidence,gradeEvidence,crossLayerEvidence}
  }).sort((a,b)=>b.traceabilityScore-a.traceabilityScore||b.physicalBlocks-a.physicalBlocks)
  const autoLinkedBlocks=suppliers.reduce((sum,item)=>sum+item.autoLinkedBlocks,0),exceptions=suppliers.reduce((sum,item)=>sum+item.exceptions,0),observations=suppliers.reduce((sum,item)=>sum+item.observations,0)
  const reviewQueue=blocks.filter(block=>!autoLinkedStatuses.has(block.matchStatus)).map(block=>({
   validationCase:'PV-006' as const,
   priority:1 as const,
   state:'needs-human-validation' as const,
   supplier:block.supplier,
   evidence:{sheetName:block.sheetName,sourceBlock:block.sourceBlock,guide:block.guide,lotReference:block.lotReference,matchStatus:block.matchStatus},
   action:'Confirmar la guía y/o el lote correcto contra el respaldo físico original. No crear ni corregir una relación automáticamente.',
   responsibleRole:'operations' as const,
   historicalOnly:true,
   writesLive:false
  }))
  const crossLayerWarnings=suppliers.reduce((sum,item)=>sum+item.crossLayerEvidence.periodComparabilityWarnings.length,0)
  return response.status(200).json({
   ok:true,
   status:'ready',
   validationCase:'PV-006',
   maturity:'pilot-evidence',
   confidence:exceptions||crossLayerWarnings?'needs-human-validation':'observed',
   historicalOnly:true,
   writesLive:false,
   method:{version:'supplier-support-v3-cross-layer',rule:'Las cadenas físicas v2 mejoran trazabilidad y exponen evidencia histórica de kilos por grado. No generan ranking de proveedor. La hoja principal y las hojas auxiliares permanecen como capas distintas hasta validar su grano de comparación.'},
   summary:{blocks:blocks.length,observations,autoLinkedBlocks,exceptions,suppliersWithSupport:suppliers.length,coveragePct:pct(autoLinkedBlocks,blocks.length),crossLayerWarnings},
   reviewQueue,
   suppliers
  })
 }catch(error){const message=error instanceof Error?error.message:'';return response.status(message.includes('DATABASE_URL')?503:500).json({ok:false,error:message.includes('DATABASE_URL')?'Base de datos no conectada':'No fue posible calcular trazabilidad física de proveedores'})}
}

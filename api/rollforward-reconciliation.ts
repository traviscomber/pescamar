import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type GradeKey='A1'|'A2'|'Vj100'|'Vj50'|'C1'|'C2'|'D'|'PT'|'R'
type GradeObservation={grade:GradeKey;kg:number|null;boxes:number|null}
type RollforwardRow={source_row:unknown;event_date:unknown;guide_number:unknown;supplier:unknown;extraction_zone:unknown;process_site:unknown;lot_code:unknown;guide_kg:unknown;received_kg:unknown;grade_breakdown:unknown;client:unknown;observations:unknown}
type SupportRow={sheet_name:unknown;source_block:unknown;source_row:unknown;grade_code:unknown;guide_kg:unknown;accepted_kg:unknown;destined_kg:unknown;data_quality_flags:unknown}
type SupportBlockHeader={sheet_name:unknown;source_block:unknown;family_key:unknown;event_date:unknown;supplier_name:unknown;process_site:unknown;guide_number:unknown;lot_reference:unknown;notes:unknown;observation_count:unknown;data_quality_flags:unknown}
type LinkStatus='ready_for_reconciliation'|'needs_destination'|'needs_evidence'
type SupportMatchStatus='exact_both'|'guide_only'|'lot_only'|'conflict'|'ambiguous'|'unmatched'
const GRADES:GradeKey[]=['A1','A2','Vj100','Vj50','C1','C2','D','PT','R']
const n=(value:unknown)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:null}
const text=(value:unknown)=>String(value??'').trim()
const pct=(part:number,total:number)=>total?Number((part/total*100).toFixed(1)):null
const normalized=(value:unknown)=>text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')
function familyFor(site:string,lot:string){const normalizedLot=lot.toLowerCase(),normalizedSite=site.toLowerCase();if(normalizedLot.startsWith('ig')||normalizedSite==='curanue')return {key:'IG',label:'Isla Guafo / Curanue'};if(normalizedLot.startsWith('mdq')||normalizedSite==='santa rosa')return {key:'MDQ',label:'Santa Rosa / MDQ'};if(normalizedLot.startsWith('mi')||normalizedSite==='candelaria')return {key:'MI',label:'Cesar / candelaria'};return {key:'RF',label:site||'Roll-forward'}}
function gradesOf(value:unknown):GradeObservation[]{const source=value&&typeof value==='object'?value as Record<string,unknown>:{};const out:GradeObservation[]=[];for(const grade of GRADES){const raw=source[grade];if(!raw||typeof raw!=='object')continue;const item=raw as Record<string,unknown>,kg=n(item.kg),boxes=n(item.boxes);if((kg??0)>0||(boxes??0)>0)out.push({grade,kg,boxes})}return out}
function stringFlags(value:unknown){return Array.isArray(value)?value.map(item=>text(item)).filter(Boolean):[]}

export default async function handler(request:Request,response:Response){
 response.setHeader('Cache-Control','no-store')
 if(request.method!=='GET'){response.setHeader('Allow','GET');return response.status(405).json({ok:false,error:'Método no permitido'})}
 try{
  const operator=await requireOperator(request)
  if(!operator)return response.status(401).json({ok:false,error:'Sesión requerida'})
  const sql=getSql()
  const raw=await sql`select h.source_row,h.event_date,h.guide_number,
    coalesce(nullif(btrim(h.supplier_name),''),nullif(btrim(h.supplier_original),''),'Sin proveedor') supplier,
    h.extraction_zone,coalesce(nullif(btrim(h.process_site_original),''),nullif(btrim(h.plant_id),''),'Sin planta') process_site,
    h.lot_code,h.guide_kg,h.received_kg,h.grade_breakdown,h.client,h.observations
   from historical_production_records h
   where h.record_status='operational'
    and h.source_file_hash in(select file_hash from canonical_source_files where canonical and (source_kind='production' or file_name ilike '%produccion%'))
    and (lower(coalesce(h.process_site_original,h.plant_id,'')) in ('curanue','santa rosa','candelaria')
      or lower(h.lot_code) like 'ig%' or lower(h.lot_code) like 'mdq%' or lower(h.lot_code) like 'mi%')
   order by h.event_date nulls last,h.source_row`
  const sourceRows=(Array.isArray(raw)?raw:[]) as RollforwardRow[]
  const observations=sourceRows.map(row=>{const lot=text(row.lot_code),site=text(row.process_site),supplier=text(row.supplier),guide=text(row.guide_number),destination=text(row.client),grades=gradesOf(row.grade_breakdown),family=familyFor(site,lot);return {sourceRow:Number(row.source_row)||0,eventDate:row.event_date??null,guide:guide||null,supplier,extractionZone:text(row.extraction_zone)||null,site,lot,guideKg:n(row.guide_kg),receivedKg:n(row.received_kg),grades,destination:destination||null,notes:text(row.observations)||null,familyKey:family.key,familyLabel:family.label}})
  const groups=new Map<string,typeof observations>()
  for(const row of observations){const key=`${row.familyKey}|${row.supplier}|${row.site}`;const bucket=groups.get(key);if(bucket)bucket.push(row);else groups.set(key,[row])}
  const chains=[...groups.values()].map(rows=>{const first=rows[0],lots=new Set(rows.map(row=>row.lot).filter(Boolean)),guides=new Set(rows.map(row=>row.guide).filter((item):item is string=>Boolean(item))),destinations=new Set(rows.map(row=>row.destination).filter((item):item is string=>Boolean(item))),gradeSet=new Set<GradeKey>(),gradeObservationCount=rows.reduce((sum,row)=>{for(const item of row.grades)gradeSet.add(item.grade);return sum+row.grades.length},0),destinationRows=rows.filter(row=>row.destination).length,guideRows=rows.filter(row=>row.guide).length,gradeRows=rows.filter(row=>row.grades.length).length,receivedKg=rows.reduce((sum,row)=>sum+(row.receivedKg??0),0),status:LinkStatus=gradeRows<rows.length||guideRows<rows.length?'needs_evidence':destinationRows<rows.length?'needs_destination':'ready_for_reconciliation';return {key:`${first.familyKey}-${first.supplier}-${first.site}`,familyKey:first.familyKey,familyLabel:first.familyLabel,supplier:first.supplier,site:first.site,rows:rows.length,lots:lots.size,guides:guides.size,receivedKg:Number(receivedKg.toFixed(1)),destinationCoveragePct:pct(destinationRows,rows.length),guideCoveragePct:pct(guideRows,rows.length),gradeCoveragePct:pct(gradeRows,rows.length),destinations:[...destinations],grades:[...gradeSet],gradeObservationCount,status,observations:rows}}).sort((a,b)=>b.rows-a.rows||b.receivedKg-a.receivedKg)

  let supportRows:SupportRow[]=[],supportHeaders:SupportBlockHeader[]=[],supportStatus:'ready'|'not_imported'|'migration_required'='ready'
  try{
   const [headerRaw,rowRaw]=await Promise.all([
    sql`select sheet_name,source_block,family_key,event_date,supplier_name,process_site,guide_number,lot_reference,notes,observation_count,data_quality_flags
     from canonical_production_support_blocks
     where parser_version='production-support-v2'
       and source_file_hash in(select file_hash from canonical_source_files where canonical and (source_kind='production' or file_name ilike '%produccion%'))
     order by sheet_name,source_block`,
    sql`select sheet_name,source_block,source_row,grade_code,guide_kg,accepted_kg,destined_kg,data_quality_flags
     from canonical_production_support_rows
     where parser_version='production-support-v2'
       and source_file_hash in(select file_hash from canonical_source_files where canonical and (source_kind='production' or file_name ilike '%produccion%'))
     order by sheet_name,source_block,source_row`
   ])
   supportHeaders=(Array.isArray(headerRaw)?headerRaw:[]) as SupportBlockHeader[]
   supportRows=(Array.isArray(rowRaw)?rowRaw:[]) as SupportRow[]
   if(!supportHeaders.length)supportStatus='not_imported'
  }catch(error){const message=error instanceof Error?error.message:'';if(message.includes('canonical_production_support_blocks')||message.includes('canonical_production_support_rows')||message.includes('42P01'))supportStatus='migration_required';else throw error}
  const rowMap=new Map<string,SupportRow[]>()
  for(const row of supportRows){const key=`${text(row.sheet_name)}|${Number(row.source_block)||0}`;const bucket=rowMap.get(key);if(bucket)bucket.push(row);else rowMap.set(key,[row])}
  const supportBlocks=supportHeaders.map(first=>{const key=`${text(first.sheet_name)}|${Number(first.source_block)||0}`,rows=rowMap.get(key)??[],familyKey=text(first.family_key),supplier=text(first.supplier_name),guide=text(first.guide_number),lotReference=text(first.lot_reference),candidateRows=observations.filter(row=>row.familyKey===familyKey&&normalized(row.supplier)===normalized(supplier)),guideCandidates=guide?candidateRows.filter(row=>text(row.guide)===guide):[],lotToken=normalized(lotReference),lotCandidates=lotToken?candidateRows.filter(row=>normalized(row.lot).startsWith(lotToken)):[],guideIds=new Set(guideCandidates.map(row=>row.sourceRow)),lotIds=new Set(lotCandidates.map(row=>row.sourceRow)),intersection=[...guideIds].filter(id=>lotIds.has(id));let matchStatus:SupportMatchStatus='unmatched',matchedSourceRow:number|null=null;if(intersection.length===1){matchStatus='exact_both';matchedSourceRow=intersection[0]}else if(guideIds.size&&lotIds.size){matchStatus=intersection.length>1?'ambiguous':'conflict'}else if(guideIds.size===1){matchStatus='guide_only';matchedSourceRow=[...guideIds][0]}else if(lotIds.size===1){matchStatus='lot_only';matchedSourceRow=[...lotIds][0]}else if(guideIds.size||lotIds.size)matchStatus='ambiguous';const grades=rows.map(row=>({sourceRow:Number(row.source_row)||0,grade:text(row.grade_code),guideKg:n(row.guide_kg),acceptedKg:n(row.accepted_kg),destinedKg:n(row.destined_kg),flags:stringFlags(row.data_quality_flags)}));return {key:`${text(first.sheet_name)}-${Number(first.source_block)||0}`,sheetName:text(first.sheet_name),sourceBlock:Number(first.source_block)||0,familyKey,eventDate:first.event_date??null,supplier,site:text(first.process_site),guide:guide||null,lotReference:lotReference||null,notes:text(first.notes)||null,observationCount:n(first.observation_count)??grades.length,flags:stringFlags(first.data_quality_flags),grades,matchStatus,matchedSourceRow,guideCandidateRows:[...guideIds],lotCandidateRows:[...lotIds]}})
  const exactBoth=supportBlocks.filter(block=>block.matchStatus==='exact_both').length,guideOnly=supportBlocks.filter(block=>block.matchStatus==='guide_only').length,lotOnly=supportBlocks.filter(block=>block.matchStatus==='lot_only').length,conflicts=supportBlocks.filter(block=>block.matchStatus==='conflict').length,ambiguous=supportBlocks.filter(block=>block.matchStatus==='ambiguous').length,unmatched=supportBlocks.filter(block=>block.matchStatus==='unmatched').length,autoLinkedBlocks=exactBoth+guideOnly+lotOnly,matchedMainRows=new Set(supportBlocks.map(block=>block.matchedSourceRow).filter((value):value is number=>value!=null)).size
  const uniqueLots=new Set(observations.map(row=>row.lot).filter(Boolean)).size,uniqueGuides=new Set(observations.map(row=>row.guide).filter(Boolean)).size,destinationRows=observations.filter(row=>row.destination).length,gradeRows=observations.filter(row=>row.grades.length).length,gradeObservationCount=observations.reduce((sum,row)=>sum+row.grades.length,0),receivedKg=observations.reduce((sum,row)=>sum+(row.receivedKg??0),0)
  return response.status(200).json({ok:true,method:{version:'rollforward-linkage-v3-physical-support-blocks',rule:'La fila principal conserva recepción, lote, guía, proveedor y planta. Las 89 cadenas físicas de Isla Guafo, Diaz termiando y Cesar se guardan como evidencia de bloque, incluso si una cadena no tiene observaciones por grado. Las 332 observaciones se guardan aparte. Un vínculo automático sólo se acepta si guía y/o prefijo de lote identifican una única fila sin contradicción. Excepciones quedan para revisión humana. Kilos guía, aceptados o destinados/RGA no se publican como rendimiento.'},summary:{rows:observations.length,chains:chains.length,uniqueLots,uniqueGuides,receivedKg:Number(receivedKg.toFixed(1)),destinationRows,destinationCoveragePct:pct(destinationRows,observations.length),gradeRows,gradeCoveragePct:pct(gradeRows,observations.length),gradeObservationCount,unresolvedDestinationRows:observations.length-destinationRows},support:{status:supportStatus,parserVersion:'production-support-v2',rows:supportRows.length,blocks:supportBlocks.length,autoLinkedBlocks,exactBoth,guideOnly,lotOnly,conflicts,ambiguous,unmatched,matchCoveragePct:pct(autoLinkedBlocks,supportBlocks.length),matchedMainRows,mainCoveragePct:pct(matchedMainRows,observations.length)},supportBlocks,chains})
 }catch(error){const message=error instanceof Error?error.message:'';return response.status(message.includes('DATABASE_URL')?503:500).json({ok:false,error:message.includes('DATABASE_URL')?'Base de datos no conectada':'No fue posible construir la conciliación roll-forward'})}
}

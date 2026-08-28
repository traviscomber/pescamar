import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type MainRow={source_row:unknown;supplier:unknown;process_site:unknown;guide_number:unknown;lot_code:unknown}
type SupportHeader={sheet_name:unknown;source_block:unknown;family_key:unknown;supplier_name:unknown;process_site:unknown;guide_number:unknown;lot_reference:unknown;observation_count:unknown;data_quality_flags:unknown}
type MatchStatus='exact_both'|'guide_only'|'lot_only'|'conflict'|'ambiguous'|'unmatched'

const text=(value:unknown)=>String(value??'').trim()
const normalized=(value:unknown)=>text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')
const n=(value:unknown)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:0}
const pct=(part:number,total:number)=>total?Number((part/total*100).toFixed(1)):null
const flags=(value:unknown)=>Array.isArray(value)?value.map(item=>text(item)).filter(Boolean):[]
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
   if(message.includes('canonical_production_support_blocks')||message.includes('42P01'))return response.status(200).json({ok:true,status:'migration_required',method:{version:'supplier-support-v1-physical-blocks'},summary:{blocks:0,observations:0,autoLinkedBlocks:0,exceptions:0,suppliersWithSupport:0},suppliers:[]})
   throw error
  }
  if(!headers.length)return response.status(200).json({ok:true,status:'not_imported',method:{version:'supplier-support-v1-physical-blocks'},summary:{blocks:0,observations:0,autoLinkedBlocks:0,exceptions:0,suppliersWithSupport:0},suppliers:[]})

  const mainRaw=await sql`select h.source_row,
    coalesce(nullif(btrim(h.supplier_name),''),nullif(btrim(h.supplier_original),''),'Sin proveedor') supplier,
    coalesce(nullif(btrim(h.process_site_original),''),nullif(btrim(h.plant_id),''),'Sin planta') process_site,
    h.guide_number,h.lot_code
   from historical_production_records h
   where h.record_status='operational'
    and h.source_file_hash in(select file_hash from canonical_source_files where canonical and (source_kind='production' or file_name ilike '%produccion%'))
    and (lower(coalesce(h.process_site_original,h.plant_id,'')) in ('curanue','santa rosa','candelaria')
      or lower(h.lot_code) like 'ig%' or lower(h.lot_code) like 'mdq%' or lower(h.lot_code) like 'mi%')`
  const main=(Array.isArray(mainRaw)?mainRaw:[]) as MainRow[]
  const candidates=main.map(row=>({sourceRow:n(row.source_row),supplier:text(row.supplier),familyKey:familyFor(text(row.process_site),text(row.lot_code)),guide:text(row.guide_number),lot:text(row.lot_code)}))

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

  const groups=new Map<string,typeof blocks>()
  for(const block of blocks){const k=normalized(block.supplier),bucket=groups.get(k);if(bucket)bucket.push(block);else groups.set(k,[block])}
  const suppliers=[...groups.values()].map(items=>{
   const supplier=items[0]?.supplier??'Proveedor no identificado',physicalBlocks=items.length,observations=items.reduce((sum,item)=>sum+item.observationCount,0)
   const exactBoth=items.filter(item=>item.matchStatus==='exact_both').length,guideOnly=items.filter(item=>item.matchStatus==='guide_only').length,lotOnly=items.filter(item=>item.matchStatus==='lot_only').length
   const conflicts=items.filter(item=>item.matchStatus==='conflict').length,ambiguous=items.filter(item=>item.matchStatus==='ambiguous').length,unmatched=items.filter(item=>item.matchStatus==='unmatched').length
   const autoLinkedBlocks=exactBoth+guideOnly+lotOnly,exceptions=conflicts+ambiguous+unmatched
   const identitySlots=physicalBlocks*2,identityPresent=items.reduce((sum,item)=>sum+(item.guide?1:0)+(item.lotReference?1:0),0),identityCoverage=identitySlots?identityPresent/identitySlots:0,linkCoverage=physicalBlocks?autoLinkedBlocks/physicalBlocks:0
   const traceabilityScore=Number((100*(linkCoverage*.8+identityCoverage*.2)).toFixed(1)),noGradeObservationBlocks=items.filter(item=>item.observationCount===0||item.flags.includes('no_grade_observations')).length
   const unresolved=items.filter(item=>!['exact_both','guide_only','lot_only'].includes(item.matchStatus)).map(item=>({sheetName:item.sheetName,sourceBlock:item.sourceBlock,guide:item.guide,lotReference:item.lotReference,status:item.matchStatus})).slice(0,5)
   return {supplier,physicalBlocks,observations,autoLinkedBlocks,matchCoveragePct:pct(autoLinkedBlocks,physicalBlocks),exactBoth,guideOnly,lotOnly,conflicts,ambiguous,unmatched,exceptions,traceabilityScore,noGradeObservationBlocks,unresolved}
  }).sort((a,b)=>b.traceabilityScore-a.traceabilityScore||b.physicalBlocks-a.physicalBlocks)
  const autoLinkedBlocks=suppliers.reduce((sum,item)=>sum+item.autoLinkedBlocks,0),exceptions=suppliers.reduce((sum,item)=>sum+item.exceptions,0),observations=suppliers.reduce((sum,item)=>sum+item.observations,0)
  return response.status(200).json({ok:true,status:'ready',method:{version:'supplier-support-v1-physical-blocks',rule:'Las cadenas físicas v2 mejoran trazabilidad y confianza, no castigan por sí solas el desempeño del proveedor. Un bloque sólo se considera conciliado cuando guía y/o lote identifican una única fila principal sin contradicción. Una cadena sin observaciones de grado sigue siendo evidencia válida.'},summary:{blocks:blocks.length,observations,autoLinkedBlocks,exceptions,suppliersWithSupport:suppliers.length},suppliers})
 }catch(error){const message=error instanceof Error?error.message:'';return response.status(message.includes('DATABASE_URL')?503:500).json({ok:false,error:message.includes('DATABASE_URL')?'Base de datos no conectada':'No fue posible calcular trazabilidad física de proveedores'})}
}

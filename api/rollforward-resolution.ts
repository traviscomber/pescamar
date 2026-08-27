import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;body?:unknown;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type Payload={sheetName?:unknown;sourceBlock?:unknown;selectedMainSourceRow?:unknown;resolutionStatus?:unknown;reviewNote?:unknown}
type CandidateRow={source_row:unknown;event_date:unknown;guide_number:unknown;supplier:unknown;process_site:unknown;lot_code:unknown;guide_kg:unknown;received_kg:unknown}
const text=(value:unknown)=>String(value??'').trim()
const normalized=(value:unknown)=>text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')
const integer=(value:unknown)=>{const parsed=Number(value);return Number.isInteger(parsed)&&parsed>0?parsed:null}
const numberOrNull=(value:unknown)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:null}
function familyFor(site:string,lot:string){const l=lot.toLowerCase(),s=site.toLowerCase();if(l.startsWith('ig')||s==='curanue')return 'IG';if(l.startsWith('mdq')||s==='santa rosa')return 'MDQ';if(l.startsWith('mi')||s==='candelaria')return 'MI';return 'RF'}
function snapshotCandidate(row:CandidateRow,guideMatch:boolean,lotMatch:boolean){return {sourceRow:Number(row.source_row)||0,eventDate:row.event_date??null,guide:text(row.guide_number)||null,lot:text(row.lot_code)||null,supplier:text(row.supplier),site:text(row.process_site),guideKg:numberOrNull(row.guide_kg),receivedKg:numberOrNull(row.received_kg),guideMatch,lotMatch}}

export default async function handler(request:Request,response:Response){
 response.setHeader('Cache-Control','no-store')
 if(request.method!=='POST'){response.setHeader('Allow','POST');return response.status(405).json({ok:false,error:'Método no permitido'})}
 try{
  const operator=await requireOperator(request,['admin','quality'])
  if(!operator)return response.status(403).json({ok:false,error:'Sólo Calidad o Administración pueden resolver conciliaciones'})
  const body=(request.body??{}) as Payload,sheetName=text(body.sheetName),sourceBlock=integer(body.sourceBlock),resolutionStatus=text(body.resolutionStatus),selectedMainSourceRow=integer(body.selectedMainSourceRow),reviewNote=text(body.reviewNote)
  if(!sheetName||!sourceBlock||!['linked','unmatched','deferred'].includes(resolutionStatus))return response.status(400).json({ok:false,error:'Resolución inválida'})
  if(resolutionStatus==='linked'&&!selectedMainSourceRow)return response.status(400).json({ok:false,error:'Selecciona una fila principal para vincular'})
  if(resolutionStatus!=='linked'&&!reviewNote)return response.status(400).json({ok:false,error:'La revisión requiere una nota cuando no se crea vínculo'})
  if(reviewNote.length>1000)return response.status(400).json({ok:false,error:'La nota supera 1.000 caracteres'})
  const sql=getSql()
  const supportRaw=await sql`select source_file_hash,parser_version,family_key,supplier_name,guide_number,lot_reference
   from canonical_production_support_rows
   where parser_version='production-support-v1' and sheet_name=${sheetName} and source_block=${sourceBlock}
    and source_file_hash in(select file_hash from canonical_source_files where canonical and (source_kind='production' or file_name ilike '%produccion%'))
   order by imported_at desc limit 1`
  const support=Array.isArray(supportRaw)?supportRaw[0] as Record<string,unknown>|undefined:undefined
  if(!support)return response.status(404).json({ok:false,error:'Bloque auxiliar no encontrado en la fuente canónica activa'})
  const sourceFileHash=text(support.source_file_hash),parserVersion=text(support.parser_version),familyKey=text(support.family_key),supplier=text(support.supplier_name),supportGuide=text(support.guide_number),supportLot=text(support.lot_reference),supportLotToken=normalized(supportLot)
  const mainRaw=await sql`select source_row,event_date,guide_number,
    coalesce(nullif(btrim(supplier_name),''),nullif(btrim(supplier_original),''),'Sin proveedor') supplier,
    coalesce(nullif(btrim(process_site_original),''),nullif(btrim(plant_id),''),'Sin planta') process_site,
    lot_code,guide_kg,received_kg
   from historical_production_records
   where source_file_hash=${sourceFileHash} and record_status='operational'
   order by source_row`
  const mainRows=(Array.isArray(mainRaw)?mainRaw:[]) as CandidateRow[]
  const familySupplierRows=mainRows.filter(row=>familyFor(text(row.process_site),text(row.lot_code))===familyKey&&normalized(row.supplier)===normalized(supplier))
  const guideCandidates=familySupplierRows.filter(row=>Boolean(supportGuide&&text(row.guide_number)===supportGuide))
  const lotCandidates=familySupplierRows.filter(row=>Boolean(supportLotToken&&normalized(row.lot_code).startsWith(supportLotToken)))
  const candidateMap=new Map<number,{row:CandidateRow;guideMatch:boolean;lotMatch:boolean}>()
  for(const row of guideCandidates){const id=Number(row.source_row)||0;if(id)candidateMap.set(id,{row,guideMatch:true,lotMatch:lotCandidates.some(item=>Number(item.source_row)===id)})}
  for(const row of lotCandidates){const id=Number(row.source_row)||0;if(id){const prior=candidateMap.get(id);candidateMap.set(id,{row,guideMatch:prior?.guideMatch??false,lotMatch:true})}}
  let selectedSnapshot:ReturnType<typeof snapshotCandidate>|null=null,resolutionBasis='none'
  if(resolutionStatus==='linked'&&selectedMainSourceRow){
   const candidate=candidateMap.get(selectedMainSourceRow)
   if(!candidate)return response.status(409).json({ok:false,error:'La fila elegida no es un candidato válido por familia, proveedor, guía o lote'})
   resolutionBasis=candidate.guideMatch&&candidate.lotMatch?'both':candidate.guideMatch?'guide':'lot'
   selectedSnapshot=snapshotCandidate(candidate.row,candidate.guideMatch,candidate.lotMatch)
  }
  const snapshot={version:'rollforward-resolution-snapshot-v2',support:{sheetName,sourceBlock,familyKey,supplier,guide:supportGuide||null,lotReference:supportLot||null},guideCandidates:guideCandidates.map(row=>snapshotCandidate(row,true,lotCandidates.some(item=>Number(item.source_row)===Number(row.source_row)))),lotCandidates:lotCandidates.map(row=>snapshotCandidate(row,guideCandidates.some(item=>Number(item.source_row)===Number(row.source_row)),true)),selected:selectedSnapshot}
  const rows=await sql`insert into canonical_production_support_resolutions(source_file_hash,parser_version,sheet_name,source_block,selected_main_source_row,resolution_status,resolution_basis,review_note,candidate_snapshot,reviewed_by_operator_id,reviewed_at)
   values (${sourceFileHash},${parserVersion},${sheetName},${sourceBlock},${selectedMainSourceRow},${resolutionStatus},${resolutionBasis},${reviewNote||null},${JSON.stringify(snapshot)}::jsonb,${operator.id}::uuid,now())
   on conflict(source_file_hash,parser_version,sheet_name,source_block) do update set selected_main_source_row=excluded.selected_main_source_row,resolution_status=excluded.resolution_status,resolution_basis=excluded.resolution_basis,review_note=excluded.review_note,candidate_snapshot=excluded.candidate_snapshot,reviewed_by_operator_id=excluded.reviewed_by_operator_id,reviewed_at=now()
   returning selected_main_source_row,resolution_status,resolution_basis,review_note,candidate_snapshot,reviewed_at`
  return response.status(200).json({ok:true,sheetName,sourceBlock,resolution:Array.isArray(rows)?rows[0]:null,reviewedBy:{id:operator.id,fullName:operator.fullName},writesLive:false})
 }catch(error){console.error('rollforward_resolution_failed',error);const message=error instanceof Error?error.message:'';if(message.includes('canonical_production_support_resolutions')||message.includes('canonical_production_support_rows')||message.includes('42P01'))return response.status(503).json({ok:false,error:'Falta aplicar las migraciones 030/031 de conciliación roll-forward'});return response.status(message.includes('DATABASE_URL')?503:500).json({ok:false,error:message.includes('DATABASE_URL')?'Base de datos no conectada':'No fue posible guardar la resolución roll-forward'})}
}

import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;body?:unknown;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type Payload={sheetName?:unknown;sourceBlock?:unknown;selectedMainSourceRow?:unknown;resolutionStatus?:unknown;reviewNote?:unknown}
const text=(value:unknown)=>String(value??'').trim()
const normalized=(value:unknown)=>text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')
const integer=(value:unknown)=>{const parsed=Number(value);return Number.isInteger(parsed)&&parsed>0?parsed:null}
function familyFor(site:string,lot:string){const l=lot.toLowerCase(),s=site.toLowerCase();if(l.startsWith('ig')||s==='curanue')return 'IG';if(l.startsWith('mdq')||s==='santa rosa')return 'MDQ';if(l.startsWith('mi')||s==='candelaria')return 'MI';return 'RF'}

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
  const sourceFileHash=text(support.source_file_hash),parserVersion=text(support.parser_version),familyKey=text(support.family_key),supplier=text(support.supplier_name),supportGuide=text(support.guide_number),supportLot=text(support.lot_reference)
  let selected:Record<string,unknown>|null=null,resolutionBasis='none'
  if(resolutionStatus==='linked'&&selectedMainSourceRow){
   const mainRaw=await sql`select source_row,guide_number,coalesce(nullif(btrim(supplier_name),''),nullif(btrim(supplier_original),''),'Sin proveedor') supplier,
     coalesce(nullif(btrim(process_site_original),''),nullif(btrim(plant_id),''),'Sin planta') process_site,lot_code
    from historical_production_records where source_file_hash=${sourceFileHash} and record_status='operational' and source_row=${selectedMainSourceRow} limit 1`
   selected=Array.isArray(mainRaw)?mainRaw[0] as Record<string,unknown>|undefined??null:null
   if(!selected)return response.status(409).json({ok:false,error:'La fila principal seleccionada ya no existe en la fuente canónica'})
   const mainSupplier=text(selected.supplier),mainSite=text(selected.process_site),mainLot=text(selected.lot_code),mainGuide=text(selected.guide_number),sameFamily=familyFor(mainSite,mainLot)===familyKey,sameSupplier=normalized(mainSupplier)===normalized(supplier),guideMatch=Boolean(supportGuide&&mainGuide===supportGuide),lotMatch=Boolean(supportLot&&normalized(mainLot).startsWith(normalized(supportLot)))
   if(!sameFamily||!sameSupplier||(!guideMatch&&!lotMatch))return response.status(409).json({ok:false,error:'La fila elegida no es un candidato válido por familia, proveedor, guía o lote'})
   resolutionBasis=guideMatch&&lotMatch?'both':guideMatch?'guide':'lot'
   selected={...selected,guideMatch,lotMatch,sameFamily,sameSupplier}
  }
  const snapshot={support:{sheetName,sourceBlock,familyKey,supplier,guide:supportGuide||null,lotReference:supportLot||null},selected:selectedMainSourceRow?{sourceRow:selectedMainSourceRow,guide:selected?.guide_number??null,lot:selected?.lot_code??null,supplier:selected?.supplier??null,site:selected?.process_site??null,guideMatch:selected?.guideMatch??false,lotMatch:selected?.lotMatch??false}:null}
  const rows=await sql`insert into canonical_production_support_resolutions(source_file_hash,parser_version,sheet_name,source_block,selected_main_source_row,resolution_status,resolution_basis,review_note,candidate_snapshot,reviewed_by_operator_id,reviewed_at)
   values (${sourceFileHash},${parserVersion},${sheetName},${sourceBlock},${selectedMainSourceRow},${resolutionStatus},${resolutionBasis},${reviewNote||null},${JSON.stringify(snapshot)}::jsonb,${operator.id}::uuid,now())
   on conflict(source_file_hash,parser_version,sheet_name,source_block) do update set selected_main_source_row=excluded.selected_main_source_row,resolution_status=excluded.resolution_status,resolution_basis=excluded.resolution_basis,review_note=excluded.review_note,candidate_snapshot=excluded.candidate_snapshot,reviewed_by_operator_id=excluded.reviewed_by_operator_id,reviewed_at=now()
   returning selected_main_source_row,resolution_status,resolution_basis,review_note,reviewed_at`
  return response.status(200).json({ok:true,sheetName,sourceBlock,resolution:Array.isArray(rows)?rows[0]:null,reviewedBy:{id:operator.id,fullName:operator.fullName},writesLive:false})
 }catch(error){console.error('rollforward_resolution_failed',error);const message=error instanceof Error?error.message:'';if(message.includes('canonical_production_support_resolutions')||message.includes('42P01'))return response.status(503).json({ok:false,error:'Falta aplicar la migración 031 de resoluciones roll-forward'});return response.status(message.includes('DATABASE_URL')?503:500).json({ok:false,error:message.includes('DATABASE_URL')?'Base de datos no conectada':'No fue posible guardar la resolución roll-forward'})}
}

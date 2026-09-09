import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;query?:Record<string,string|string[]|undefined>;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type LotRow=Record<string,unknown>&{lot_key?:string;lot_labels?:unknown;guide_labels?:unknown;guides?:unknown;guide_placeholder_rows?:unknown;suppliers?:unknown;clients?:unknown;source_refs?:unknown;rows?:unknown;flagged_rows?:unknown;kg?:unknown;first_date?:unknown;last_date?:unknown}
const one=(value:string|string[]|undefined)=>Array.isArray(value)?value[0]:value
const asArray=(value:unknown)=>Array.isArray(value)?value:[]
const n=(value:unknown)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:0}

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 try{
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
  const requestedStatus=String(one(req.query?.status)??'review').toLowerCase()
  if(!['review','resolved','all'].includes(requestedStatus))return res.status(400).json({ok:false,error:'Estado inválido'})
  const requestedLimit=Math.min(200,Math.max(1,Number(one(req.query?.limit)??50)||50))
  const sql=getSql()
  const raw=await sql`with grouped as (
   select lower(btrim(lot_code)) lot_key,
    array_agg(distinct lot_code order by lot_code) lot_labels,
    array_agg(distinct guide_number order by guide_number) filter(where nullif(btrim(guide_number),'') is not null) guide_labels,
    array_agg(distinct guide_number order by guide_number) filter(where nullif(btrim(guide_number),'') is not null and lower(btrim(guide_number)) not in ('sin guia','sin guía','s/guia','s/guía')) guides,
    count(*) filter(where lower(btrim(coalesce(guide_number,''))) in ('sin guia','sin guía','s/guia','s/guía'))::int guide_placeholder_rows,
    array_agg(distinct coalesce(nullif(btrim(supplier_name),''),nullif(btrim(supplier_original),'')) order by coalesce(nullif(btrim(supplier_name),''),nullif(btrim(supplier_original),''))) filter(where coalesce(nullif(btrim(supplier_name),''),nullif(btrim(supplier_original),'')) is not null) suppliers,
    array_agg(distinct nullif(btrim(client),'') order by nullif(btrim(client),'')) filter(where nullif(btrim(client),'') is not null) clients,
    count(*)::int rows,
    count(*) filter(where cardinality(data_quality_flags)>0)::int flagged_rows,
    sum(coalesce(received_kg,guide_kg,0))::numeric kg,
    min(event_date) first_date,max(event_date) last_date,
    jsonb_agg(jsonb_build_object('id',id,'sourceFile',source_file,'sourceFileHash',source_file_hash,'sourceRow',source_row,'guideNumber',guide_number,'eventDate',event_date,'supplierOriginal',supplier_original,'supplierName',supplier_name,'client',client,'plantId',plant_id,'processSite',process_site_original,'qualityFlags',data_quality_flags) order by source_row,id) source_refs
   from historical_production_records
   where record_status='operational' and nullif(btrim(lot_code),'') is not null
   group by lower(btrim(lot_code))
  ) select * from grouped order by last_date desc nulls last,lot_key`
  const lots=(Array.isArray(raw)?raw:[]) as LotRow[]
  const enriched=lots.map(row=>{
   const guides=asArray(row.guides),guideLabels=asArray(row.guide_labels),guidePlaceholderRows=n(row.guide_placeholder_rows),suppliers=asArray(row.suppliers),clients=asArray(row.clients)
   const reasons:string[]=[]
   if(guides.length!==1)reasons.push(guides.length===0?'missing_guide':'multiple_guides')
   if(guidePlaceholderRows>0)reasons.push('guide_placeholder_present')
   if(suppliers.length!==1)reasons.push(suppliers.length===0?'missing_supplier':'multiple_suppliers')
   if(clients.length>1)reasons.push('multiple_clients')
   const status=reasons.length?'review':'resolved'
   return {lotKey:String(row.lot_key??''),lotLabels:asArray(row.lot_labels),status,reasons,guideLabels,guides,guidePlaceholderRows,suppliers,clients,rows:n(row.rows),flaggedRows:n(row.flagged_rows),kg:n(row.kg),firstDate:row.first_date??null,lastDate:row.last_date??null,sourceRefs:asArray(row.source_refs)}
  })
  const review=enriched.filter(row=>row.status==='review'),resolved=enriched.filter(row=>row.status==='resolved')
  const visible=requestedStatus==='all'?enriched:requestedStatus==='resolved'?resolved:review
  return res.status(200).json({ok:true,schemaVersion:'pescamar.canonical-lot-reconciliation.v1',summary:{lotKeys:enriched.length,resolved:resolved.length,review:review.length,multiGuideLots:enriched.filter(row=>row.reasons.includes('multiple_guides')).length,missingGuideLots:enriched.filter(row=>row.reasons.includes('missing_guide')).length,placeholderGuideLots:enriched.filter(row=>row.reasons.includes('guide_placeholder_present')).length,missingSupplierLots:enriched.filter(row=>row.reasons.includes('missing_supplier')).length,supplierConflictLots:enriched.filter(row=>row.reasons.includes('multiple_suppliers')).length,clientConflictLots:enriched.filter(row=>row.reasons.includes('multiple_clients')).length},filter:{status:requestedStatus,limit:requestedLimit,returned:Math.min(visible.length,requestedLimit)},lots:visible.slice(0,requestedLimit),governance:{mode:'evidence_only',writesHistorical:false,writesReceptions:false,writesInventory:false,writesParties:false,promotionAllowed:false,identityRule:'Un lote histórico sólo queda reconciliado cuando tiene exactamente una guía real, ningún placeholder de guía, exactamente un proveedor histórico y no mezcla clientes. Esto no crea recepción, inventario, venta ni contraparte viva.',partyRule:'La reconciliación de lote no equivale a reconciliación de party. Las contrapartes maestras siguen requiriendo identidad exacta y verificada por separado.'}})
 }catch(error){const message=error instanceof Error?error.message:'';return res.status(message.includes('historical_production_records')?503:500).json({ok:false,error:message.includes('historical_production_records')?'Falta la fuente histórica canónica':'No fue posible conciliar lotes históricos'})}
}

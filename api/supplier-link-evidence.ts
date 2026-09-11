import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type MatchStatus='exact_both'|'guide_only'|'lot_only'|'conflict'|'ambiguous'|'unmatched'
const t=(v:unknown)=>String(v??'').trim()
const n=(v:unknown)=>{const x=Number(v);return Number.isFinite(x)?x:0}
const norm=(v:unknown)=>t(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')
const family=(site:string,lot:string)=>{const s=site.toLowerCase(),l=lot.toLowerCase();if(l.startsWith('ig')||s==='curanue')return'IG';if(l.startsWith('mdq')||s==='santa rosa')return'MDQ';if(l.startsWith('mi')||s==='candelaria')return'MI';return'RF'}

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
 try{
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  if(!(operator.role==='admin'||operator.plantIds.length>=6))return res.status(403).json({ok:false,error:'Acceso corporativo requerido'})
  const sql=getSql()
  const [blockRaw,rowRaw,mainRaw]=await Promise.all([
   sql`select sheet_name,source_block,family_key,supplier_name,guide_number,lot_reference,observation_count
       from canonical_production_support_blocks
       where parser_version='production-support-v2'
         and source_file_hash in(select file_hash from canonical_source_files where canonical and file_name='planilla de produccion 2026.xlsx')
       order by sheet_name,source_block`,
   sql`select sheet_name,source_block,count(*)::int observations,
       coalesce(sum(accepted_kg),0)::numeric accepted_kg,
       coalesce(sum(destined_kg),0)::numeric destined_kg
       from canonical_production_support_rows
       where parser_version='production-support-v2'
         and source_file_hash in(select file_hash from canonical_source_files where canonical and file_name='planilla de produccion 2026.xlsx')
       group by sheet_name,source_block`,
   sql`select source_row,coalesce(nullif(btrim(supplier_name),''),nullif(btrim(supplier_original),''),'Sin proveedor') supplier,
       coalesce(nullif(btrim(process_site_original),''),nullif(btrim(plant_id),''),'Sin planta') process_site,
       guide_number,lot_code,received_kg
       from historical_production_records
       where record_status='operational'
         and source_file_hash in(select file_hash from canonical_source_files where canonical and file_name='planilla de produccion 2026.xlsx')`
  ])
  const blocks=(Array.isArray(blockRaw)?blockRaw:[]) as Record<string,unknown>[]
  const metrics=new Map((Array.isArray(rowRaw)?rowRaw:[]).map((r:any)=>[`${t(r.sheet_name)}:${n(r.source_block)}`,r]))
  const main=(Array.isArray(mainRaw)?mainRaw:[]).map((r:any)=>({sourceRow:n(r.source_row),supplier:t(r.supplier),familyKey:family(t(r.process_site),t(r.lot_code)),guide:t(r.guide_number),lot:t(r.lot_code),receivedKg:n(r.received_kg)}))
  const links=blocks.map((b:any)=>{
   const supplier=t(b.supplier_name),familyKey=t(b.family_key),guide=t(b.guide_number),lotRef=t(b.lot_reference),pool=main.filter(r=>r.familyKey===familyKey&&norm(r.supplier)===norm(supplier))
   const byGuide=guide?pool.filter(r=>r.guide===guide):[], token=norm(lotRef),byLot=token?pool.filter(r=>norm(r.lot).startsWith(token)):[]
   const guideIds=new Set(byGuide.map(r=>r.sourceRow)),lotIds=new Set(byLot.map(r=>r.sourceRow)),both=[...guideIds].filter(id=>lotIds.has(id))
   let status:MatchStatus='unmatched',selected:typeof main[number]|undefined
   if(both.length===1){status='exact_both';selected=pool.find(r=>r.sourceRow===both[0])}
   else if(guideIds.size&&lotIds.size)status=both.length>1?'ambiguous':'conflict'
   else if(guideIds.size===1){status='guide_only';selected=byGuide[0]}
   else if(lotIds.size===1){status='lot_only';selected=byLot[0]}
   else if(guideIds.size||lotIds.size)status='ambiguous'
   const m:any=metrics.get(`${t(b.sheet_name)}:${n(b.source_block)}`)??{}
   const acceptedKg=n(m.accepted_kg),destinedKg=n(m.destined_kg),supportKg=acceptedKg+destinedKg,receivedKg=selected?.receivedKg??0
   const massState=!selected||receivedKg<=0?'not_comparable':supportKg<=receivedKg*1.02?'plausible':'exceeds_received'
   return {supplier,sheetName:t(b.sheet_name),sourceBlock:n(b.source_block),guide:guide||null,lotReference:lotRef||null,status,selectedMainSourceRow:selected?.sourceRow??null,observations:n(m.observations),receivedKg:selected?Number(receivedKg.toFixed(1)):null,acceptedKg:Number(acceptedKg.toFixed(1)),destinedKg:Number(destinedKg.toFixed(1)),massState,confidence:status==='unmatched'||status==='ambiguous'||status==='conflict'||massState==='exceeds_received'?'needs-human-validation':'derived'}
  })
  const linkable=new Set<MatchStatus>(['exact_both','guide_only','lot_only'])
  const linked=links.filter(x=>linkable.has(x.status)),unresolved=links.filter(x=>!linkable.has(x.status)),massWarnings=linked.filter(x=>x.massState==='exceeds_received')
  const suppliers=[...new Set(links.map(x=>x.supplier))].map(supplier=>{const items=links.filter(x=>x.supplier===supplier),li=items.filter(x=>linkable.has(x.status)),mw=li.filter(x=>x.massState==='exceeds_received');return {supplier,blocks:items.length,linkedBlocks:li.length,linkCoveragePct:items.length?Number((li.length/items.length*100).toFixed(1)):null,massPlausibleBlocks:li.filter(x=>x.massState==='plausible').length,massWarningBlocks:mw.length,comparability:mw.length?'not_validated':'candidate'}})
  return res.status(200).json({ok:true,status:'ready',validationCase:'PV-006',maturity:'pilot-evidence',historicalOnly:true,writesLive:false,method:{version:'supplier-link-evidence-v1',rule:'Los vínculos por guía/lote identifican evidencia relacionada, pero no convierten accepted/destined en rendimiento. Si accepted+destined supera received en el vínculo, la comparabilidad de masa queda bloqueada y requiere validación humana.'},summary:{blocks:links.length,linkedBlocks:linked.length,unresolvedBlocks:unresolved.length,linkCoveragePct:links.length?Number((linked.length/links.length*100).toFixed(1)):null,massPlausibleBlocks:linked.filter(x=>x.massState==='plausible').length,massWarningBlocks:massWarnings.length},suppliers,reviewQueue:[...unresolved,...massWarnings].map(x=>({priority:1,state:'needs-human-validation',supplier:x.supplier,evidence:{sheetName:x.sheetName,sourceBlock:x.sourceBlock,guide:x.guide,lotReference:x.lotReference,status:x.status,massState:x.massState,receivedKg:x.receivedKg,acceptedKg:x.acceptedKg,destinedKg:x.destinedKg},action:x.massState==='exceeds_received'?'Confirmar que received kg y accepted/destined kg comparten unidad, grano y universo antes de calcular rendimiento.':'Confirmar guía/lote contra respaldo físico original.'})),links:links.slice(0,120)})
 }catch(error){const message=error instanceof Error?error.message:'';return res.status(message.includes('DATABASE_URL')?503:500).json({ok:false,error:message.includes('DATABASE_URL')?'Base de datos no conectada':'No fue posible construir evidencia por vínculo'})}
}

import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type ReviewRow={source_file_hash:string;source_file:string;source_row:number;event_date:string|null;supplier_name:string|null;lot_code:string|null;guide_number:string|null;guide_kg:number|string|null;received_kg:number|string|null;reception_date:string|null;process_date:string|null;production_date:string|null;data_quality_flags:string[]|null;context_rows:number|string}

const normalized=(value:string|null)=>String(value??'').trim().toLowerCase()

export default async function handler(req:Request,res:Response){
  res.setHeader('Cache-Control','no-store')
  try{
    const operator=await requireOperator(req,['admin','operations','finance'])
    if(!operator)return res.status(403).json({ok:false,error:'Permisos insuficientes'})
    if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
    const sql=getSql()
    const rows=await sql`with contexts as (
      select source_file_hash,lower(trim(coalesce(lot_code,''))) lot_key,trim(coalesce(guide_number,'')) guide_key,lower(trim(coalesce(supplier_name,''))) supplier_key,guide_kg,received_kg,count(*)::int n
      from historical_production_records where record_status='operational'
      group by source_file_hash,lower(trim(coalesce(lot_code,''))),trim(coalesce(guide_number,'')),lower(trim(coalesce(supplier_name,''))),guide_kg,received_kg
    ) select h.source_file_hash,h.source_file,h.source_row,h.event_date,h.supplier_name,h.lot_code,h.guide_number,h.guide_kg,h.received_kg,h.reception_date,h.process_date,h.production_date,h.data_quality_flags,coalesce(c.n,1)::int context_rows
    from historical_production_records h
    left join contexts c on c.source_file_hash=h.source_file_hash and c.lot_key=lower(trim(coalesce(h.lot_code,''))) and c.guide_key=trim(coalesce(h.guide_number,'')) and c.supplier_key=lower(trim(coalesce(h.supplier_name,''))) and c.guide_kg is not distinct from h.guide_kg and c.received_kg is not distinct from h.received_kg
    where h.record_status='operational' and (coalesce(c.n,1)>1 or cardinality(coalesce(h.data_quality_flags,array[]::text[]))>0)
    order by h.event_date desc nulls last,h.source_file,h.source_row`
    const reviewRows=(rows as ReviewRow[]).map(row=>{
      const flags=Array.isArray(row.data_quality_flags)?row.data_quality_flags:[]
      const contextRows=Number(row.context_rows??1)
      return {...row,context_rows:contextRows,data_quality_flags:flags,review_reasons:[...flags,...(contextRows>1?['non_unique_context']:[])]}
    })
    const bySource=Object.values(reviewRows.reduce<Record<string,{source_file:string;rows:number;flagged_rows:number;non_unique_context_rows:number}>>((acc,row)=>{
      const current=acc[row.source_file]??{source_file:row.source_file,rows:0,flagged_rows:0,non_unique_context_rows:0}
      current.rows+=1
      if(row.data_quality_flags.length)current.flagged_rows+=1
      if(row.context_rows>1)current.non_unique_context_rows+=1
      acc[row.source_file]=current
      return acc
    },{})).sort((a,b)=>a.source_file.localeCompare(b.source_file))
    const dated=reviewRows.map(row=>row.event_date).filter((value):value is string=>Boolean(value)).sort()
    const nonUniqueContextKeys=reviewRows.filter(row=>row.context_rows>1).map(row=>[
      row.source_file_hash,
      normalized(row.lot_code),
      String(row.guide_number??'').trim(),
      normalized(row.supplier_name),
      String(row.guide_kg??''),
      String(row.received_kg??'')
    ].join('|'))
    return res.status(200).json({
      ok:true,
      rows:reviewRows,
      summary:{
        rows:reviewRows.length,
        flaggedRows:reviewRows.filter(row=>row.data_quality_flags.length>0).length,
        nonUniqueContextRows:reviewRows.filter(row=>row.context_rows>1).length,
        nonUniqueContexts:new Set(nonUniqueContextKeys).size,
        firstDate:dated[0]??null,
        lastDate:dated.length?dated[dated.length-1]:null,
        bySource
      },
      governance:{mode:'evidence_only',writesHistorical:false,writesLive:false,rule:'Esta cola expone evidencia canónica para revisión humana. No corrige, elimina, fusiona ni deduplica registros históricos. Cualquier rectificación debe ocurrir mediante un flujo explícito y auditable que preserve el linaje original.'}
    })
  }catch(error){
    const message=error instanceof Error?error.message:''
    return res.status(message.includes('historical_production_records')?503:500).json({ok:false,error:message.includes('historical_production_records')?'Falta aplicar la capa canónica de producción':'No fue posible cargar la cola canónica de producción'})
  }
}

import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
const rows=(v:unknown)=>Array.isArray(v)?v:[]

export default async function handler(req:Request,res:Response){
  res.setHeader('Cache-Control','no-store')
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
  try{
    const operator=await requireOperator(req,['admin','operations'])
    if(!operator)return res.status(403).json({ok:false,error:'Permisos insuficientes'})
    const sql=getSql()
    const [sources,production,ledger,stock,transfers,packing]=await Promise.all([
      sql`select file_hash,file_name,source_kind,canonical,period_start,period_end,source_sheets,record_count,notes,imported_at from canonical_source_files where canonical order by file_name`,
      sql`select source_file_hash,count(*)::int rows,count(*) filter(where cardinality(data_quality_flags)>0)::int flagged,coalesce(sum(guide_kg),0)::numeric guide_kg,coalesce(sum(received_kg),0)::numeric received_kg,min(event_date) first_date,max(event_date) last_date from historical_production_records where source_file_hash in(select file_hash from canonical_source_files where source_kind like '%production%' or file_name ilike '%produccion 2026%') group by source_file_hash`,
      sql`select source_file_hash,count(*)::int rows,count(*) filter(where cardinality(data_quality_flags)>0)::int flagged,coalesce(sum(inflow_clp),0)::numeric inflow_clp,coalesce(sum(outflow_clp),0)::numeric outflow_clp,(array_agg(balance_clp order by source_row desc))[1] final_balance_clp,min(event_date) first_date,max(event_date) last_date from canonical_account_entries group by source_file_hash`,
      sql`select source_file_hash,product_family,count(*)::int rows,count(*) filter(where cardinality(data_quality_flags)>0)::int flagged,coalesce(sum(total_kg),0)::numeric net_kg,min(event_date) first_date,max(event_date) last_date from canonical_stock_records group by source_file_hash,product_family order by product_family`,
      sql`select source_file_hash,count(*)::int rows,count(*) filter(where cardinality(data_quality_flags)>0)::int flagged,coalesce(sum(amount_clp),0)::numeric amount_clp,min(event_date) first_date,max(event_date) last_date from canonical_transfers_received group by source_file_hash`,
      sql`select source_file_hash,pack_format,count(*)::int rows,count(*) filter(where cardinality(data_quality_flags)>0)::int flagged,coalesce(sum(total_kg),0)::numeric kg,count(distinct lot_code) filter(where lot_code is not null)::int lots,min(production_date) first_date,max(production_date) last_date from canonical_packing_boxes group by source_file_hash,pack_format order by pack_format`
    ])
    return res.status(200).json({ok:true,sources:rows(sources),datasets:{production:rows(production),ledger:rows(ledger),stock:rows(stock),transfers:rows(transfers),packing:rows(packing)}})
  }catch(error){
    const message=error instanceof Error?error.message:''
    return res.status(message.includes('canonical_')||message.includes('historical_production')?503:500).json({ok:false,error:message.includes('canonical_')||message.includes('historical_production')?'Falta aplicar la capa canónica':'No fue posible cargar estado canónico'})
  }
}

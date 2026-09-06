import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
const rows=(value:unknown)=>Array.isArray(value)?value as Record<string,unknown>[]:[]

export default async function handler(req:Request,res:Response){
  res.setHeader('Cache-Control','no-store')
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
  try{
    const operator=await requireOperator(req,['admin','operations','finance','quality'])
    if(!operator)return res.status(403).json({ok:false,error:'Permisos insuficientes'})
    const sql=getSql()
    const result=await sql`with observations as (
      select source_file_hash,event_date observed_date from historical_production_records where event_date is not null
      union all select source_file_hash,event_date from canonical_account_entries where event_date is not null
      union all select source_file_hash,event_date from canonical_stock_records where event_date is not null
      union all select source_file_hash,event_date from canonical_transfers_received where event_date is not null
      union all select source_file_hash,production_date from canonical_packing_boxes where production_date is not null
    ), coverage as (
      select source_file_hash,min(observed_date)::date observed_start,max(observed_date)::date observed_end,count(*)::int observed_records
      from observations group by source_file_hash
    )
    select s.file_hash,s.file_name,s.source_kind,s.period_start declared_start,s.period_end declared_end,s.record_count,
      c.observed_start,c.observed_end,c.observed_records,
      case when c.observed_end is null then 'no_dated_observation'
           when s.period_end is null then 'missing_declared_end'
           when c.observed_end>s.period_end then 'declared_end_stale'
           when c.observed_end<s.period_end then 'declared_end_ahead_of_observed'
           else 'aligned' end end_status,
      case when c.observed_start is null then 'no_dated_observation'
           when s.period_start is null then 'missing_declared_start'
           when c.observed_start<s.period_start then 'declared_start_stale'
           when c.observed_start>s.period_start then 'declared_start_before_observed'
           else 'aligned' end start_status
    from canonical_source_files s left join coverage c on c.source_file_hash=s.file_hash
    where s.canonical order by s.file_name`
    const sources=rows(result)
    const drift=sources.filter(row=>row.start_status!=='aligned'||row.end_status!=='aligned')
    return res.status(200).json({
      ok:true,
      schemaVersion:'seafood.canonical.coverage.v1',
      generatedAt:new Date().toISOString(),
      readOnly:true,
      sources,
      assessment:{total:sources.length,drifted:drift.length,clean:drift.length===0},
      rule:'Declared source coverage is metadata. Observed coverage is derived only from dated canonical rows sharing the exact source file hash; drift is reported, never silently rewritten.'
    })
  }catch(error){
    const message=error instanceof Error?error.message:''
    const canonical=message.includes('canonical_')||message.includes('historical_production')
    return res.status(canonical?503:500).json({ok:false,error:canonical?'Falta aplicar la capa canónica':'No fue posible reconciliar cobertura canónica'})
  }
}

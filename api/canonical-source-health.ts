import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type SourceRow={file_hash:string;file_name:string;source_kind:string;period_start:string|null;period_end:string|null;record_count:number|string;imported_at:string|null}
type ObservedRow={dataset:string;source_file_hash:string;rows:number|string;flagged:number|string;future_rows:number|string;first_date:string|null;last_date:string|null}
type LegacyRow={source_file_hash:string;file_name:string|null;rows:number|string;flagged:number|string;first_date:string|null;last_date:string|null}
type Integrity='complete'|'partial'|'over'|'empty'|'reference'

const measurableKinds:Record<string,string[]>={
  production_2026:['production'],
  finance_stock:['account','stock','transfers'],
  packing_octopus_2026:['packing'],
}
const arr=<T>(value:unknown)=>Array.isArray(value)?value as T[]:[]
const n=(value:unknown)=>Number.isFinite(Number(value))?Number(value):0

function minDate(values:(string|null)[]){const dates=values.filter((value):value is string=>Boolean(value)).sort();return dates[0]??null}
function maxDate(values:(string|null)[]){const dates=values.filter((value):value is string=>Boolean(value)).sort();return dates.at(-1)??null}
function integrity(expected:number,actual:number):Integrity{if(expected===actual)return'complete';if(actual===0)return'empty';return actual<expected?'partial':'over'}

export default async function handler(req:Request,res:Response){
  res.setHeader('Cache-Control','no-store, max-age=0')
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
  try{
    const operator=await requireOperator(req,['admin','operations'])
    if(!operator)return res.status(403).json({ok:false,error:'Permisos insuficientes'})
    const sql=getSql()
    const [sourceRows,observedRows,legacyRows]=await Promise.all([
      sql`select file_hash,file_name,source_kind,period_start,period_end,record_count,imported_at from canonical_source_files where canonical order by file_name`,
      sql`
        select 'production'::text dataset,source_file_hash,count(*)::int rows,count(*) filter(where cardinality(data_quality_flags)>0)::int flagged,count(*) filter(where event_date>current_date)::int future_rows,min(event_date) first_date,max(event_date) last_date from historical_production_records group by source_file_hash
        union all
        select 'account',source_file_hash,count(*)::int,count(*) filter(where cardinality(data_quality_flags)>0)::int,count(*) filter(where event_date>current_date)::int,min(event_date),max(event_date) from canonical_account_entries group by source_file_hash
        union all
        select 'stock',source_file_hash,count(*)::int,count(*) filter(where cardinality(data_quality_flags)>0)::int,count(*) filter(where event_date>current_date)::int,min(event_date),max(event_date) from canonical_stock_records group by source_file_hash
        union all
        select 'transfers',source_file_hash,count(*)::int,count(*) filter(where cardinality(data_quality_flags)>0)::int,count(*) filter(where event_date>current_date)::int,min(event_date),max(event_date) from canonical_transfers_received group by source_file_hash
        union all
        select 'packing',source_file_hash,count(*)::int,count(*) filter(where cardinality(data_quality_flags)>0)::int,count(*) filter(where production_date>current_date)::int,min(production_date),max(production_date) from canonical_packing_boxes group by source_file_hash
      `,
      sql`select h.source_file_hash,min(h.source_file) file_name,count(*)::int rows,count(*) filter(where cardinality(h.data_quality_flags)>0)::int flagged,min(h.event_date) first_date,max(h.event_date) last_date from historical_production_records h where not exists(select 1 from canonical_source_files s where s.file_hash=h.source_file_hash and s.canonical) group by h.source_file_hash order by min(h.source_file)`,
    ])
    const sources=arr<SourceRow>(sourceRows),observed=arr<ObservedRow>(observedRows)
    const health=sources.map(source=>{
      const datasets=measurableKinds[source.source_kind]??[]
      if(!datasets.length)return{
        fileHash:source.file_hash,fileName:source.file_name,sourceKind:source.source_kind,measurable:false,integrity:'reference' as Integrity,expectedRows:n(source.record_count),observedRows:null,flaggedRows:null,futureRows:null,registeredPeriod:{start:source.period_start,end:source.period_end},observedPeriod:{start:null,end:null},importedAt:source.imported_at,datasets:[],
      }
      const rows=observed.filter(row=>row.source_file_hash===source.file_hash&&datasets.includes(row.dataset))
      const actual=rows.reduce((sum,row)=>sum+n(row.rows),0),expected=n(source.record_count)
      return{
        fileHash:source.file_hash,fileName:source.file_name,sourceKind:source.source_kind,measurable:true,integrity:integrity(expected,actual),expectedRows:expected,observedRows:actual,flaggedRows:rows.reduce((sum,row)=>sum+n(row.flagged),0),futureRows:rows.reduce((sum,row)=>sum+n(row.future_rows),0),registeredPeriod:{start:source.period_start,end:source.period_end},observedPeriod:{start:minDate(rows.map(row=>row.first_date)),end:maxDate(rows.map(row=>row.last_date))},importedAt:source.imported_at,datasets:rows.map(row=>({name:row.dataset,rows:n(row.rows),flaggedRows:n(row.flagged),futureRows:n(row.future_rows),firstDate:row.first_date,lastDate:row.last_date})),
      }
    })
    const measurable=health.filter(item=>item.measurable),references=health.filter(item=>!item.measurable)
    const legacy=arr<LegacyRow>(legacyRows).map(row=>({fileHash:row.source_file_hash,fileName:row.file_name,rows:n(row.rows),flaggedRows:n(row.flagged),observedPeriod:{start:row.first_date,end:row.last_date},governance:'legacy_replay_only'}))
    return res.status(200).json({
      ok:true,
      checkedAt:new Date().toISOString(),
      summary:{registeredSources:health.length,measurableSources:measurable.length,completeSources:measurable.filter(item=>item.integrity==='complete').length,incompleteSources:measurable.filter(item=>item.integrity!=='complete').length,qualityReviewSources:measurable.filter(item=>n(item.flaggedRows)>0||n(item.futureRows)>0).length,referenceSources:references.length,legacyEvidenceSources:legacy.length},
      sources:health,
      legacyEvidence:legacy,
      governance:{writes:false,rule:'Integridad compara el record_count registrado sólo contra datasets cuyo source_kind tiene un contrato medible. Fuentes documentales de referencia no se marcan incompletas por no tener filas en staging. Flags y fechas futuras son señales de revisión, no prueba automática de error.'},
    })
  }catch(error){
    console.error('canonical_source_health_failed',error instanceof Error?error.message:'unknown')
    return res.status(503).json({ok:false,error:'No fue posible calcular salud de fuentes canónicas'})
  }
}

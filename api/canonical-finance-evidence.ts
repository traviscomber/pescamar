import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
const first=(value:unknown)=>Array.isArray(value)&&value.length?value[0]:null

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 try{
  const operator=await requireOperator(req,['admin','finance','operations'])
  if(!operator)return res.status(403).json({ok:false,error:'Permisos insuficientes'})
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
  const sql=getSql()
  const [ledgerRaw,transfersRaw,matchesRaw]=await Promise.all([
   sql`select count(*)::int rows,
    count(*) filter(where event_date is not null and (coalesce(inflow_clp,0)<>0 or coalesce(outflow_clp,0)<>0))::int transactional_rows,
    count(*) filter(where event_date is null and (coalesce(inflow_clp,0)<>0 or coalesce(outflow_clp,0)<>0))::int amount_without_date_rows,
    count(*) filter(where event_date is not null and coalesce(inflow_clp,0)=0 and coalesce(outflow_clp,0)=0)::int dated_zero_rows,
    count(*) filter(where event_date is null and coalesce(inflow_clp,0)=0 and coalesce(outflow_clp,0)=0)::int reference_rows,
    count(*) filter(where cardinality(data_quality_flags)>0)::int flagged,
    coalesce(sum(inflow_clp) filter(where event_date is not null and (coalesce(inflow_clp,0)<>0 or coalesce(outflow_clp,0)<>0)),0)::numeric inflow_clp,
    coalesce(sum(outflow_clp) filter(where event_date is not null and (coalesce(inflow_clp,0)<>0 or coalesce(outflow_clp,0)<>0)),0)::numeric outflow_clp,
    (coalesce(sum(inflow_clp) filter(where event_date is not null and (coalesce(inflow_clp,0)<>0 or coalesce(outflow_clp,0)<>0)),0)-coalesce(sum(outflow_clp) filter(where event_date is not null and (coalesce(inflow_clp,0)<>0 or coalesce(outflow_clp,0)<>0)),0))::numeric recomputed_delta_clp,
    (array_agg(balance_clp order by source_row desc))[1] source_final_balance_clp,
    min(event_date) filter(where event_date is not null and (coalesce(inflow_clp,0)<>0 or coalesce(outflow_clp,0)<>0)) first_date,
    max(event_date) filter(where event_date is not null and (coalesce(inflow_clp,0)<>0 or coalesce(outflow_clp,0)<>0)) last_date
    from canonical_account_entries`,
   sql`select count(*)::int rows,count(*) filter(where cardinality(data_quality_flags)>0)::int flagged,coalesce(sum(amount_clp),0)::numeric amount_clp,min(event_date) first_date,max(event_date) last_date from canonical_transfers_received`,
   sql`with candidates as (select t.source_file_hash,t.sheet_name,t.source_row,t.event_date,t.amount_clp,count(a.source_row)::int candidate_count from canonical_transfers_received t left join canonical_account_entries a on a.event_date=t.event_date and a.inflow_clp=t.amount_clp and a.event_date is not null and coalesce(a.inflow_clp,0)<>0 group by t.source_file_hash,t.sheet_name,t.source_row,t.event_date,t.amount_clp) select count(*)::int transfers,count(*) filter(where candidate_count=1)::int exact_matches,count(*) filter(where candidate_count=0)::int unmatched,count(*) filter(where candidate_count>1)::int ambiguous,coalesce(sum(amount_clp) filter(where candidate_count=1),0)::numeric exact_match_amount_clp from candidates`
  ])
  return res.status(200).json({ok:true,ledger:first(ledgerRaw),transfers:first(transfersRaw),matching:first(matchesRaw),governance:{mode:'evidence_only',writesCredits:false,writesSettlements:false,movementRule:'Sólo una fila fechada con entrada o salida distinta de cero se considera movimiento transaccional.',balanceRule:'El saldo operativo no se toma del valor cacheado del workbook. Se expone recomputed_delta_clp como entradas menos salidas transaccionales; source_final_balance_clp queda sólo como evidencia de origen.',rule:'CUENTA2 permanece como evidencia canónica. Filas sin fecha, filas fechadas sin movimiento y filas de referencia quedan fuera de la economía transaccional. Una coincidencia fecha+monto sólo se informa cuando es única; nunca crea créditos, liquidaciones ni pagos.'}})
 }catch(error){const message=error instanceof Error?error.message:'';return res.status(message.includes('canonical_')?503:500).json({ok:false,error:message.includes('canonical_')?'Falta aplicar la capa canónica':'No fue posible cargar evidencia financiera canónica'})}
}

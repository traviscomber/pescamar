import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
const first=(value:unknown)=>Array.isArray(value)&&value.length?value[0] as Record<string,unknown>:{}

export default async function handler(req:Request,res:Response){
  res.setHeader('Cache-Control','no-store')
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
  try{
    const operator=await requireOperator(req,['admin','operations','finance','quality'])
    if(!operator)return res.status(403).json({ok:false,error:'Permisos insuficientes'})
    const sql=getSql()
    const [productionRaw,ledgerRaw,packingRaw,stockRaw,transferRaw,sourceRaw]=await Promise.all([
      sql`select
        count(*)::int rows,
        count(*) filter(where cardinality(coalesce(data_quality_flags,array[]::text[]))>0)::int flagged,
        count(*) filter(where reception_date is not null and process_date is not null and process_date<reception_date)::int process_before_reception,
        count(*) filter(where process_date is not null and production_date is not null and production_date<process_date)::int production_before_process,
        count(*) filter(where reception_date is not null and production_date is not null and production_date<reception_date)::int production_before_reception,
        count(*) filter(where reception_date is null)::int missing_reception_date,
        count(*) filter(where process_date is null)::int missing_process_date,
        count(*) filter(where production_date is null)::int missing_production_date,
        count(*) filter(where received_kg is null)::int missing_received_kg,
        count(*) filter(where guide_price_clp is null)::int missing_guide_price,
        count(*) filter(where guide_number is null or lower(trim(guide_number)) in ('s/g','sin guia'))::int missing_or_nonstandard_guide,
        count(*) filter(where supplier_original is distinct from supplier_name)::int supplier_alias_rows
      from historical_production_records where record_status='operational'`,
      sql`with classified as (
        select *,event_date is not null and (inflow_clp is not null or outflow_clp is not null) as is_movement
        from canonical_account_entries
      ), recomputed as (
        select *,sum(coalesce(inflow_clp,0)-coalesce(outflow_clp,0)) over(partition by source_file_hash order by source_row rows unbounded preceding) recomputed_balance
        from classified
      )
      select
        count(*)::int source_rows,
        count(*) filter(where is_movement)::int movement_rows,
        count(*) filter(where not is_movement)::int reference_rows,
        count(*) filter(where event_date is null and inflow_clp is null and outflow_clp is null)::int pure_summary_rows,
        count(*) filter(where is_movement and cardinality(coalesce(data_quality_flags,array[]::text[]))>0)::int flagged_movements,
        count(*) filter(where is_movement and abs(coalesce(balance_clp,0)-coalesce(recomputed_balance,0))>0.01)::int canonical_balance_mismatch_rows,
        max(abs(coalesce(balance_clp,0)-coalesce(recomputed_balance,0))) filter(where is_movement)::numeric max_balance_diff_clp,
        max(source_row) filter(where is_movement)::int last_movement_source_row,
        (array_agg(balance_clp order by source_row desc) filter(where is_movement))[1] final_recomputed_balance_clp
      from recomputed`,
      sql`select
        count(*)::int boxes,
        coalesce(sum(total_kg),0)::numeric kg,
        count(*) filter(where lot_code is null or trim(lot_code)='')::int missing_lot_boxes,
        coalesce(sum(total_kg) filter(where lot_code is null or trim(lot_code)=''),0)::numeric missing_lot_kg,
        count(*) filter(where production_date is null)::int missing_production_date,
        count(*) filter(where cardinality(coalesce(data_quality_flags,array[]::text[]))>0)::int flagged
      from canonical_packing_boxes`,
      sql`select count(*)::int rows,count(*) filter(where cardinality(coalesce(data_quality_flags,array[]::text[]))>0)::int flagged,count(*) filter(where event_date is null)::int missing_date from canonical_stock_records`,
      sql`select count(*)::int rows,count(*) filter(where cardinality(coalesce(data_quality_flags,array[]::text[]))>0)::int flagged,count(*) filter(where event_date is null)::int missing_date,count(*) filter(where amount_clp is null)::int missing_amount from canonical_transfers_received`,
      sql`select count(*)::int canonical_sources,count(*) filter(where period_end is not null)::int dated_sources,max(period_end) latest_period_end from canonical_source_files where canonical`
    ])
    const production=first(productionRaw),ledger=first(ledgerRaw),packing=first(packingRaw),stock=first(stockRaw),transfers=first(transferRaw),sources=first(sourceRaw)
    const blockers=[] as string[]
    const reviews=[] as string[]
    if(Number(ledger.canonical_balance_mismatch_rows??0)>0)blockers.push('canonical_balance_mismatch')
    if(Number(production.process_before_reception??0)+Number(production.production_before_process??0)+Number(production.production_before_reception??0)>0)reviews.push('production_date_sequence')
    if(Number(production.missing_guide_price??0)>0)reviews.push('production_guide_price_coverage')
    if(Number(production.missing_or_nonstandard_guide??0)>0)reviews.push('production_guide_lineage')
    if(Number(packing.missing_lot_boxes??0)>0)reviews.push('packing_lot_traceability')
    if(Number(ledger.reference_rows??0)>0)reviews.push('ledger_reference_rows')
    return res.status(200).json({
      ok:true,
      schemaVersion:'seafood.canonical.quality.v1',
      generatedAt:new Date().toISOString(),
      readOnly:true,
      promotionToLive:'blocked_without_deterministic_reconciliation',
      datasets:{production,ledger,packing,stock,transfers,sources},
      assessment:{blockers,reviews,status:blockers.length?'blocked':reviews.length?'review_required':'clean'},
      rules:{
        ledgerMovement:'dated row with inflow or outflow',
        ledgerBalance:'recomputed from inflow minus outflow in source-row order per source file; differences <= CLP 0.01 are numeric noise; cached workbook balance is evidence only',
        packing:'canonical boxes remain historical/imported evidence until deterministic lot reconciliation; never create live packing implicitly',
        production:'date, guide, supplier and price gaps remain explicit quality evidence; never backfill live receptions from ambiguous history'
      }
    })
  }catch(error){
    const message=error instanceof Error?error.message:''
    const canonical=message.includes('canonical_')||message.includes('historical_production')
    return res.status(canonical?503:500).json({ok:false,error:canonical?'Falta aplicar la capa canónica':'No fue posible evaluar calidad canónica'})
  }
}

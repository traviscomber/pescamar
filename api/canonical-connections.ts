import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
const first=(value:unknown)=>Array.isArray(value)&&value.length?value[0] as Record<string,unknown>:{}

export default async function handler(req:Request,res:Response){
  res.setHeader('Cache-Control','no-store')
  try{
    const operator=await requireOperator(req,['admin','operations','finance'])
    if(!operator)return res.status(403).json({ok:false,error:'Permisos insuficientes'})
    if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
    const sql=getSql()
    const [productionRaw,partiesRaw,packingRaw,financeRaw,stockRaw]=await Promise.all([
      sql`with contexts as (
        select source_file_hash,lower(trim(coalesce(lot_code,''))) lot_key,trim(coalesce(guide_number,'')) guide_key,lower(trim(coalesce(supplier_name,''))) supplier_key,guide_kg,received_kg,count(*)::int n
        from historical_production_records where record_status='operational'
        group by source_file_hash,lower(trim(coalesce(lot_code,''))),trim(coalesce(guide_number,'')),lower(trim(coalesce(supplier_name,''))),guide_kg,received_kg
      ), scored as (
        select h.*,coalesce(c.n,1)>1 non_unique_context,cardinality(coalesce(h.data_quality_flags,array[]::text[]))>0 flagged
        from historical_production_records h left join contexts c on c.source_file_hash=h.source_file_hash and c.lot_key=lower(trim(coalesce(h.lot_code,''))) and c.guide_key=trim(coalesce(h.guide_number,'')) and c.supplier_key=lower(trim(coalesce(h.supplier_name,''))) and c.guide_kg is not distinct from h.guide_kg and c.received_kg is not distinct from h.received_kg
        where h.record_status='operational'
      ) select count(*)::int total,
        count(*) filter(where not non_unique_context and received_kg is not null)::int reception_ready,
        count(*) filter(where not non_unique_context and not flagged and received_kg is not null and reception_date is not null and process_date is not null and production_date is not null)::int timing_ready,
        count(*) filter(where not non_unique_context and received_kg is not null and grade_breakdown is not null and grade_breakdown<>'{}'::jsonb)::int quality_ready,
        count(*) filter(where non_unique_context or flagged)::int review_required,
        count(*) filter(where non_unique_context)::int non_unique_context_rows,
        (select count(*)::int from contexts where n>1)::int non_unique_contexts,
        count(*) filter(where flagged)::int flagged,
        count(*) filter(where 'production_before_process'=any(coalesce(data_quality_flags,array[]::text[])))::int production_before_process,
        count(*) filter(where 'date_sequence_inconsistent'=any(coalesce(data_quality_flags,array[]::text[])))::int date_sequence_inconsistent,
        count(*) filter(where 'missing_process_date'=any(coalesce(data_quality_flags,array[]::text[])))::int missing_process_date,
        count(*) filter(where 'missing_reception_date'=any(coalesce(data_quality_flags,array[]::text[])))::int missing_reception_date,
        count(*) filter(where 'missing_received_kg'=any(coalesce(data_quality_flags,array[]::text[])))::int missing_received_kg,
        count(*) filter(where 'process_before_reception'=any(coalesce(data_quality_flags,array[]::text[])))::int process_before_reception,
        count(*) filter(where 'production_before_reception'=any(coalesce(data_quality_flags,array[]::text[])))::int production_before_reception,
        count(*) filter(where 'yield_formula_error'=any(coalesce(data_quality_flags,array[]::text[])))::int yield_formula_error,
        count(*) filter(where production_date is null)::int missing_production_date,
        count(*) filter(where grade_breakdown is null or grade_breakdown='{}'::jsonb)::int missing_grade_breakdown
      from scored`,
      sql`with suppliers as (select distinct supplier_name from historical_production_records where record_status='operational' and nullif(trim(coalesce(supplier_name,'')),'') is not null), matches as (
        select s.supplier_name,count(p.id)::int party_matches from suppliers s left join parties p on p.kind='supplier'::party_kind and lower(trim(p.legal_name))=lower(trim(s.supplier_name)) group by s.supplier_name
      ) select count(*)::int suppliers,count(*) filter(where party_matches=1)::int exact,count(*) filter(where party_matches=0)::int missing,count(*) filter(where party_matches>1)::int ambiguous from matches`,
      sql`with packed as (
        select lot_code,min(production_date) first_date,max(production_date) last_date from canonical_packing_boxes where lot_code is not null group by lot_code
      ), produced as (
        select distinct lot_code from historical_production_records where record_status='operational' and lot_code is not null
      ), coverage as (
        select max(event_date) last_date from historical_production_records where record_status='operational'
      ), totals as (
        select count(*)::int boxes,count(*) filter(where lot_code is not null)::int lot_referenced_boxes,count(*) filter(where lot_code is null)::int unreferenced_boxes,coalesce(sum(total_kg),0)::numeric kg,coalesce(sum(total_kg) filter(where lot_code is null),0)::numeric unreferenced_kg,min(production_date) packing_first_date,max(production_date) packing_last_date from canonical_packing_boxes
      ), source as (
        select case when bool_or(lower(s.source_kind) like '%octopus%') then 'pulpo' when bool_or(lower(s.source_kind) like '%urchin%') then 'erizo' else null end product_family
        from canonical_source_files s join canonical_packing_boxes b on b.source_file_hash=s.file_hash where s.canonical
      )
      select count(*)::int lots,count(*) filter(where p.lot_code is not null)::int exact_lots,count(*) filter(where p.lot_code is null)::int unmatched_lots,
        count(*) filter(where p.lot_code is null and (c.last_date is null or x.last_date>c.last_date))::int outside_coverage_lots,
        count(*) filter(where p.lot_code is null and c.last_date is not null and x.last_date<=c.last_date)::int unresolved_within_coverage_lots,
        t.boxes,t.lot_referenced_boxes,t.unreferenced_boxes,t.kg,t.unreferenced_kg,c.last_date upstream_last_date,t.packing_first_date,t.packing_last_date,s.product_family
      from packed x cross join coverage c cross join totals t cross join source s left join produced p on p.lot_code=x.lot_code
      group by c.last_date,t.boxes,t.lot_referenced_boxes,t.unreferenced_boxes,t.kg,t.unreferenced_kg,t.packing_first_date,t.packing_last_date,s.product_family`,
      sql`with ledger as (
        select *,event_date is not null and (inflow_clp is not null or outflow_clp is not null) as is_movement
        from canonical_account_entries
      ), ledger_stats as (
        select count(*)::int ledger_source_rows,
          count(*) filter(where is_movement)::int ledger_movement_rows,
          count(*) filter(where not is_movement)::int ledger_reference_rows,
          count(*) filter(where event_date is null and inflow_clp is null and outflow_clp is null)::int ledger_summary_rows,
          count(*) filter(where is_movement and cardinality(coalesce(data_quality_flags,array[]::text[]))>0)::int ledger_flagged_movements
        from ledger
      ), direct as (
        select t.source_file_hash,t.sheet_name,t.source_row,t.event_date,t.bank,t.sender,t.amount_clp,count(a.source_row)::int direct_candidates
        from canonical_transfers_received t left join ledger a on a.is_movement and a.event_date=t.event_date and a.inflow_clp=t.amount_clp
        group by t.source_file_hash,t.sheet_name,t.source_row,t.event_date,t.bank,t.sender,t.amount_clp
      ), direct_exact_keys as (
        select distinct event_date,amount_clp from direct where direct_candidates=1
      ), unmatched_groups as (
        select event_date,bank,sender,count(*)::int transfer_rows,sum(amount_clp)::numeric group_amount
        from direct where direct_candidates=0 group by event_date,bank,sender
      ), group_candidates as (
        select g.event_date,g.bank,g.sender,g.transfer_rows,g.group_amount,count(a.source_row)::int group_candidates
        from unmatched_groups g left join ledger a on a.is_movement and a.event_date=g.event_date and a.inflow_clp=g.group_amount
          and not exists(select 1 from direct_exact_keys d where d.event_date=g.event_date and d.amount_clp=g.group_amount)
        group by g.event_date,g.bank,g.sender,g.transfer_rows,g.group_amount
      ) select
        (select count(*) from direct)::int transfers,
        (select count(*) from direct where direct_candidates=1)::int direct_exact_transfers,
        coalesce(sum(transfer_rows) filter(where group_candidates=1),0)::int grouped_exact_transfers,
        count(*) filter(where group_candidates=1)::int grouped_exact_groups,
        ((select count(*) from direct where direct_candidates=1)+coalesce(sum(transfer_rows) filter(where group_candidates=1),0))::int matched_transfers,
        coalesce(sum(transfer_rows) filter(where group_candidates=0),0)::int unmatched,
        ((select count(*) from direct where direct_candidates>1)+coalesce(sum(transfer_rows) filter(where group_candidates>1),0))::int ambiguous,
        ls.ledger_source_rows,ls.ledger_movement_rows,ls.ledger_reference_rows,ls.ledger_summary_rows,ls.ledger_flagged_movements
      from group_candidates cross join ledger_stats ls
      group by ls.ledger_source_rows,ls.ledger_movement_rows,ls.ledger_reference_rows,ls.ledger_summary_rows,ls.ledger_flagged_movements`,
      sql`select count(*)::int rows,count(*) filter(where cardinality(coalesce(data_quality_flags,array[]::text[]))>0)::int flagged,coalesce(sum(total_kg),0)::numeric kg from canonical_stock_records`
    ])
    const finance=first(financeRaw)
    return res.status(200).json({
      ok:true,
      connections:{
        production:{...first(productionRaw),target:'Recepciones / Calidad / Producción',mode:'eligible_evidence'},
        parties:{...first(partiesRaw),target:'Proveedores y clientes',mode:'exact_identity_only'},
        packing:{...first(packingRaw),target:'Lotes / Inventario',mode:'exact_lot_only'},
        finance:{...finance,target:'Finanzas',mode:'unique_date_amount_or_group_total',grouping_rule:'same_date_bank_sender_to_unique_unclaimed_inflow_total'},
        stock:{...first(stockRaw),target:'Inventario',mode:'staging_only'}
      },
      governance:{promotion:'blocked',writesLive:false,rule:`Las conexiones se calculan desde evidencia canónica. En CUENTA2, sólo una fila fechada con entrada o salida monetaria cuenta como movimiento financiero; ${Number(finance.ledger_reference_rows??0)} filas quedan preservadas como referencia y ${Number(finance.ledger_summary_rows??0)} son resúmenes sin fecha ni monto. El saldo canónico se recompone desde entradas/salidas y no confía en fórmulas de saldo faltantes del workbook. Revisión significa contradicción, flag de calidad o contexto base no único. Varias filas que comparten lote, guía, proveedor y kilos no se deduplican automáticamente. En finanzas, un grupo sólo se concilia cuando transferencias no emparejadas de la misma fecha, banco y remitente suman exactamente una única entrada contable no reclamada. Este endpoint no crea transacciones live.`}
    })
  }catch(error){
    const message=error instanceof Error?error.message:''
    return res.status(message.includes('canonical_')||message.includes('historical_production')?503:500).json({ok:false,error:message.includes('canonical_')||message.includes('historical_production')?'Falta aplicar la capa canónica':'No fue posible calcular conexiones canónicas'})
  }
}

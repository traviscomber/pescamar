import {neon} from '@neondatabase/serverless'

if(process.env.VERCEL!=='1'){
  console.log('[canonical-intelligence] skipped outside Vercel')
  process.exit(0)
}
const databaseUrl=process.env.DATABASE_URL
if(!databaseUrl)throw new Error('[canonical-intelligence] DATABASE_URL is not configured')
const sql=neon(databaseUrl)
const sources=await sql.query(`select file_name,source_kind,record_count from canonical_source_files where canonical order by file_name`,[])
const production=await sql.query(`with base as (
 select h.*,
  coalesce((h.grade_breakdown->'A1'->>'kg')::numeric,0)+coalesce((h.grade_breakdown->'A2'->>'kg')::numeric,0)+
  coalesce((h.grade_breakdown->'Vj100'->>'kg')::numeric,0)+coalesce((h.grade_breakdown->'Vj50'->>'kg')::numeric,0)+
  coalesce((h.grade_breakdown->'C1'->>'kg')::numeric,0)+coalesce((h.grade_breakdown->'C2'->>'kg')::numeric,0)+
  coalesce((h.grade_breakdown->'D'->>'kg')::numeric,0)+coalesce((h.grade_breakdown->'PT'->>'kg')::numeric,0)+coalesce((h.grade_breakdown->'R'->>'kg')::numeric,0) reported_output_kg
 from historical_production_records h
 where h.record_status='operational' and h.source_file_hash in(select file_hash from canonical_source_files where canonical and (source_kind='production' or file_name ilike '%produccion 2026%'))
) select count(*)::int rows,round(coalesce(sum(guide_kg),0),1) guide_kg,round(coalesce(sum(received_kg),0),1) received_kg,
 count(*) filter(where cardinality(data_quality_flags)>0)::int flagged,count(*) filter(where guide_price_clp is not null)::int priced_rows,
 count(*) filter(where received_kg>0 and reported_output_kg>received_kg)::int mass_inconsistent_rows from base`,[])
const packing=await sql.query(`select pack_format,count(*)::int boxes,round(coalesce(sum(total_kg),0),1) kg,count(distinct lot_code) filter(where lot_code is not null)::int lots,count(*) filter(where cardinality(data_quality_flags)>0)::int flagged from canonical_packing_boxes b join canonical_source_files s on s.file_hash=b.source_file_hash and s.canonical group by pack_format order by pack_format`,[])
const stock=await sql.query(`select product_family,count(*)::int rows,round(coalesce(sum(total_kg),0),1) observed_net_kg,count(*) filter(where cardinality(data_quality_flags)>0)::int flagged from canonical_stock_records r join canonical_source_files s on s.file_hash=r.source_file_hash and s.canonical group by product_family order by product_family`,[])
const ledger=await sql.query(`select count(*)::int rows,round(coalesce(sum(inflow_clp),0),0) inflow_clp,round(coalesce(sum(outflow_clp),0),0) outflow_clp,(array_agg(balance_clp order by source_row desc))[1] final_balance_clp,count(*) filter(where cardinality(data_quality_flags)>0)::int flagged from canonical_account_entries a join canonical_source_files s on s.file_hash=a.source_file_hash and s.canonical`,[])
console.log('[canonical-intelligence] sources',JSON.stringify(sources))
console.log('[canonical-intelligence] production',JSON.stringify(production[0]??{}))
console.log('[canonical-intelligence] packing',JSON.stringify(packing))
console.log('[canonical-intelligence] stock',JSON.stringify(stock))
console.log('[canonical-intelligence] ledger',JSON.stringify(ledger[0]??{}))
console.log('[canonical-intelligence] verified')

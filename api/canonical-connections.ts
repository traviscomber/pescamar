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
        select h.*,coalesce(c.n,1)>1 duplicate_context,cardinality(coalesce(h.data_quality_flags,array[]::text[]))>0 flagged
        from historical_production_records h left join contexts c on c.source_file_hash=h.source_file_hash and c.lot_key=lower(trim(coalesce(h.lot_code,''))) and c.guide_key=trim(coalesce(h.guide_number,'')) and c.supplier_key=lower(trim(coalesce(h.supplier_name,''))) and c.guide_kg is not distinct from h.guide_kg and c.received_kg is not distinct from h.received_kg
        where h.record_status='operational'
      ) select count(*)::int total,
        count(*) filter(where not duplicate_context and received_kg is not null)::int reception_ready,
        count(*) filter(where not duplicate_context and not flagged and received_kg is not null and reception_date is not null and process_date is not null and production_date is not null)::int timing_ready,
        count(*) filter(where not duplicate_context and received_kg is not null and grade_breakdown is not null and grade_breakdown<>'{}'::jsonb)::int quality_ready,
        count(*) filter(where duplicate_context or flagged)::int review_required
      from scored`,
      sql`with suppliers as (select distinct supplier_name from historical_production_records where record_status='operational' and nullif(trim(coalesce(supplier_name,'')),'') is not null), matches as (
        select s.supplier_name,count(p.id)::int party_matches from suppliers s left join parties p on p.kind='supplier'::party_kind and lower(trim(p.legal_name))=lower(trim(s.supplier_name)) group by s.supplier_name
      ) select count(*)::int suppliers,count(*) filter(where party_matches=1)::int exact,count(*) filter(where party_matches=0)::int missing,count(*) filter(where party_matches>1)::int ambiguous from matches`,
      sql`with packed as (select lot_code,count(*)::int boxes,coalesce(sum(total_kg),0)::numeric kg from canonical_packing_boxes where lot_code is not null group by lot_code), produced as (select distinct lot_code from historical_production_records where record_status='operational' and lot_code is not null) select count(*)::int lots,count(*) filter(where p.lot_code is not null)::int exact_lots,count(*) filter(where p.lot_code is null)::int unmatched_lots,coalesce(sum(x.boxes),0)::int boxes,coalesce(sum(x.kg),0)::numeric kg from packed x left join produced p on p.lot_code=x.lot_code`,
      sql`with candidates as (select t.source_file_hash,t.sheet_name,t.source_row,count(a.source_row)::int candidate_count from canonical_transfers_received t left join canonical_account_entries a on a.event_date=t.event_date and a.inflow_clp=t.amount_clp group by t.source_file_hash,t.sheet_name,t.source_row) select count(*)::int transfers,count(*) filter(where candidate_count=1)::int exact,count(*) filter(where candidate_count=0)::int unmatched,count(*) filter(where candidate_count>1)::int ambiguous from candidates`,
      sql`select count(*)::int rows,count(*) filter(where cardinality(coalesce(data_quality_flags,array[]::text[]))>0)::int flagged,coalesce(sum(total_kg),0)::numeric kg from canonical_stock_records`
    ])
    return res.status(200).json({
      ok:true,
      connections:{
        production:{...first(productionRaw),target:'Recepciones / Calidad / Producción',mode:'eligible_evidence'},
        parties:{...first(partiesRaw),target:'Proveedores y clientes',mode:'exact_identity_only'},
        packing:{...first(packingRaw),target:'Lotes / Inventario',mode:'exact_lot_only'},
        finance:{...first(financeRaw),target:'Finanzas',mode:'unique_date_amount_only'},
        stock:{...first(stockRaw),target:'Inventario',mode:'staging_only'}
      },
      governance:{promotion:'blocked',writesLive:false,rule:'Las conexiones se calculan desde evidencia canónica. Coincidencias ambiguas o con flags permanecen en revisión; este endpoint no crea transacciones live.'}
    })
  }catch(error){
    const message=error instanceof Error?error.message:''
    return res.status(message.includes('canonical_')||message.includes('historical_production')?503:500).json({ok:false,error:message.includes('canonical_')||message.includes('historical_production')?'Falta aplicar la capa canónica':'No fue posible calcular conexiones canónicas'})
  }
}

import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type LinkageStatus='matched'|'outside_upstream_coverage'|'unmatched_within_coverage'
const rows=(value:unknown)=>Array.isArray(value)?value:[]
const text=(value:unknown)=>String(value??'').trim()
const productFamily=(sourceKind:unknown)=>{const kind=text(sourceKind).toLowerCase();if(kind.includes('octopus'))return 'pulpo';if(kind.includes('urchin'))return 'erizo';return null}

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 try{
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
  const sql=getSql()
  const [stockRaw,packingRaw,lotLinksRaw,packingSourcesRaw,upstreamRaw]=await Promise.all([
   sql`select product_family,count(*)::int rows,count(*) filter(where cardinality(data_quality_flags)>0)::int flagged,coalesce(sum(total_kg),0)::numeric net_kg,min(event_date) first_date,max(event_date) last_date from canonical_stock_records group by product_family order by product_family`,
   sql`select pack_format,count(*)::int boxes,count(*) filter(where cardinality(data_quality_flags)>0)::int flagged,coalesce(sum(total_kg),0)::numeric kg,count(distinct lot_code) filter(where lot_code is not null)::int lots,min(production_date) first_date,max(production_date) last_date from canonical_packing_boxes group by pack_format order by pack_format`,
   sql`with packed as (
      select lot_code,count(*)::int boxes,coalesce(sum(total_kg),0)::numeric packing_kg,min(production_date) first_packing_date,max(production_date) last_packing_date
      from canonical_packing_boxes where lot_code is not null group by lot_code
    ),produced as (
      select lot_code,count(*)::int production_rows,min(event_date) first_reception_date,max(event_date) last_reception_date
      from historical_production_records where record_status='operational' and lot_code is not null group by lot_code
    ),coverage as (
      select min(event_date) first_date,max(event_date) last_date,count(*)::int rows,count(*) filter(where lot_code is not null)::int rows_with_lot
      from historical_production_records where record_status='operational'
    )
    select p.lot_code,p.boxes,p.packing_kg,p.first_packing_date,p.last_packing_date,coalesce(h.production_rows,0)::int production_rows,h.first_reception_date,h.last_reception_date,(h.lot_code is not null) exact_lot_match,
      case when h.lot_code is not null then 'matched' when c.last_date is null or p.last_packing_date>c.last_date then 'outside_upstream_coverage' else 'unmatched_within_coverage' end linkage_status
    from packed p cross join coverage c left join produced h on h.lot_code=p.lot_code
    order by p.last_packing_date desc nulls last,p.lot_code`,
   sql`select s.file_name,s.source_kind,s.period_start declared_start,s.period_end declared_end,min(p.production_date) observed_start,max(p.production_date) observed_end,count(*)::int observed_rows,count(*) filter(where p.lot_code is not null)::int rows_with_lot,count(distinct p.lot_code) filter(where p.lot_code is not null)::int lots,(s.period_start is distinct from min(p.production_date) or s.period_end is distinct from max(p.production_date)) metadata_period_mismatch
    from canonical_source_files s join canonical_packing_boxes p on p.source_file_hash=s.file_hash where s.canonical
    group by s.file_name,s.source_kind,s.period_start,s.period_end order by max(p.production_date) desc`,
   sql`select min(event_date) first_date,max(event_date) last_date,count(*)::int rows,count(*) filter(where lot_code is not null)::int rows_with_lot from historical_production_records where record_status='operational'`
  ])
  const stock=rows(stockRaw),packing=rows(packingRaw),lotLinks=rows(lotLinksRaw),upstream=rows(upstreamRaw)[0]??null
  const packingSources=rows(packingSourcesRaw).map(row=>{const item=row as Record<string,unknown>;return {...item,product_family:productFamily(item.source_kind)}})
  const statusOf=(row:unknown)=>(row as {linkage_status?:LinkageStatus}).linkage_status
  const matchedLots=lotLinks.filter(row=>statusOf(row)==='matched').length
  const outsideCoverageLots=lotLinks.filter(row=>statusOf(row)==='outside_upstream_coverage').length
  const unresolvedWithinCoverageLots=lotLinks.filter(row=>statusOf(row)==='unmatched_within_coverage').length
  return res.status(200).json({
   ok:true,stock,packing,lotLinks,packingSources,
   upstreamCoverage:upstream?{source:'historical_production_records',...upstream}:null,
   summary:{stockRows:stock.reduce((sum,row)=>sum+Number((row as {rows?:unknown}).rows??0),0),packingBoxes:packing.reduce((sum,row)=>sum+Number((row as {boxes?:unknown}).boxes??0),0),packingKg:packing.reduce((sum,row)=>sum+Number((row as {kg?:unknown}).kg??0),0),packingLots:lotLinks.length,matchedLots,unmatchedLots:lotLinks.length-matchedLots,outsideCoverageLots,unresolvedWithinCoverageLots},
   governance:{mode:'evidence_only',writesLiveInventory:false,linkageRule:'match_exact_or_hold',rule:'El packing canónico permanece separado del inventario live. Un lote sólo se considera conciliado por código exacto. Si su fecha queda fuera de la cobertura de producción upstream, se marca fuera de cobertura y no se propone un vínculo por fecha.'}
  })
 }catch(error){const message=error instanceof Error?error.message:'';return res.status(message.includes('canonical_')||message.includes('historical_production')?503:500).json({ok:false,error:message.includes('canonical_')||message.includes('historical_production')?'Falta aplicar la capa canónica':'No fue posible cargar evidencia canónica de inventario'})}
}

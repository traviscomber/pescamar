import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
const rows=(value:unknown)=>Array.isArray(value)?value:[]

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 try{
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
  const sql=getSql()
  const [stockRaw,packingRaw,lotLinksRaw]=await Promise.all([
   sql`select product_family,count(*)::int rows,count(*) filter(where cardinality(data_quality_flags)>0)::int flagged,coalesce(sum(total_kg),0)::numeric net_kg,min(event_date) first_date,max(event_date) last_date from canonical_stock_records group by product_family order by product_family`,
   sql`select pack_format,count(*)::int boxes,count(*) filter(where cardinality(data_quality_flags)>0)::int flagged,coalesce(sum(total_kg),0)::numeric kg,count(distinct lot_code) filter(where lot_code is not null)::int lots,min(production_date) first_date,max(production_date) last_date from canonical_packing_boxes group by pack_format order by pack_format`,
   sql`with packed as (select lot_code,count(*)::int boxes,coalesce(sum(total_kg),0)::numeric packing_kg,min(production_date) first_packing_date,max(production_date) last_packing_date from canonical_packing_boxes where lot_code is not null group by lot_code),produced as (select lot_code,count(*)::int production_rows,min(event_date) first_reception_date,max(event_date) last_reception_date from historical_production_records where record_status='operational' and lot_code is not null group by lot_code) select p.lot_code,p.boxes,p.packing_kg,p.first_packing_date,p.last_packing_date,coalesce(h.production_rows,0)::int production_rows,h.first_reception_date,h.last_reception_date,(h.lot_code is not null) exact_lot_match from packed p left join produced h on h.lot_code=p.lot_code order by p.last_packing_date desc nulls last,p.lot_code`
  ])
  const stock=rows(stockRaw),packing=rows(packingRaw),lotLinks=rows(lotLinksRaw)
  const matchedLots=lotLinks.filter(row=>Boolean((row as {exact_lot_match?:unknown}).exact_lot_match)).length
  return res.status(200).json({ok:true,stock,packing,lotLinks,summary:{stockRows:stock.reduce((sum,row)=>sum+Number((row as {rows?:unknown}).rows??0),0),packingBoxes:packing.reduce((sum,row)=>sum+Number((row as {boxes?:unknown}).boxes??0),0),packingKg:packing.reduce((sum,row)=>sum+Number((row as {kg?:unknown}).kg??0),0),packingLots:lotLinks.length,matchedLots,unmatchedLots:lotLinks.length-matchedLots},governance:{mode:'evidence_only',writesLiveInventory:false,rule:'Stock y packing canónicos se muestran como evidencia hasta que una conciliación determinística sea aprobada. No crean ubicaciones ni movimientos live.'}})
 }catch(error){const message=error instanceof Error?error.message:'';return res.status(message.includes('canonical_')||message.includes('historical_production')?503:500).json({ok:false,error:message.includes('canonical_')||message.includes('historical_production')?'Falta aplicar la capa canónica':'No fue posible cargar evidencia canónica de inventario'})}
}

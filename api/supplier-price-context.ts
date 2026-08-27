import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;url?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type PriceRow={supplier:string;observations:string|number;received_kg:string|number;avg_price_clp:string|number|null;latest_price_clp:string|number|null;min_price_clp:string|number|null;max_price_clp:string|number|null}
type ZoneRow={supplier:string;zone:string;observations:string|number;received_kg:string|number;supplier_zone_avg_price_clp:string|number|null;zone_avg_price_clp:string|number|null}
const clean=(value:string)=>value.trim().replace(/\s+/g,' ').slice(0,180)
const n=(value:unknown)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:null}
export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 try{
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
  const url=new URL(`http://pescamar.local${req.url??''}`),supplier=clean(url.searchParams.get('supplier')??''),zone=clean(url.searchParams.get('zone')??'')
  if(supplier.length<2)return res.status(200).json({ok:true,matched:false,suggestions:[]})
  const sql=getSql()
  const suggestionsRaw=await sql`select supplier,count(*) lots from historical_supplier_intelligence where lower(supplier) like ${`%${supplier.toLowerCase()}%`} group by supplier order by count(*) desc,supplier limit 5`
  const suggestions=(Array.isArray(suggestionsRaw)?suggestionsRaw:[]).map(row=>String((row as {supplier?:unknown}).supplier??'')).filter(Boolean)
  const matched=suggestions.find(name=>name.toLocaleLowerCase('es')===supplier.toLocaleLowerCase('es'))??null
  if(!matched)return res.status(200).json({ok:true,matched:false,suggestions})
  const [priceRaw,zoneRaw]=await Promise.all([
   sql`with base as (
    select coalesce(nullif(btrim(supplier_name),''),nullif(btrim(supplier_original),'')) supplier,event_date,received_kg,guide_price_clp
    from historical_production_records
    where record_status='operational' and guide_price_clp is not null and guide_price_clp>0 and received_kg is not null and received_kg>0
   ), ranked as (
    select *,row_number() over(partition by lower(supplier) order by event_date desc nulls last) rn from base where lower(supplier)=lower(${matched})
   )
   select supplier,count(*) observations,sum(received_kg) received_kg,
    sum(received_kg*guide_price_clp)/nullif(sum(received_kg),0) avg_price_clp,
    max(guide_price_clp) filter(where rn=1) latest_price_clp,min(guide_price_clp) min_price_clp,max(guide_price_clp) max_price_clp
   from ranked group by supplier limit 1`,
   zone?sql`with base as (
    select coalesce(nullif(btrim(supplier_name),''),nullif(btrim(supplier_original),'')) supplier,lower(btrim(extraction_zone)) zone,received_kg,guide_price_clp
    from historical_production_records
    where record_status='operational' and guide_price_clp is not null and guide_price_clp>0 and received_kg is not null and received_kg>0 and extraction_zone is not null
   ), zone_peer as (
    select zone,sum(received_kg*guide_price_clp)/nullif(sum(received_kg),0) zone_avg_price_clp from base where zone=lower(${zone}) group by zone
   )
   select b.supplier,b.zone,count(*) observations,sum(b.received_kg) received_kg,
    sum(b.received_kg*b.guide_price_clp)/nullif(sum(b.received_kg),0) supplier_zone_avg_price_clp,z.zone_avg_price_clp
   from base b join zone_peer z on z.zone=b.zone where lower(b.supplier)=lower(${matched}) and b.zone=lower(${zone})
   group by b.supplier,b.zone,z.zone_avg_price_clp limit 1`:Promise.resolve([])
  ])
  const price=(Array.isArray(priceRaw)?priceRaw[0]:undefined) as PriceRow|undefined,zonePrice=(Array.isArray(zoneRaw)?zoneRaw[0]:undefined) as ZoneRow|undefined
  const supplierAvg=n(price?.avg_price_clp),supplierZoneAvg=n(zonePrice?.supplier_zone_avg_price_clp),zoneAvg=n(zonePrice?.zone_avg_price_clp)
  const relativeToZonePct=supplierZoneAvg!=null&&zoneAvg!=null&&zoneAvg>0?Number((((supplierZoneAvg/zoneAvg)-1)*100).toFixed(1)):null
  return res.status(200).json({ok:true,matched:true,supplier:matched,suggestions,price:{observations:Number(price?.observations??0),receivedKg:Number(price?.received_kg??0),avgPriceClp:supplierAvg,latestPriceClp:n(price?.latest_price_clp),minPriceClp:n(price?.min_price_clp),maxPriceClp:n(price?.max_price_clp)},zone:zonePrice?{name:zonePrice.zone,observations:Number(zonePrice.observations??0),receivedKg:Number(zonePrice.received_kg??0),supplierAvgPriceClp:supplierZoneAvg,peerAvgPriceClp:zoneAvg,relativeToZonePct}:null})
 }catch(error){console.error('supplier_price_context_failed',error);return res.status(500).json({ok:false,error:'No fue posible calcular el contexto de precio del proveedor'})}
}

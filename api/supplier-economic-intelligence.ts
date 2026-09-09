import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type HistoricalEconomicRow={supplier:string;samples:string|number;received_kg:string|number;purchase_cost_clp:string|number;grade_a_output_kg:string|number;avg_raw_price_clp:string|number|null;cost_per_grade_a_kg:string|number|null}
type LiveEconomicRow={supplier_id:string;supplier:string;receptions:string|number;sold_receptions:string|number;received_kg:string|number;sold_kg:string|number;revenue_clp:string|number;purchase_cost_clp:string|number|null;transformation_cost_clp:string|number|null;contribution_clp:string|number|null;economic_complete:boolean}
type EconomicSource='historical'|'live'|'mixed'|'pending'

const n=(value:unknown)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:0}
const nullable=(value:unknown)=>value==null||value===''?null:n(value)
const key=(value:string)=>value.trim().toLocaleLowerCase('es')
const round=(value:number,digits=1)=>Number(value.toFixed(digits))
function percentile(value:number|null,peers:number[]){if(value==null||!peers.length)return null;if(peers.length===1)return 50;const sorted=[...peers].sort((a,b)=>a-b),less=sorted.filter(item=>item<value).length,equal=sorted.filter(item=>item===value).length;return 100*(less+Math.max(0,equal-1)/2)/(sorted.length-1)}
function sourceFor(historical:number|null,live:number|null):EconomicSource{return historical!=null&&live!=null?'mixed':live!=null?'live':historical!=null?'historical':'pending'}
function blendedScore(historicalScore:number|null,historicalKg:number,liveScore:number|null,liveKg:number){if(historicalScore==null)return liveScore;if(liveScore==null)return historicalScore;const historicalWeight=Math.max(0,historicalKg),liveWeight=Math.max(0,liveKg),total=historicalWeight+liveWeight;return total>0?(historicalScore*historicalWeight+liveScore*liveWeight)/total:(historicalScore+liveScore)/2}

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 try{
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
  const canSeeFinancialAmounts=['admin','operations','finance','viewer'].includes(operator.role)
  const sql=getSql()
  const [historicalRaw,liveRaw]=await Promise.all([
   sql`with raw as (
    select coalesce(nullif(btrim(supplier_name),''),nullif(btrim(supplier_original),''),'Proveedor no identificado') supplier,
     coalesce(received_kg,0) received_kg,guide_price_clp,
     case when yields ? 'grade_a' then (yields->>'grade_a')::numeric end grade_a,
     coalesce((grade_breakdown->'A1'->>'kg')::numeric,0)+coalesce((grade_breakdown->'A2'->>'kg')::numeric,0)+
     coalesce((grade_breakdown->'Vj100'->>'kg')::numeric,0)+coalesce((grade_breakdown->'Vj50'->>'kg')::numeric,0)+
     coalesce((grade_breakdown->'C1'->>'kg')::numeric,0)+coalesce((grade_breakdown->'C2'->>'kg')::numeric,0)+
     coalesce((grade_breakdown->'D'->>'kg')::numeric,0)+coalesce((grade_breakdown->'PT'->>'kg')::numeric,0)+
     coalesce((grade_breakdown->'R'->>'kg')::numeric,0) reported_output_kg,
     case
      when lower(coalesce(nullif(btrim(process_site_original),''),'')) in ('curanue','santa rosa','candelaria')
       or lower(coalesce(lot_code,'')) like 'ig%' or lower(coalesce(lot_code,'')) like 'mdq%' or lower(coalesce(lot_code,'')) like 'mi%'
      then 'cross_lot_rollforward' else 'row_mass_balance' end capture_mode
    from historical_production_records
    where record_status='operational'
     and source_file_hash in(select file_hash from canonical_source_files where canonical and (source_kind='production' or file_name ilike '%produccion%'))
   ),base as (
    select *,capture_mode='row_mass_balance' and received_kg>0 and reported_output_kg>received_kg mass_review from raw
   ),eligible as (
    select * from base
    where capture_mode='row_mass_balance' and not mass_review and received_kg>0 and guide_price_clp>0 and grade_a>0
   )
   select supplier,count(*)::int samples,sum(received_kg) received_kg,
    sum(received_kg*guide_price_clp) purchase_cost_clp,
    sum(received_kg*grade_a) grade_a_output_kg,
    sum(received_kg*guide_price_clp)/nullif(sum(received_kg),0) avg_raw_price_clp,
    sum(received_kg*guide_price_clp)/nullif(sum(received_kg*grade_a),0) cost_per_grade_a_kg
   from eligible group by supplier order by received_kg desc`,
   sql`with erizo as (
    select r.id,r.supplier_id,coalesce(r.accepted_kg,greatest(0,coalesce(r.gross_kg,0)-coalesce(r.tare_kg,0))) received_kg
    from receptions r where lower(coalesce(r.species,'')) like '%eriz%'
   ),receipts as (
    select supplier_id,count(*)::int receptions,sum(received_kg) received_kg from erizo group by supplier_id
   ),sold as (
    select e.id reception_id,e.supplier_id,e.received_kg,sum(s.sold_kg) sold_kg,sum(s.sold_kg*s.price_per_kg_clp) revenue_clp
    from erizo e join lot_sales s on s.reception_id=e.id and s.status='confirmed'
    group by e.id,e.supplier_id,e.received_kg
   ),economic as (
    select s.*,st.gross_amount_clp purchase_cost_clp,tc.transformation_cost_clp,
     s.received_kg>0 and abs(s.sold_kg-s.received_kg)<=0.01 full_sale,
     st.gross_amount_clp is not null purchase_known,tc.transformation_cost_clp is not null transformation_known
    from sold s
    left join lateral(select gross_amount_clp from settlements x where x.reception_id=s.reception_id and x.status in ('approved','pending','draft') order by x.created_at desc limit 1)st on true
    left join lateral(select sum(amount_clp) transformation_cost_clp from transformation_costs x where x.reception_id=s.reception_id having count(*)>0)tc on true
   ),economics as (
    select supplier_id,count(*)::int sold_receptions,sum(sold_kg) sold_kg,sum(revenue_clp) revenue_clp,
     sum(purchase_cost_clp) filter(where purchase_known) purchase_cost_clp,
     sum(transformation_cost_clp) filter(where transformation_known) transformation_cost_clp,
     bool_and(full_sale and purchase_known and transformation_known) economic_complete,
     case when bool_and(full_sale and purchase_known and transformation_known) then sum(revenue_clp-purchase_cost_clp-transformation_cost_clp) end contribution_clp
    from economic group by supplier_id
   )
   select p.id supplier_id,p.legal_name supplier,r.receptions,r.received_kg,coalesce(e.sold_receptions,0)::int sold_receptions,
    coalesce(e.sold_kg,0) sold_kg,coalesce(e.revenue_clp,0) revenue_clp,e.purchase_cost_clp,e.transformation_cost_clp,e.contribution_clp,coalesce(e.economic_complete,false) economic_complete
   from receipts r join parties p on p.id=r.supplier_id left join economics e on e.supplier_id=r.supplier_id
   where p.kind='supplier'::party_kind order by r.received_kg desc`
  ])
  const historical=(Array.isArray(historicalRaw)?historicalRaw:[]) as HistoricalEconomicRow[]
  const live=(Array.isArray(liveRaw)?liveRaw:[]) as LiveEconomicRow[]
  const histMap=new Map(historical.map(row=>[key(row.supplier),row])),liveMap=new Map(live.map(row=>[key(row.supplier),row]))
  const names=new Map<string,string>();for(const row of historical)names.set(key(row.supplier),row.supplier);for(const row of live)names.set(key(row.supplier),row.supplier)
  const historicalPeers=historical.map(row=>nullable(row.cost_per_grade_a_kg)).filter((value):value is number=>value!=null&&value>0)
  const livePeers=live.map(row=>{const sold=n(row.sold_kg),contribution=nullable(row.contribution_clp);return row.economic_complete&&sold>0&&contribution!=null?contribution/sold:null}).filter((value):value is number=>value!=null&&Number.isFinite(value))
  const suppliers=[...names.entries()].map(([normalizedName,name])=>{
   const h=histMap.get(normalizedName),l=liveMap.get(normalizedName)
   const historicalCost=nullable(h?.cost_per_grade_a_kg),historicalScore=historicalCost==null?null:100-(percentile(historicalCost,historicalPeers)??50),historicalKg=n(h?.received_kg)
   const liveReceivedKg=n(l?.received_kg),liveSoldKg=n(l?.sold_kg),liveRevenue=n(l?.revenue_clp),liveEconomicComplete=Boolean(l?.economic_complete),liveContribution=liveEconomicComplete?nullable(l?.contribution_clp):null
   const liveContributionPerKg=liveEconomicComplete&&liveSoldKg>0&&liveContribution!=null?liveContribution/liveSoldKg:null
   const liveScore=liveContributionPerKg==null?null:percentile(liveContributionPerKg,livePeers),score=blendedScore(historicalScore,historicalKg,liveScore,liveSoldKg)
   const source=sourceFor(historicalScore,liveScore)
   return {supplierId:l?.supplier_id??null,supplier:name,score:score==null?null:round(score),source,
    historical:{samples:n(h?.samples),receivedKg:historicalKg,purchaseCostClp:canSeeFinancialAmounts?n(h?.purchase_cost_clp):null,gradeAOutputKg:n(h?.grade_a_output_kg),avgRawPriceClp:canSeeFinancialAmounts?nullable(h?.avg_raw_price_clp):null,costPerGradeAKg:canSeeFinancialAmounts?historicalCost:null,score:historicalScore==null?null:round(historicalScore)},
    live:{receptions:n(l?.receptions),soldReceptions:n(l?.sold_receptions),receivedKg:liveReceivedKg,soldKg:liveSoldKg,revenueClp:canSeeFinancialAmounts?liveRevenue:null,purchaseCostClp:canSeeFinancialAmounts?nullable(l?.purchase_cost_clp):null,transformationCostClp:canSeeFinancialAmounts?nullable(l?.transformation_cost_clp):null,contributionClp:canSeeFinancialAmounts?liveContribution:null,contributionPerSoldKg:canSeeFinancialAmounts?liveContributionPerKg:null,economicComplete:liveEconomicComplete,score:liveScore==null?null:round(liveScore)}}
  }).sort((a,b)=>(b.score??-1)-(a.score??-1)||b.historical.receivedKg+b.live.receivedKg-(a.historical.receivedKg+a.live.receivedKg))
  return res.status(200).json({ok:true,permissions:{canSeeFinancialAmounts},method:{version:'supplier-economics-v2-unknown-not-zero',rule:'Economía histórica de erizo usa sólo captura directa con masa válida, precio de guía y Grade A: costo de materia prima / kg Grade A útil. Economía live sólo puntúa lotes de erizo totalmente vendidos cuando el mismo lote tiene kilos físicos, liquidación y costo de transformación trazados. Una venta o costo faltante permanece desconocido y no se convierte en cero. CUENTA2 permanece como evidencia financiera y packing de pulpo queda fuera del score de erizo; ninguno se atribuye a un proveedor sin vínculo verificable.'},summary:{suppliers:suppliers.length,scored:suppliers.filter(item=>item.score!=null).length,historicalScored:suppliers.filter(item=>item.historical.score!=null).length,liveScored:suppliers.filter(item=>item.live.score!=null).length,mixed:suppliers.filter(item=>item.source==='mixed').length},suppliers})
 }catch(error){
  const message=error instanceof Error?error.message:''
  return res.status(message.includes('historical_production_records')||message.includes('canonical_source_files')||message.includes('receptions')||message.includes('lot_sales')||message.includes('settlements')||message.includes('transformation_costs')?503:500).json({ok:false,error:'No fue posible calcular la economía de compra por proveedor'})
 }
}
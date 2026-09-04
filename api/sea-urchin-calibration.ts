import {requireOperator,type SessionOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>;query?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}

type LotEconomics={purchaseCostClp:number;transformationCostClp:number;soldKg:number;revenueClp:number;allocatedCostClp:number;contributionClp:number;contributionPct:number|null}
type YieldLot={receptionId:string;receptionNumber:string;runId:string;supplier:string;grade:string|null;inputKg:number;outputKg:number;yieldPct:number;economics:LotEconomics|null}

function plantScope(operator:SessionOperator,requested:string){
 if(operator.role==='admin')return requested||null
 if(requested&&!operator.plantIds.includes(requested))return 'forbidden'
 return requested||null
}
const finite=(value:unknown)=>{const number=Number(value);return Number.isFinite(number)?number:null}
const grades=['A','B','C','D','E'] as const

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 try{
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
  const raw=Array.isArray(req.query?.plantId)?req.query?.plantId[0]:req.query?.plantId
  const requested=String(raw??'').trim()
  const scope=plantScope(operator,requested)
  if(scope==='forbidden')return res.status(403).json({ok:false,error:'Planta fuera de alcance'})
  const sql=getSql(),admin=operator.role==='admin',plantIds=operator.plantIds,financialRole=['admin','finance','operations'].includes(operator.role)
  const rows=await sql`
   select c.id,c.run_id,c.suggested_grade,c.operator_grade,c.decision,c.l_mean,c.a_mean,c.b_mean,c.l_std,c.a_std,c.b_std,c.delta_e,c.created_at,c.confirmed_at,
          u.grade run_grade,u.output_kg,u.color_status,u.xray_status,
          r.id reception_id,r.reception_number,r.plant_id,r.received_at,coalesce(r.accepted_kg,greatest(0,r.gross_kg-r.tare_kg)) input_kg,p.legal_name supplier
   from sea_urchin_color_captures c
   join sea_urchin_process_runs u on u.id=c.run_id
   join receptions r on r.id=u.reception_id
   join parties p on p.id=r.supplier_id
   where (${admin} or r.plant_id=any(${plantIds}::text[]))
     and (${scope}::text is null or r.plant_id=${scope})
   order by c.created_at desc
   limit 2000`
  const references=await sql`
   select plant_id,grade,count(*)::int count
   from sea_urchin_color_references
   where is_active and (${admin} or plant_id=any(${plantIds}::text[])) and (${scope}::text is null or plant_id=${scope})
   group by plant_id,grade order by plant_id,grade`
  const economicsRaw=financialRole?await sql`
   select r.id reception_id,
          (select st.gross_amount_clp from settlements st where st.reception_id=r.id and st.status in ('approved','pending','draft') order by st.created_at desc limit 1) purchase_cost_clp,
          (select coalesce(sum(tc.amount_clp),0) from transformation_costs tc where tc.reception_id=r.id) transformation_cost_clp,
          (select count(*)::int from transformation_costs tc where tc.reception_id=r.id) transformation_records,
          (select coalesce(sum(s.sold_kg),0) from lot_sales s where s.reception_id=r.id and s.status='confirmed') sold_kg,
          (select coalesce(sum(s.sold_kg*s.price_per_kg_clp),0) from lot_sales s where s.reception_id=r.id and s.status='confirmed') revenue_clp,
          (select count(*)::int from lot_sales s where s.reception_id=r.id and s.status='confirmed') sale_records
   from receptions r
   where (${admin} or r.plant_id=any(${plantIds}::text[]))
     and (${scope}::text is null or r.plant_id=${scope})
     and exists(select 1 from sea_urchin_process_runs u join sea_urchin_color_captures c on c.run_id=u.id where u.reception_id=r.id)
  `:[]
  const economicsByReception=new Map<string,Record<string,unknown>>()
  for(const row of Array.isArray(economicsRaw)?economicsRaw:[])economicsByReception.set(String((row as {reception_id?:unknown}).reception_id??''),row as Record<string,unknown>)
  const data=Array.isArray(rows)?rows:[]
  const confirmed=data.filter(row=>(row as {confirmed_at?:unknown}).confirmed_at)
  const comparable=confirmed.filter(row=>{const r=row as {suggested_grade?:unknown;operator_grade?:unknown};return Boolean(r.suggested_grade&&r.operator_grade)})
  const matched=comparable.filter(row=>{const r=row as {suggested_grade?:unknown;operator_grade?:unknown};return r.suggested_grade===r.operator_grade}).length
  const gradeMap=new Map<string,{grade:string;captures:number;confirmed:number;accepted:number;l:number;a:number;b:number;dispersion:number;delta:number;metricCount:number;deltaCount:number}>()
  for(const grade of grades)gradeMap.set(grade,{grade,captures:0,confirmed:0,accepted:0,l:0,a:0,b:0,dispersion:0,delta:0,metricCount:0,deltaCount:0})
  const suppliers=new Map<string,{supplier:string;lots:Set<string>;captures:number;confirmed:number;accepted:number;grades:Record<string,number>;yieldLots:Set<string>;inputKg:number;outputKg:number;economicLots:number;revenueClp:number;contributionClp:number}>()
  const yieldLots=new Map<string,YieldLot>()
  for(const item of data){
   const row=item as Record<string,unknown>,confirmedGrade=String(row.operator_grade??row.run_grade??''),grade=gradeMap.get(confirmedGrade)
   if(grade){grade.captures++;if(row.confirmed_at)grade.confirmed++;if(row.decision==='accepted')grade.accepted++;const l=Number(row.l_mean),a=Number(row.a_mean),b=Number(row.b_mean),ls=Number(row.l_std),as=Number(row.a_std),bs=Number(row.b_std);if([l,a,b,ls,as,bs].every(Number.isFinite)){grade.l+=l;grade.a+=a;grade.b+=b;grade.dispersion+=Math.sqrt(ls*ls+as*as+bs*bs);grade.metricCount++}const delta=Number(row.delta_e);if(Number.isFinite(delta)){grade.delta+=delta;grade.deltaCount++}}
   const key=String(row.supplier??'Proveedor sin nombre'),supplier=suppliers.get(key)??{supplier:key,lots:new Set<string>(),captures:0,confirmed:0,accepted:0,grades:{A:0,B:0,C:0,D:0,E:0},yieldLots:new Set<string>(),inputKg:0,outputKg:0,economicLots:0,revenueClp:0,contributionClp:0}
   const receptionId=String(row.reception_id??'')
   supplier.captures++;supplier.lots.add(receptionId);if(row.confirmed_at)supplier.confirmed++;if(row.decision==='accepted')supplier.accepted++
   const inputKg=finite(row.input_kg),outputKg=finite(row.output_kg)
   if(receptionId&&!yieldLots.has(receptionId)&&inputKg!=null&&inputKg>0&&outputKg!=null&&outputKg>0){
    const canonicalGrade=grades.includes(String(row.run_grade??'') as typeof grades[number])?String(row.run_grade):null
    if(canonicalGrade)supplier.grades[canonicalGrade]=(supplier.grades[canonicalGrade]??0)+1
    const econ=economicsByReception.get(receptionId),purchaseCost=econ?finite(econ.purchase_cost_clp):null,transformationCost=econ?finite(econ.transformation_cost_clp):null,transformationRecords=econ?Number(econ.transformation_records??0):0,soldKg=econ?Number(econ.sold_kg??0):0,revenue=econ?Number(econ.revenue_clp??0):0,saleRecords=econ?Number(econ.sale_records??0):0
    let economics:LotEconomics|null=null
    if(financialRole&&purchaseCost!=null&&transformationCost!=null&&transformationRecords>0&&saleRecords>0&&soldKg>0&&revenue>0){const soldRatio=Math.min(1,soldKg/outputKg),allocatedCost=purchaseCost*soldRatio+transformationCost*soldRatio,contribution=revenue-allocatedCost;economics={purchaseCostClp:purchaseCost,transformationCostClp:transformationCost,soldKg,revenueClp:revenue,allocatedCostClp:allocatedCost,contributionClp:contribution,contributionPct:revenue>0?contribution/revenue*100:null};supplier.economicLots++;supplier.revenueClp+=revenue;supplier.contributionClp+=contribution}
    const yieldPct=outputKg/inputKg*100;yieldLots.set(receptionId,{receptionId,receptionNumber:String(row.reception_number??''),runId:String(row.run_id??''),supplier:key,grade:canonicalGrade,inputKg,outputKg,yieldPct,economics});supplier.yieldLots.add(receptionId);supplier.inputKg+=inputKg;supplier.outputKg+=outputKg
   }
   suppliers.set(key,supplier)
  }
  const byGrade=[...gradeMap.values()].map(row=>({grade:row.grade,captures:row.captures,confirmed:row.confirmed,accepted:row.accepted,meanLab:row.metricCount?{l:row.l/row.metricCount,a:row.a/row.metricCount,b:row.b/row.metricCount}:null,meanDispersion:row.metricCount?row.dispersion/row.metricCount:null,meanDeltaE:row.deltaCount?row.delta/row.deltaCount:null}))
  const bySupplier=[...suppliers.values()].map(row=>({supplier:row.supplier,lots:row.lots.size,captures:row.captures,confirmed:row.confirmed,accepted:row.accepted,grades:row.grades,yieldLots:row.yieldLots.size,inputKg:row.inputKg,outputKg:row.outputKg,yieldPct:row.inputKg>0?row.outputKg/row.inputKg*100:null,economics:financialRole?{traceableLots:row.economicLots,revenueClp:row.revenueClp,contributionClp:row.contributionClp,contributionPct:row.revenueClp>0?row.contributionClp/row.revenueClp*100:null}:null})).sort((a,b)=>b.confirmed-a.confirmed||b.captures-a.captures).slice(0,50)
  const yieldRows=[...yieldLots.values()].sort((a,b)=>b.yieldPct-a.yieldPct)
  const gradePerformance=grades.map(grade=>{const lots=yieldRows.filter(row=>row.grade===grade),inputKg=lots.reduce((sum,row)=>sum+row.inputKg,0),outputKg=lots.reduce((sum,row)=>sum+row.outputKg,0),economicLots=lots.filter(row=>row.economics),revenueClp=economicLots.reduce((sum,row)=>sum+(row.economics?.revenueClp??0),0),contributionClp=economicLots.reduce((sum,row)=>sum+(row.economics?.contributionClp??0),0);return {grade,lots:lots.length,inputKg,outputKg,yieldPct:inputKg>0?outputKg/inputKg*100:null,economics:financialRole?{traceableLots:economicLots.length,revenueClp,contributionClp,contributionPct:revenueClp>0?contributionClp/revenueClp*100:null}:null}})
  const totalInputKg=yieldRows.reduce((sum,row)=>sum+row.inputKg,0),totalOutputKg=yieldRows.reduce((sum,row)=>sum+row.outputKg,0),economicRows=yieldRows.filter(row=>row.economics),revenueClp=economicRows.reduce((sum,row)=>sum+(row.economics?.revenueClp??0),0),contributionClp=economicRows.reduce((sum,row)=>sum+(row.economics?.contributionClp??0),0)
  return res.status(200).json({ok:true,scope:{plantId:scope},summary:{captures:data.length,confirmed:confirmed.length,accepted:confirmed.filter(row=>(row as {decision?:unknown}).decision==='accepted').length,lots:new Set(data.map(row=>String((row as {reception_id?:unknown}).reception_id))).size,agreement:comparable.length?{matched,total:comparable.length,ratio:matched/comparable.length}:null,references:Array.isArray(references)?references:[],yield:{lots:yieldRows.length,inputKg:totalInputKg,outputKg:totalOutputKg,pct:totalInputKg>0?totalOutputKg/totalInputKg*100:null},economics:financialRole?{traceableLots:economicRows.length,revenueClp,contributionClp,contributionPct:revenueClp>0?contributionClp/revenueClp*100:null}:null},byGrade,gradePerformance,bySupplier,byLot:yieldRows})
 }catch(error){
  const message=error instanceof Error?error.message:''
  return res.status(message.includes('sea_urchin_color_')?503:500).json({ok:false,error:message.includes('sea_urchin_color_')?'Falta aplicar la migración Uni Vision Station':'No fue posible construir dataset de calibración'})
 }
}

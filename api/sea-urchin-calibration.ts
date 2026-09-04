import {requireOperator,type SessionOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;query?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}

function plantScope(operator:SessionOperator,requested:string){
 if(operator.role==='admin')return requested||null
 if(requested&&!operator.plantIds.includes(requested))return 'forbidden'
 return requested||null
}

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
  const sql=getSql(),admin=operator.role==='admin',plantIds=operator.plantIds
  const rows=await sql`
   select c.id,c.run_id,c.suggested_grade,c.operator_grade,c.decision,c.l_mean,c.a_mean,c.b_mean,c.l_std,c.a_std,c.b_std,c.delta_e,c.created_at,c.confirmed_at,
          u.grade run_grade,u.output_kg,u.color_status,u.xray_status,
          r.id reception_id,r.reception_number,r.plant_id,r.received_at,p.legal_name supplier
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
  const data=Array.isArray(rows)?rows:[]
  const confirmed=data.filter(row=>(row as {confirmed_at?:unknown}).confirmed_at)
  const comparable=confirmed.filter(row=>{const r=row as {suggested_grade?:unknown;operator_grade?:unknown};return Boolean(r.suggested_grade&&r.operator_grade)})
  const matched=comparable.filter(row=>{const r=row as {suggested_grade?:unknown;operator_grade?:unknown};return r.suggested_grade===r.operator_grade}).length
  const gradeMap=new Map<string,{grade:string;captures:number;confirmed:number;accepted:number;l:number;a:number;b:number;dispersion:number;delta:number;metricCount:number;deltaCount:number}>()
  for(const grade of ['A','B','C','D','E'])gradeMap.set(grade,{grade,captures:0,confirmed:0,accepted:0,l:0,a:0,b:0,dispersion:0,delta:0,metricCount:0,deltaCount:0})
  const suppliers=new Map<string,{supplier:string;lots:Set<string>;captures:number;confirmed:number;accepted:number;grades:Record<string,number>}>()
  for(const item of data){
   const row=item as Record<string,unknown>,confirmedGrade=String(row.operator_grade??row.run_grade??''),grade=gradeMap.get(confirmedGrade)
   if(grade){grade.captures++;if(row.confirmed_at)grade.confirmed++;if(row.decision==='accepted')grade.accepted++;const l=Number(row.l_mean),a=Number(row.a_mean),b=Number(row.b_mean),ls=Number(row.l_std),as=Number(row.a_std),bs=Number(row.b_std);if([l,a,b,ls,as,bs].every(Number.isFinite)){grade.l+=l;grade.a+=a;grade.b+=b;grade.dispersion+=Math.sqrt(ls*ls+as*as+bs*bs);grade.metricCount++}const delta=Number(row.delta_e);if(Number.isFinite(delta)){grade.delta+=delta;grade.deltaCount++}}
   const key=String(row.supplier??'Proveedor sin nombre'),supplier=suppliers.get(key)??{supplier:key,lots:new Set<string>(),captures:0,confirmed:0,accepted:0,grades:{A:0,B:0,C:0,D:0,E:0}}
   supplier.captures++;supplier.lots.add(String(row.reception_id));if(row.confirmed_at)supplier.confirmed++;if(row.decision==='accepted')supplier.accepted++;if(['A','B','C','D','E'].includes(confirmedGrade))supplier.grades[confirmedGrade]=(supplier.grades[confirmedGrade]??0)+1;suppliers.set(key,supplier)
  }
  const byGrade=[...gradeMap.values()].map(row=>({grade:row.grade,captures:row.captures,confirmed:row.confirmed,accepted:row.accepted,meanLab:row.metricCount?{l:row.l/row.metricCount,a:row.a/row.metricCount,b:row.b/row.metricCount}:null,meanDispersion:row.metricCount?row.dispersion/row.metricCount:null,meanDeltaE:row.deltaCount?row.delta/row.deltaCount:null}))
  const bySupplier=[...suppliers.values()].map(row=>({supplier:row.supplier,lots:row.lots.size,captures:row.captures,confirmed:row.confirmed,accepted:row.accepted,grades:row.grades})).sort((a,b)=>b.confirmed-a.confirmed||b.captures-a.captures).slice(0,50)
  return res.status(200).json({ok:true,scope:{plantId:scope},summary:{captures:data.length,confirmed:confirmed.length,accepted:confirmed.filter(row=>(row as {decision?:unknown}).decision==='accepted').length,lots:new Set(data.map(row=>String((row as {reception_id?:unknown}).reception_id))).size,agreement:comparable.length?{matched,total:comparable.length,ratio:matched/comparable.length}:null,references:Array.isArray(references)?references:[]},byGrade,bySupplier})
 }catch(error){
  const message=error instanceof Error?error.message:''
  return res.status(message.includes('sea_urchin_color_')?503:500).json({ok:false,error:message.includes('sea_urchin_color_')?'Falta aplicar la migración Uni Vision Station':'No fue posible construir dataset de calibración'})
 }
}

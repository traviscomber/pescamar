import { requireOperator } from "./_auth.js";
import { getSql } from "./_db.js";

type Request={method?:string;body?:unknown;headers?:Record<string,string|string[]|undefined>};
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void};
type SettlementInput={receptionId?:unknown;pricePerKg?:unknown;otherDeductions?:unknown;comment?:unknown};

export default async function handler(request:Request,response:Response){
  response.setHeader("Cache-Control","no-store");
  try{
    const operator=await requireOperator(request,["admin","finance"]);
    if(!operator)return response.status(401).json({ok:false,error:"Sesión de Finanzas o Administración requerida"});
    if(request.method==="GET")return await listSettlements(response);
    if(request.method==="POST")return await createSettlement(request.body,response,operator.fullName);
    response.setHeader("Allow","GET, POST");return response.status(405).json({ok:false,error:"Método no permitido"});
  }catch(error){
    const message=error instanceof Error?error.message:"",configuration=message.includes("DATABASE_URL"),migration=message.includes("guide_kg")||message.includes("price_per_kg_clp")||message.includes("operator_sessions");
    return response.status(configuration||migration?503:500).json({ok:false,error:configuration?"Base de datos no conectada":migration?"Faltan migraciones operacionales":"No fue posible procesar las liquidaciones"});
  }
}
async function listSettlements(response:Response){
  const sql=getSql();const [settlements,eligible]=await Promise.all([
    sql`select s.id,s.status,s.gross_amount_clp,s.other_deductions_clp,s.credit_recovery_clp,s.net_amount_clp,s.price_per_kg_clp,s.created_at,s.settled_at,s.created_by,s.approved_by,r.id as reception_id,r.reception_number,r.guide_kg,r.accepted_kg,r.species,p.legal_name as supplier from settlements s join receptions r on r.id=s.reception_id join parties p on p.id=s.supplier_id order by s.created_at desc limit 300`,
    sql`select r.id,r.reception_number,r.guide_kg,r.accepted_kg,r.species,r.received_at,p.legal_name as supplier,coalesce(b.balance_clp,0) as credit_balance_clp from receptions r join parties p on p.id=r.supplier_id left join lateral(select cb.balance_clp from credit_accounts ca join parties cp on cp.id=ca.party_id left join credit_account_balances cb on cb.account_id=ca.id where ca.party_id=r.supplier_id or lower(trim(cp.legal_name))=lower(trim(p.legal_name)) order by(ca.party_id=r.supplier_id) desc limit 1)b on true left join settlements s on s.reception_id=r.id where r.status='approved' and s.id is null order by r.received_at asc limit 200`]);
  return response.status(200).json({ok:true,settlements,eligible});
}
async function createSettlement(body:unknown,response:Response,operatorName:string){
  const input=(body??{}) as SettlementInput;const receptionId=String(input.receptionId??""),comment=String(input.comment??"").trim();const pricePerKg=Number(input.pricePerKg),otherDeductions=Number(input.otherDeductions??0);
  if(!receptionId||comment.length<3||!Number.isSafeInteger(pricePerKg)||pricePerKg<=0||!Number.isSafeInteger(otherDeductions)||otherDeductions<0)return response.status(400).json({ok:false,error:"Recepción, precio y comentario son obligatorios"});
  const rows=await getSql()`with reception as(select r.* from receptions r where r.id=${receptionId}::uuid and r.status='approved' and r.accepted_kg is not null) insert into settlements(reception_id,supplier_id,gross_amount_clp,other_deductions_clp,net_amount_clp,status,price_per_kg_clp,created_by,calculation_snapshot) select r.id,r.supplier_id,round(r.accepted_kg*${pricePerKg})::bigint,${otherDeductions},null,'pending',${pricePerKg},${operatorName},jsonb_build_object('guideKg',r.guide_kg,'grossKg',r.gross_kg,'tareKg',r.tare_kg,'drainedKg',r.drained_kg,'acceptedKg',r.accepted_kg,'pricePerKgClp',${pricePerKg},'otherDeductionsClp',${otherDeductions},'creationComment',${comment}) from reception r on conflict(reception_id) do nothing returning id,status,gross_amount_clp,created_at`;
  const settlement=Array.isArray(rows)?rows[0]:null;if(!settlement)return response.status(409).json({ok:false,error:"La recepción no está aprobada o ya existe una liquidación"});return response.status(201).json({ok:true,settlement});
}

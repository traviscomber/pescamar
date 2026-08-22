import { requireOperator, type SessionOperator } from './_auth.js'
import { hasPlantAccess } from './_plants.js'
import { ensureReceptionSchema } from './_reception-schema.js'
import { getSql } from './_db.js'

type Request={method?:string;body?:unknown;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type DecisionInput={entityType?:unknown;entityId?:unknown;decision?:unknown;comment?:unknown}

export default async function handler(request:Request,response:Response){
  response.setHeader('Cache-Control','no-store')
  try{
    const operator=await requireOperator(request,['admin','operations','finance','quality'])
    if(!operator)return response.status(401).json({ok:false,error:'Sesión autorizada requerida'})
    await ensureReceptionSchema()
    if(request.method==='GET')return await listPending(response,operator)
    if(request.method==='POST')return await decide(request.body,response,operator)
    response.setHeader('Allow','GET, POST')
    return response.status(405).json({ok:false,error:'Método no permitido'})
  }catch(error){
    const configuration=error instanceof Error&&error.message.includes('DATABASE_URL')
    const migration=error instanceof Error&&error.message.includes('operator_sessions')
    return response.status(configuration||migration?503:500).json({ok:false,error:configuration?'Base de datos no conectada':migration?'Falta aplicar la migración 003_operator_auth.sql':'No fue posible procesar la decisión'})
  }
}

async function listPending(response:Response,operator:SessionOperator){
  const rows=(await getSql()`
    select 'credit_request' as entity_type, cr.id as entity_id, 'ANT-'||cr.request_number as reference,
      'Anticipo solicitado' as title, p.legal_name||' · $'||to_char(cr.amount_clp,'FM999G999G999') as detail,
      'Créditos' as module, cr.requested_by as owner, cr.requested_at as created_at, null::text as plant_id
    from credit_requests cr join credit_accounts ca on ca.id=cr.account_id join parties p on p.id=ca.party_id where cr.status='pending'
    union all
    select 'reception',r.id,'REC-'||r.reception_number,'Recepción pendiente',p.legal_name||' · guía '||r.guide_kg||' kg · aceptado '||r.accepted_kg||' kg','Recepción',r.source,r.created_at,r.plant_id
    from receptions r join parties p on p.id=r.supplier_id where r.status='pending'
    union all
    select 'settlement',s.id,'LIQ-'||r.reception_number,'Liquidación pendiente',p.legal_name||' · $'||to_char(s.gross_amount_clp,'FM999G999G999'),'Liquidaciones',s.created_by,s.created_at,r.plant_id
    from settlements s join receptions r on r.id=s.reception_id join parties p on p.id=s.supplier_id where s.status='pending'
    order by created_at asc limit 300`) as Array<Record<string,unknown>>
  const visible=rows.filter((row)=>{
    const entityType=String(row.entity_type??'')
    if(entityType==='credit_request')return ['admin','finance'].includes(operator.role)
    if(entityType==='settlement'&&!['admin','finance'].includes(operator.role))return false
    if(entityType==='reception'&&!['admin','operations','quality'].includes(operator.role))return false
    if(operator.role==='admin')return true
    return typeof row.plant_id==='string'&&hasPlantAccess(operator,row.plant_id)
  }).slice(0,200)
  return response.status(200).json({ok:true,items:visible})
}

async function entityPlantId(entityType:string,entityId:string){
  const sql=getSql()
  if(entityType==='reception'){
    const rows=await sql`select plant_id from receptions where id=${entityId}::uuid limit 1`
    return Array.isArray(rows)?(rows[0] as {plant_id?:unknown}|undefined)?.plant_id:undefined
  }
  if(entityType==='settlement'){
    const rows=await sql`select r.plant_id from settlements s join receptions r on r.id=s.reception_id where s.id=${entityId}::uuid limit 1`
    return Array.isArray(rows)?(rows[0] as {plant_id?:unknown}|undefined)?.plant_id:undefined
  }
  return undefined
}

async function decide(body:unknown,response:Response,operator:SessionOperator){
  const input=(body??{}) as DecisionInput
  const entityType=String(input.entityType??''),entityId=String(input.entityId??''),decision=String(input.decision??''),comment=String(input.comment??'').trim()
  if(!['credit_request','reception','settlement'].includes(entityType)||!['approved','rejected'].includes(decision)||!entityId||!comment)return response.status(400).json({ok:false,error:'Decisión y comentario son obligatorios'})
  if(entityType==='credit_request'&&!['admin','finance'].includes(operator.role))return response.status(403).json({ok:false,error:'Solo Administración o Finanzas puede decidir anticipos'})
  if(entityType==='reception'&&!['admin','operations','quality'].includes(operator.role))return response.status(403).json({ok:false,error:'Tu rol no puede decidir recepciones'})
  if(entityType==='settlement'&&!['admin','finance'].includes(operator.role))return response.status(403).json({ok:false,error:'Solo Administración o Finanzas puede decidir liquidaciones'})
  if(entityType!=='credit_request'&&operator.role!=='admin'){
    const plantId=await entityPlantId(entityType,entityId)
    if(typeof plantId!=='string'||!hasPlantAccess(operator,plantId))return response.status(403).json({ok:false,error:'La decisión está fuera de tu alcance de planta'})
  }
  const sql=getSql()
  if(entityType==='credit_request')await sql`with changed as (update credit_requests set status=${decision}::workflow_status,approved_at=case when ${decision}='approved' then now() else null end where id=${entityId}::uuid and status='pending' returning id,account_id,amount_clp),movement as (insert into credit_movements(account_id,credit_request_id,kind,amount_clp,comment,created_by) select account_id,id,'advance',amount_clp,${comment},${operator.fullName} from changed where ${decision}='approved' on conflict(credit_request_id) where kind='advance' do nothing) insert into approval_actions(entity_type,entity_id,action,comment,acted_by) select ${entityType},id,${decision}::workflow_status,${comment},${operator.fullName} from changed`
  else if(entityType==='reception')await sql`with changed as (update receptions set status=${decision}::workflow_status where id=${entityId}::uuid and status='pending' returning id) insert into approval_actions(entity_type,entity_id,action,comment,acted_by) select ${entityType},id,${decision}::workflow_status,${comment},${operator.fullName} from changed`
  else if(decision==='rejected')await sql`with changed as (update settlements set status='rejected',updated_at=now() where id=${entityId}::uuid and status='pending' returning id) insert into approval_actions(entity_type,entity_id,action,comment,acted_by) select ${entityType},id,'rejected'::workflow_status,${comment},${operator.fullName} from changed`
  else await sql`with candidate as (select s.*,r.supplier_id,p.legal_name,greatest(s.gross_amount_clp-s.other_deductions_clp,0)::bigint as payable,ca.id as account_id,coalesce(cb.balance_clp,0)::bigint as balance_clp,cr.recovery_kind,cr.recovery_value from settlements s join receptions r on r.id=s.reception_id join parties p on p.id=r.supplier_id left join lateral(select a.id from credit_accounts a join parties ap on ap.id=a.party_id where a.party_id=r.supplier_id or lower(trim(ap.legal_name))=lower(trim(p.legal_name)) order by(a.party_id=r.supplier_id) desc limit 1)ca on true left join credit_account_balances cb on cb.account_id=ca.id left join lateral(select q.recovery_kind,q.recovery_value from credit_requests q where q.account_id=ca.id and q.status='approved' order by q.approved_at desc nulls last limit 1)cr on true where s.id=${entityId}::uuid and s.status='pending'),calculated as(select *,least(balance_clp,payable,case recovery_kind when 'percentage' then round(payable*recovery_value/100)::bigint when 'fixed_amount' then recovery_value::bigint when 'full_balance' then balance_clp else 0 end)::bigint as recovery from candidate),changed as(update settlements s set status='approved',credit_recovery_clp=c.recovery,net_amount_clp=c.payable-c.recovery,settled_at=now(),approved_by=${operator.fullName},updated_at=now(),calculation_snapshot=s.calculation_snapshot||jsonb_build_object('creditBalanceBeforeClp',c.balance_clp,'creditRecoveryClp',c.recovery,'netAmountClp',c.payable-c.recovery,'approvalComment',${comment}) from calculated c where s.id=c.id returning s.id,c.account_id,c.recovery),movement as(insert into credit_movements(account_id,settlement_id,kind,amount_clp,comment,created_by) select account_id,id,'recovery',recovery,${comment},${operator.fullName} from changed where account_id is not null and recovery>0 on conflict(settlement_id) where kind='recovery' do nothing) insert into approval_actions(entity_type,entity_id,action,comment,acted_by) select ${entityType},id,'approved'::workflow_status,${comment},${operator.fullName} from changed`
  return response.status(200).json({ok:true})
}

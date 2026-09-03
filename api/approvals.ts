import { requireOperator, type SessionOperator } from './_auth.js'
import { ensureReceptionSchema } from './_reception-schema.js'
import { getSql } from './_db.js'

type Request={method?:string;body?:unknown;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type DecisionInput={entityType?:unknown;entityId?:unknown;decision?:unknown;comment?:unknown}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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
  const admin=operator.role==='admin',finance=['admin','finance'].includes(operator.role),receptionRole=['admin','operations','quality'].includes(operator.role),plantIds=operator.plantIds,actor=operator.fullName,actorId=operator.id
  const rows=(await getSql()`
    select 'credit_request' as entity_type, cr.id as entity_id, 'ANT-'||cr.request_number as reference,
      'Anticipo solicitado' as title, p.legal_name||' · $'||to_char(cr.amount_clp,'FM999G999G999') as detail,
      'Créditos' as module, cr.requested_by as owner, cr.requested_at as created_at, null::text as plant_id, null::uuid as reception_id
    from credit_requests cr join credit_accounts ca on ca.id=cr.account_id join parties p on p.id=ca.party_id
    where cr.status='pending' and ${finance} and (case when cr.requested_by_operator_id is not null then cr.requested_by_operator_id<>${actorId}::uuid else lower(trim(cr.requested_by))<>lower(trim(${actor})) end)
    union all
    select 'reception',r.id,'REC-'||r.reception_number,'Recepción pendiente',p.legal_name||' · guía '||r.guide_kg||' kg · aceptado '||r.accepted_kg||' kg','Recepción',r.source,r.created_at,r.plant_id,r.id
    from receptions r join parties p on p.id=r.supplier_id
    where r.status='pending' and ${receptionRole} and (${admin} or r.plant_id=any(${plantIds}::text[]))
    union all
    select 'settlement',s.id,'LIQ-'||r.reception_number,'Liquidación pendiente',p.legal_name||' · $'||to_char(s.gross_amount_clp,'FM999G999G999'),'Liquidaciones',s.created_by,s.created_at,r.plant_id,r.id
    from settlements s join receptions r on r.id=s.reception_id join parties p on p.id=s.supplier_id
    where s.status='pending' and ${finance} and (case when s.created_by_operator_id is not null then s.created_by_operator_id<>${actorId}::uuid else lower(trim(s.created_by))<>lower(trim(${actor})) end) and (${admin} or r.plant_id=any(${plantIds}::text[]))
    order by created_at asc limit 200`) as Array<Record<string,unknown>>
  return response.status(200).json({ok:true,items:rows})
}

async function decide(body:unknown,response:Response,operator:SessionOperator){
  const input=(body??{}) as DecisionInput
  const entityType=String(input.entityType??''),entityId=String(input.entityId??''),decision=String(input.decision??''),comment=String(input.comment??'').trim()
  if(!['credit_request','reception','settlement'].includes(entityType)||!['approved','rejected'].includes(decision)||!uuid.test(entityId)||comment.length<3)return response.status(400).json({ok:false,error:'Decisión, entidad y comentario válidos son obligatorios'})
  if(entityType==='credit_request'&&!['admin','finance'].includes(operator.role))return response.status(403).json({ok:false,error:'Solo Administración o Finanzas puede decidir anticipos'})
  if(entityType==='reception'&&!['admin','operations','quality'].includes(operator.role))return response.status(403).json({ok:false,error:'Tu rol no puede decidir recepciones'})
  if(entityType==='settlement'&&!['admin','finance'].includes(operator.role))return response.status(403).json({ok:false,error:'Solo Administración o Finanzas puede decidir liquidaciones'})
  const sql=getSql(),admin=operator.role==='admin',plantIds=operator.plantIds,actor=operator.fullName,actorId=operator.id
  let changed:unknown
  if(entityType==='credit_request')changed=await sql`with changed as (update credit_requests set status=${decision}::workflow_status,approved_at=case when ${decision}='approved' then now() else null end where id=${entityId}::uuid and status='pending' and (case when requested_by_operator_id is not null then requested_by_operator_id<>${actorId}::uuid else lower(trim(requested_by))<>lower(trim(${actor})) end) returning id,account_id,amount_clp),movement as (insert into credit_movements(account_id,credit_request_id,kind,amount_clp,comment,created_by,created_by_operator_id) select account_id,id,'advance',amount_clp,${comment},${actor},${actorId}::uuid from changed where ${decision}='approved' on conflict(credit_request_id) where kind='advance' do nothing) insert into approval_actions(entity_type,entity_id,action,comment,acted_by,acted_by_operator_id) select ${entityType},id,${decision}::workflow_status,${comment},${actor},${actorId}::uuid from changed returning entity_id`
  else if(entityType==='reception')changed=await sql`with changed as (update receptions set status=${decision}::workflow_status where id=${entityId}::uuid and status='pending' and (${admin} or plant_id=any(${plantIds}::text[])) returning id) insert into approval_actions(entity_type,entity_id,action,comment,acted_by,acted_by_operator_id) select ${entityType},id,${decision}::workflow_status,${comment},${actor},${actorId}::uuid from changed returning entity_id`
  else if(decision==='rejected')changed=await sql`with changed as (update settlements s set status='rejected',updated_at=now() from receptions r where s.id=${entityId}::uuid and s.status='pending' and (case when s.created_by_operator_id is not null then s.created_by_operator_id<>${actorId}::uuid else lower(trim(s.created_by))<>lower(trim(${actor})) end) and r.id=s.reception_id and (${admin} or r.plant_id=any(${plantIds}::text[])) returning s.id) insert into approval_actions(entity_type,entity_id,action,comment,acted_by,acted_by_operator_id) select ${entityType},id,'rejected'::workflow_status,${comment},${actor},${actorId}::uuid from changed returning entity_id`
  else changed=await sql`with candidate as (select s.*,r.supplier_id,p.legal_name,greatest(s.gross_amount_clp-s.other_deductions_clp,0)::bigint as payable,ca.id as account_id,coalesce(cb.balance_clp,0)::bigint as balance_clp,cr.recovery_kind,cr.recovery_value from settlements s join receptions r on r.id=s.reception_id join parties p on p.id=r.supplier_id left join credit_accounts ca on ca.party_id=r.supplier_id left join credit_account_balances cb on cb.account_id=ca.id left join lateral(select q.recovery_kind,q.recovery_value from credit_requests q where q.account_id=ca.id and q.status='approved' order by q.approved_at desc nulls last limit 1)cr on true where s.id=${entityId}::uuid and s.status='pending' and (case when s.created_by_operator_id is not null then s.created_by_operator_id<>${actorId}::uuid else lower(trim(s.created_by))<>lower(trim(${actor})) end) and (${admin} or r.plant_id=any(${plantIds}::text[]))),calculated as(select *,least(balance_clp,payable,case recovery_kind when 'percentage' then round(payable*recovery_value/100)::bigint when 'fixed_amount' then recovery_value::bigint when 'full_balance' then balance_clp else 0 end)::bigint as recovery from candidate),changed as(update settlements s set status='approved',credit_recovery_clp=c.recovery,net_amount_clp=c.payable-c.recovery,settled_at=now(),approved_by=${actor},approved_by_operator_id=${actorId}::uuid,updated_at=now(),calculation_snapshot=s.calculation_snapshot||jsonb_build_object('creditBalanceBeforeClp',c.balance_clp,'creditRecoveryClp',c.recovery,'netAmountClp',c.payable-c.recovery,'approvalComment',${comment}) from calculated c where s.id=c.id returning s.id,c.account_id,c.recovery),movement as(insert into credit_movements(account_id,settlement_id,kind,amount_clp,comment,created_by,created_by_operator_id) select account_id,id,'recovery',recovery,${comment},${actor},${actorId}::uuid from changed where account_id is not null and recovery>0 on conflict(settlement_id) where kind='recovery' do nothing) insert into approval_actions(entity_type,entity_id,action,comment,acted_by,acted_by_operator_id) select ${entityType},id,'approved'::workflow_status,${comment},${actor},${actorId}::uuid from changed returning entity_id`
  if(!Array.isArray(changed)||!changed.length)return response.status(409).json({ok:false,error:'La entidad ya fue procesada, está fuera de tu alcance o requiere decisión de otra persona'})
  return response.status(200).json({ok:true})
}

import { getSql } from './_db.js'
import { isAdminAuthorized, isAdminConfigured } from './_admin.js'

type Request={method?:string;body?:unknown;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type DecisionInput={entityType?:unknown;entityId?:unknown;decision?:unknown;comment?:unknown;operatorId?:unknown}

export default async function handler(request:Request,response:Response){
  response.setHeader('Cache-Control','no-store')
  if(!isAdminConfigured())return response.status(503).json({ok:false,error:'Control de decisiones pendiente de activación'})
  if(!isAdminAuthorized(request))return response.status(401).json({ok:false,error:'Sesión administrativa requerida'})
  try{
    if(request.method==='GET')return await listPending(response)
    if(request.method==='POST')return await decide(request.body,response)
    response.setHeader('Allow','GET, POST')
    return response.status(405).json({ok:false,error:'Método no permitido'})
  }catch(error){
    const configuration=error instanceof Error&&error.message.includes('DATABASE_URL')
    return response.status(configuration?503:500).json({ok:false,error:configuration?'Base de datos no conectada':'No fue posible procesar la decisión'})
  }
}

async function listPending(response:Response){
  const rows=await getSql()`
    select 'credit_request' as entity_type, cr.id as entity_id, 'ANT-'||cr.request_number as reference,
      'Anticipo solicitado' as title, p.legal_name||' · $'||to_char(cr.amount_clp,'FM999G999G999') as detail,
      'Créditos' as module, cr.requested_by as owner, cr.requested_at as created_at
    from credit_requests cr join credit_accounts ca on ca.id=cr.account_id join parties p on p.id=ca.party_id
    where cr.status='pending'
    union all
    select 'reception', r.id, 'REC-'||r.reception_number, 'Recepción pendiente',
      p.legal_name||' · guía '||r.guide_kg||' kg · aceptado '||r.accepted_kg||' kg', 'Recepción', r.source, r.created_at
    from receptions r join parties p on p.id=r.supplier_id where r.status='pending'
    union all
    select 'settlement',s.id,'LIQ-'||r.reception_number,'Liquidación pendiente',
      p.legal_name||' · $'||to_char(s.gross_amount_clp,'FM999G999G999'),
      'Liquidaciones',s.created_by,s.created_at
    from settlements s join receptions r on r.id=s.reception_id
    join parties p on p.id=s.supplier_id where s.status='pending'
    order by created_at asc limit 200
  `
  return response.status(200).json({ok:true,items:rows})
}

async function decide(body:unknown,response:Response){
  const input=(body??{}) as DecisionInput
  const entityType=String(input.entityType??''),entityId=String(input.entityId??''),decision=String(input.decision??''),comment=String(input.comment??'').trim(),operatorId=String(input.operatorId??'')
  if(!['credit_request','reception','settlement'].includes(entityType)||!['approved','rejected'].includes(decision)||!entityId||!comment||!operatorId)return response.status(400).json({ok:false,error:'Decisión, comentario y operador son obligatorios'})
  const sql=getSql()
  const operators=await sql`select full_name,role from operators where id=${operatorId}::uuid and active=true and role in ('admin','operations','finance','quality') limit 1`
  const operator=Array.isArray(operators)?operators[0] as {full_name:string;role:string}|undefined:undefined
  if(!operator)return response.status(403).json({ok:false,error:'El operador no está activo o no puede decidir'})
  if(entityType==='credit_request'&&!['admin','finance'].includes(operator.role))return response.status(403).json({ok:false,error:'Solo Administración o Finanzas puede decidir anticipos'})
  if(entityType==='reception'&&!['admin','operations','quality'].includes(operator.role))return response.status(403).json({ok:false,error:'El rol seleccionado no puede decidir recepciones'})
  if(entityType==='settlement'&&!['admin','finance'].includes(operator.role))return response.status(403).json({ok:false,error:'Solo Administración o Finanzas puede decidir liquidaciones'})
  if(entityType==='credit_request')await sql`
    with changed as (
      update credit_requests set status=${decision}::workflow_status,
        approved_at=case when ${decision}='approved' then now() else null end
      where id=${entityId}::uuid and status='pending'
      returning id,account_id,amount_clp
    ), movement as (
      insert into credit_movements (account_id,credit_request_id,kind,amount_clp,comment,created_by)
      select account_id,id,'advance',amount_clp,${comment},${operator.full_name}
      from changed where ${decision}='approved'
      on conflict (credit_request_id) where kind='advance' do nothing
    )
    insert into approval_actions(entity_type,entity_id,action,comment,acted_by)
    select ${entityType},id,${decision}::workflow_status,${comment},${operator.full_name} from changed`
  else if(entityType==='reception')await sql`with changed as (update receptions set status=${decision}::workflow_status where id=${entityId}::uuid and status='pending' returning id) insert into approval_actions(entity_type,entity_id,action,comment,acted_by) select ${entityType},id,${decision}::workflow_status,${comment},${operator.full_name} from changed`
  else if(decision==='rejected')await sql`with changed as (update settlements set status='rejected',updated_at=now() where id=${entityId}::uuid and status='pending' returning id) insert into approval_actions(entity_type,entity_id,action,comment,acted_by) select ${entityType},id,'rejected'::workflow_status,${comment},${operator.full_name} from changed`
  else await sql`
    with candidate as (
      select s.*,r.supplier_id,p.legal_name,
        greatest(s.gross_amount_clp-s.other_deductions_clp,0)::bigint as payable,
        ca.id as account_id,coalesce(cb.balance_clp,0)::bigint as balance_clp,
        cr.recovery_kind,cr.recovery_value
      from settlements s join receptions r on r.id=s.reception_id join parties p on p.id=r.supplier_id
      left join lateral (
        select a.id from credit_accounts a join parties ap on ap.id=a.party_id
        where a.party_id=r.supplier_id or lower(trim(ap.legal_name))=lower(trim(p.legal_name))
        order by (a.party_id=r.supplier_id) desc limit 1
      ) ca on true
      left join credit_account_balances cb on cb.account_id=ca.id
      left join lateral (
        select q.recovery_kind,q.recovery_value from credit_requests q
        where q.account_id=ca.id and q.status='approved' order by q.approved_at desc nulls last limit 1
      ) cr on true
      where s.id=${entityId}::uuid and s.status='pending'
    ), calculated as (
      select *,least(balance_clp,payable,
        case recovery_kind
          when 'percentage' then round(payable*recovery_value/100)::bigint
          when 'fixed_amount' then recovery_value::bigint
          when 'full_balance' then balance_clp
          else 0
        end)::bigint as recovery
      from candidate
    ), changed as (
      update settlements s set status='approved',credit_recovery_clp=c.recovery,
        net_amount_clp=c.payable-c.recovery,settled_at=now(),approved_by=${operator.full_name},updated_at=now(),
        calculation_snapshot=s.calculation_snapshot||jsonb_build_object('creditBalanceBeforeClp',c.balance_clp,
          'creditRecoveryClp',c.recovery,'netAmountClp',c.payable-c.recovery,'approvalComment',${comment})
      from calculated c where s.id=c.id
      returning s.id,c.account_id,c.recovery
    ), movement as (
      insert into credit_movements (account_id,settlement_id,kind,amount_clp,comment,created_by)
      select account_id,id,'recovery',recovery,${comment},${operator.full_name} from changed
      where account_id is not null and recovery>0
      on conflict (settlement_id) where kind='recovery' do nothing
    )
    insert into approval_actions(entity_type,entity_id,action,comment,acted_by)
    select ${entityType},id,'approved'::workflow_status,${comment},${operator.full_name} from changed`
  return response.status(200).json({ok:true})
}

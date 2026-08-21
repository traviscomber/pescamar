import { getSql } from './_db.js'

type Request={method?:string;body?:unknown}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type DecisionInput={entityType?:unknown;entityId?:unknown;decision?:unknown;comment?:unknown;actedBy?:unknown}

export default async function handler(request:Request,response:Response){
  response.setHeader('Cache-Control','no-store')
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
      p.legal_name||' · '||r.gross_kg||' kg brutos', 'Recepción', r.source, r.created_at
    from receptions r join parties p on p.id=r.supplier_id where r.status='pending'
    order by created_at asc limit 200
  `
  return response.status(200).json({ok:true,items:rows})
}

async function decide(body:unknown,response:Response){
  const input=(body??{}) as DecisionInput
  const entityType=String(input.entityType??''),entityId=String(input.entityId??''),decision=String(input.decision??''),comment=String(input.comment??'').trim(),actedBy=String(input.actedBy??'').trim()
  if(!['credit_request','reception'].includes(entityType)||!['approved','rejected'].includes(decision)||!entityId||!comment||!actedBy)return response.status(400).json({ok:false,error:'Decisión, comentario y responsable son obligatorios'})
  const sql=getSql()
  if(entityType==='credit_request')await sql`with changed as (update credit_requests set status=${decision}::workflow_status, approved_at=case when ${decision}='approved' then now() else null end where id=${entityId}::uuid and status='pending' returning id) insert into approval_actions(entity_type,entity_id,action,comment,acted_by) select ${entityType},id,${decision}::workflow_status,${comment},${actedBy} from changed`
  else await sql`with changed as (update receptions set status=${decision}::workflow_status where id=${entityId}::uuid and status='pending' returning id) insert into approval_actions(entity_type,entity_id,action,comment,acted_by) select ${entityType},id,${decision}::workflow_status,${comment},${actedBy} from changed`
  return response.status(200).json({ok:true})
}

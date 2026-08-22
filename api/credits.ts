import { getSql } from './_db.js'

type Request={method?:string;body?:unknown}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type RecoveryKind='percentage'|'fixed_amount'|'full_balance'
type CreditInput={fisher?:unknown;amount?:unknown;reason?:unknown;recoveryKind?:unknown;recoveryValue?:unknown;requestedBy?:unknown}
const recoveryKinds=new Set<RecoveryKind>(['percentage','fixed_amount','full_balance'])

export default async function handler(request:Request,response:Response){
  response.setHeader('Cache-Control','no-store')
  try{
    if(request.method==='GET')return await listCredits(response)
    if(request.method==='POST')return await createCredit(request.body,response)
    response.setHeader('Allow','GET, POST')
    return response.status(405).json({ok:false,error:'Método no permitido'})
  }catch(error){
    const configuration=error instanceof Error&&error.message.includes('DATABASE_URL')
    return response.status(configuration?503:500).json({ok:false,error:configuration?'Base de datos no conectada':'No fue posible procesar la solicitud'})
  }
}

async function listCredits(response:Response){
  const rows=await getSql()`
    select cr.id, cr.request_number, p.legal_name as fisher, cr.amount_clp,
      cr.reason, cr.recovery_kind, cr.recovery_value, cr.status, cr.requested_at,
      coalesce(b.balance_clp, 0) as account_balance_clp
    from credit_requests cr
    join credit_accounts ca on ca.id=cr.account_id
    join parties p on p.id=ca.party_id
    left join credit_account_balances b on b.account_id=ca.id
    order by cr.requested_at desc limit 200
  `
  return response.status(200).json({ok:true,credits:rows})
}

async function createCredit(body:unknown,response:Response){
  const input=(body??{}) as CreditInput
  const fisher=String(input.fisher??'').trim(),reason=String(input.reason??'').trim(),requestedBy=String(input.requestedBy??'').trim()
  const amount=Number(input.amount),recoveryKind=String(input.recoveryKind??'') as RecoveryKind
  const recoveryValue=input.recoveryValue==null||input.recoveryValue===''?null:Number(input.recoveryValue)
  if(!fisher||!reason||!requestedBy||!Number.isSafeInteger(amount)||amount<=0||!recoveryKinds.has(recoveryKind))return response.status(400).json({ok:false,error:'Datos de solicitud incompletos o inválidos'})
  if(recoveryKind==='percentage'&&(!(recoveryValue&&recoveryValue>0&&recoveryValue<=100)))return response.status(400).json({ok:false,error:'El porcentaje debe estar entre 0 y 100'})
  if(recoveryKind==='fixed_amount'&&(!(recoveryValue&&recoveryValue>0)))return response.status(400).json({ok:false,error:'El monto fijo debe ser mayor que cero'})
  const rows=await getSql()`
    with existing_party as (
      select id from parties where lower(trim(legal_name))=lower(trim(${fisher})) order by created_at asc limit 1
    ), inserted_party as (
      insert into parties (kind, legal_name)
      select 'fisher', ${fisher} where not exists (select 1 from existing_party)
      returning id
    ), party as (
      select id from existing_party union all select id from inserted_party
    ), account as (
      insert into credit_accounts (party_id) select id from party
      on conflict (party_id) do update set currency=excluded.currency returning id
    )
    insert into credit_requests (account_id, amount_clp, reason, recovery_kind, recovery_value, requested_by)
    select id, ${amount}, ${reason}, ${recoveryKind}, ${recoveryValue}, ${requestedBy} from account
    returning id, request_number, status, requested_at
  `
  const credit=Array.isArray(rows)?rows[0]:null
  return response.status(201).json({ok:true,credit})
}

import { Check, CheckCheck, Clock3, KeyRound, LoaderCircle, MessageSquareText, Scale, ShieldCheck, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'

type Approval={entity_type:'credit_request'|'reception';entity_id:string;reference:string;title:string;detail:string;module:string;owner:string;created_at:string}
type Role='admin'|'operations'|'finance'|'quality'|'viewer'
type Operator={id:string;full_name:string;email:string;role:Role;active:boolean}
type ApiResponse={ok?:boolean;items?:Approval[];operators?:Operator[];error?:string}
const roleLabels:Record<Role,string>={admin:'Administrador',operations:'Operaciones',finance:'Finanzas',quality:'Calidad',viewer:'Lectura'}

export function Approvals(){
  const [token,setToken]=useState(''),[unlocked,setUnlocked]=useState(false),[items,setItems]=useState<Approval[]>([]),[operators,setOperators]=useState<Operator[]>([])
  const [comments,setComments]=useState<Record<string,string>>({}),[operatorId,setOperatorId]=useState(''),[loading,setLoading]=useState(false),[error,setError]=useState(''),[saving,setSaving]=useState('')
  const authorizedFetch=(path:string,init?:RequestInit)=>fetch(path,{...init,headers:{Authorization:`Bearer ${token}`,...(init?.headers??{})}})
  async function load(){
    const [approvalResponse,operatorResponse]=await Promise.all([authorizedFetch('/api/approvals'),authorizedFetch('/api/operators')])
    const approvalData=await approvalResponse.json() as ApiResponse,operatorData=await operatorResponse.json() as ApiResponse
    if(!approvalResponse.ok)throw new Error(approvalData.error??'No fue posible consultar las decisiones')
    if(!operatorResponse.ok)throw new Error(operatorData.error??'No fue posible consultar los operadores')
    const eligible=(operatorData.operators??[]).filter(operator=>operator.active&&operator.role!=='viewer')
    setItems(approvalData.items??[]);setOperators(eligible)
    setOperatorId(current=>eligible.some(operator=>operator.id===current)?current:(eligible[0]?.id??''))
  }
  async function unlock(event:FormEvent){
    event.preventDefault();setLoading(true);setError('')
    try{await load();setUnlocked(true)}catch(reason){setError(reason instanceof Error?reason.message:'No fue posible abrir la bandeja')}finally{setLoading(false)}
  }
  async function decide(item:Approval,decision:'approved'|'rejected'){
    const comment=(comments[item.entity_id]??'').trim()
    if(!comment||!operatorId){setError('Cada decisión requiere un operador autorizado y un comentario.');return}
    setSaving(item.entity_id);setError('')
    try{
      const response=await authorizedFetch('/api/approvals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entityType:item.entity_type,entityId:item.entity_id,decision,comment,operatorId})})
      const data=await response.json() as ApiResponse
      if(!response.ok)throw new Error(data.error??'No fue posible guardar la decisión')
      setComments(current=>{const next={...current};delete next[item.entity_id];return next})
      await load()
    }catch(reason){setError(reason instanceof Error?reason.message:'No fue posible guardar la decisión')}finally{setSaving('')}
  }
  return <><PageHeader eyebrow="Trabajo por excepción" title="Bandeja de decisiones" description="Una sola cola real para aprobar o rechazar acciones de todos los módulos, con identidad autorizada y comentario obligatorio."/>
    {!unlocked?<section className="panel operator-unlock"><KeyRound/><div><h2>Acceso protegido</h2><p>La bandeja contiene decisiones económicas y operacionales. La clave se valida en el servidor y no se guarda en el navegador.</p></div><form onSubmit={unlock}><input type="password" value={token} onChange={event=>setToken(event.target.value)} placeholder="Clave de administración" autoComplete="off" required/><button className="button primary" disabled={loading}>{loading?'Validando…':'Abrir bandeja'}</button></form>{error?<p className="form-error" role="alert">{error}</p>:null}</section>:
    <><section className="decision-toolbar"><div><small>Pendientes</small><b>{items.length}</b></div><label className="decision-operator">Operador responsable<select value={operatorId} onChange={event=>setOperatorId(event.target.value)} disabled={!operators.length}><option value="">{operators.length?'Seleccionar operador':'Sin operadores activos'}</option>{operators.map(operator=><option value={operator.id} key={operator.id}>{operator.full_name} · {roleLabels[operator.role]}</option>)}</select></label><p>El servidor valida que el operador siga activo y que su rol permita la decisión.</p></section>
    {error?<div className="notice error"><b>Atención.</b> {error}</div>:null}
    {!operators.length?<section className="panel empty-state"><ShieldCheck size={30}/><h3>Falta un operador autorizado</h3><p>Agrega al menos una persona activa con rol Administrador, Operaciones, Finanzas o Calidad.</p><Link className="button primary" to="/operadores">Configurar operadores</Link></section>:
    <section className="approval-list">{loading?<div className="panel empty-state"><LoaderCircle className="spin"/><h3>Consultando decisiones</h3></div>:items.length?items.map(item=><article className="panel approval-card approval-card-v2" key={item.entity_id}><div className="approval-symbol"><Scale size={19}/></div><div className="approval-copy"><header><div><span className="overline teal">{item.module} · {item.reference}</span><h2>{item.title}</h2></div><span className="priority high">Pendiente</span></header><p>{item.detail}</p><div className="approval-meta"><span><Clock3 size={13}/>{new Date(item.created_at).toLocaleString('es-CL',{dateStyle:'short',timeStyle:'short'})}</span><span>Solicita: <b>{item.owner}</b></span></div><div className="decision-fields decision-comment"><label><MessageSquareText size={15}/>Comentario obligatorio<input value={comments[item.entity_id]??''} onChange={event=>setComments(current=>({...current,[item.entity_id]:event.target.value}))} placeholder="Fundamento o instrucción"/></label></div><div className="decision-actions"><button className="decision reject" disabled={saving===item.entity_id} onClick={()=>void decide(item,'rejected')}><X size={15}/>Rechazar</button><button className="decision approve" disabled={saving===item.entity_id} onClick={()=>void decide(item,'approved')}><Check size={15}/>{saving===item.entity_id?'Guardando…':'Aprobar'}</button></div></div></article>):<div className="panel empty-state"><CheckCheck size={30}/><h3>No hay decisiones pendientes</h3><p>La bandeja se alimentará únicamente con recepciones y solicitudes reales enviadas a aprobación.</p></div>}</section>}</>}
  </>
}

import { Check, CheckCheck, Clock3, LoaderCircle, MessageSquareText, Scale, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '../components/PageHeader'

type Approval={entity_type:'credit_request'|'reception';entity_id:string;reference:string;title:string;detail:string;module:string;owner:string;created_at:string}
type ApiResponse={ok:boolean;items?:Approval[];error?:string}

export function Approvals(){
  const [items,setItems]=useState<Approval[]>([]),[comments,setComments]=useState<Record<string,string>>({}),[actors,setActors]=useState<Record<string,string>>({}),[loading,setLoading]=useState(true),[error,setError]=useState(''),[saving,setSaving]=useState('')
  const load=useCallback(async()=>{try{const response=await fetch('/api/approvals');const data=await response.json() as ApiResponse;if(!response.ok)throw new Error(data.error);setItems(data.items??[]);setError('')}catch(reason){setError(reason instanceof Error?reason.message:'No fue posible consultar las decisiones')}finally{setLoading(false)}},[])
  useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer)},[load])
  async function decide(item:Approval,decision:'approved'|'rejected'){
    const comment=(comments[item.entity_id]??'').trim(),actedBy=(actors[item.entity_id]??'').trim()
    if(!comment||!actedBy){setError('Cada decisión requiere responsable y comentario.');return}
    setSaving(item.entity_id);setError('')
    try{const response=await fetch('/api/approvals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entityType:item.entity_type,entityId:item.entity_id,decision,comment,actedBy})});const data=await response.json() as ApiResponse;if(!response.ok)throw new Error(data.error);await load()}catch(reason){setError(reason instanceof Error?reason.message:'No fue posible guardar la decisión')}finally{setSaving('')}
  }
  return <><PageHeader eyebrow="Trabajo por excepción" title="Bandeja de decisiones" description="Una sola cola real para aprobar o rechazar acciones de todos los módulos, siempre con responsable y comentario."/>
    <section className="decision-toolbar"><div><small>Pendientes</small><b>{loading?'—':items.length}</b></div><p>Ordenadas desde la solicitud más antigua. El historial aprobado y rechazado queda en auditoría.</p></section>
    {error?<div className="notice error"><b>Atención.</b> {error}</div>:null}
    <section className="approval-list">{loading?<div className="panel empty-state"><LoaderCircle className="spin"/><h3>Consultando decisiones</h3></div>:items.length?items.map(item=><article className="panel approval-card approval-card-v2" key={item.entity_id}><div className="approval-symbol"><Scale size={19}/></div><div className="approval-copy"><header><div><span className="overline teal">{item.module} · {item.reference}</span><h2>{item.title}</h2></div><span className="priority high">Pendiente</span></header><p>{item.detail}</p><div className="approval-meta"><span><Clock3 size={13}/>{new Date(item.created_at).toLocaleString('es-CL',{dateStyle:'short',timeStyle:'short'})}</span><span>Solicita: <b>{item.owner}</b></span></div><div className="decision-fields"><label>Responsable de la decisión<input value={actors[item.entity_id]??''} onChange={event=>setActors(current=>({...current,[item.entity_id]:event.target.value}))} placeholder="Nombre del operador"/></label><label><MessageSquareText size={15}/>Comentario obligatorio<input value={comments[item.entity_id]??''} onChange={event=>setComments(current=>({...current,[item.entity_id]:event.target.value}))} placeholder="Fundamento o instrucción"/></label></div><div className="decision-actions"><button className="decision reject" disabled={saving===item.entity_id} onClick={()=>void decide(item,'rejected')}><X size={15}/>Rechazar</button><button className="decision approve" disabled={saving===item.entity_id} onClick={()=>void decide(item,'approved')}><Check size={15}/>{saving===item.entity_id?'Guardando…':'Aprobar'}</button></div></div></article>):<div className="panel empty-state"><CheckCheck size={30}/><h3>No hay decisiones pendientes</h3><p>La bandeja se alimentará únicamente con recepciones y solicitudes reales enviadas a aprobación.</p></div>}</section>
  </>
}

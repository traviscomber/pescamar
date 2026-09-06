import {useEffect,useState} from 'react'

type Lifecycle={
 available:boolean
 state:'open'|'closed'
 latest:{action:'close'|'reopen';reason:string;occurredAt:string|null;createdBy:string}|null
 gate:{canClose:boolean;blockers:string[];unknowns:string[]}
 permissions:{canClose:boolean;canReopen:boolean}
 error?:string
}

const dt=(value:string|null|undefined)=>value?new Intl.DateTimeFormat('es-CL',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'—'

export function LotLifecycleControl({receptionId}:{receptionId:string}){
 const [data,setData]=useState<Lifecycle|null>(null),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 async function load(){
  try{const response=await fetch(`/api/lot-lifecycle?receptionId=${encodeURIComponent(receptionId)}`,{cache:'no-store'}),payload=await response.json() as Lifecycle;if(!response.ok)throw new Error(payload.error??'No fue posible cargar el cierre');setData(payload);setError('')}catch(cause){setError(cause instanceof Error?cause.message:'No fue posible cargar el cierre')}
 }
 useEffect(()=>{void load();const refresh=()=>void load();window.addEventListener('pescamar:data-updated',refresh);return()=>window.removeEventListener('pescamar:data-updated',refresh)},[receptionId])
 async function act(action:'close'|'reopen'){
  if(reason.trim().length<5){setError('Agrega un fundamento breve para mantener trazabilidad.');return}
  setBusy(true)
  try{const response=await fetch('/api/lot-lifecycle',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({receptionId,action,reason:reason.trim()})}),payload=await response.json() as Lifecycle&{error?:string;blockers?:string[]};if(!response.ok)throw new Error(payload.blockers?.[0]??payload.error??'No fue posible actualizar el lote');setReason('');setData(payload);setError('');window.dispatchEvent(new CustomEvent('pescamar:data-updated'))}catch(cause){setError(cause instanceof Error?cause.message:'No fue posible actualizar el lote')}finally{setBusy(false)}
 }
 if(!data?.available)return null
 return <details className="lot360-fold"><summary><span><b>Cierre operacional</b></span><small>{data.state==='closed'?'Cerrado':'Abierto'}</small></summary><div className="lot360-fold-body">
  {error?<div className="system-banner error" role="alert">{error}</div>:null}
  {data.state==='closed'?<><div className="daily-clear-note"><div><b>Lote cerrado operacionalmente</b><small>{data.latest?`${dt(data.latest.occurredAt)} · ${data.latest.createdBy} · ${data.latest.reason}`:'Sin detalle adicional'}</small></div></div>{data.permissions.canReopen?<div className="form-grid"><label>Fundamento de reapertura<input value={reason} onChange={event=>setReason(event.target.value)} maxLength={500} placeholder="Por qué vuelve a operación"/></label><div><button className="button secondary" type="button" disabled={busy} onClick={()=>void act('reopen')}>{busy?'Actualizando…':'Reabrir lote'}</button></div></div>:null}</>:<><div className="lot360-caveat">El cierre operacional saca este lote del Control Tower. No borra recepción, evidencia, trazabilidad ni resultado comercial.</div>{data.gate.blockers.length?<div className="queue-list">{data.gate.blockers.map((blocker,index)=><div className="queue-row" key={`${blocker}-${index}`}><span className="queue-priority">{index+1}</span><div><b>Antes de cerrar</b><small>{blocker}</small></div></div>)}</div>:<div className="daily-clear-note"><div><b>Listo para cierre operacional</b><small>Los gates determinísticos mínimos están completos.</small></div></div>}{data.permissions.canClose&&data.gate.canClose?<div className="form-grid"><label>Fundamento de cierre<input value={reason} onChange={event=>setReason(event.target.value)} maxLength={500} placeholder="Ej. proceso terminado y saldo conciliado"/></label><div><button className="button secondary" type="button" disabled={busy} onClick={()=>void act('close')}>{busy?'Cerrando…':'Cerrar lote'}</button></div></div>:null}</>}
 </div></details>
}

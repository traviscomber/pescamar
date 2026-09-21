import {useCallback,useEffect,useState} from 'react'
import {useLocale} from '../i18n'

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
 const {t}=useLocale()
 const [data,setData]=useState<Lifecycle|null>(null),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const load=useCallback(async()=>{
  try{const response=await fetch(`/api/lot-lifecycle?receptionId=${encodeURIComponent(receptionId)}`,{cache:'no-store'}),payload=await response.json() as Lifecycle;if(!response.ok)throw new Error(payload.error??t('lot360.lifecycleLoadError'));setData(payload);setError('')}catch(cause){setError(cause instanceof Error?cause.message:t('lot360.lifecycleLoadError'))}
 },[receptionId,t])
 useEffect(()=>{void load();const refresh=()=>void load();window.addEventListener('pescamar:data-updated',refresh);return()=>window.removeEventListener('pescamar:data-updated',refresh)},[load])
 async function act(action:'close'|'reopen'){
  if(reason.trim().length<5){setError(t('lot360.reasonRequired'));return}
  setBusy(true)
  try{const response=await fetch('/api/lot-lifecycle',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({receptionId,action,reason:reason.trim()})}),payload=await response.json() as Lifecycle&{error?:string;blockers?:string[]};if(!response.ok)throw new Error(payload.blockers?.[0]??payload.error??t('lot360.lifecycleUpdateError'));setReason('');setData(payload);setError('');window.dispatchEvent(new CustomEvent('pescamar:data-updated'))}catch(cause){setError(cause instanceof Error?cause.message:t('lot360.lifecycleUpdateError'))}finally{setBusy(false)}
 }
 if(!data?.available)return null
 return <details className="lot360-fold"><summary><span><b>{t('lot360.operationalClose')}</b></span><small>{data.state==='closed'?t('lot360.stateClosed'):t('lot360.stateOpen')}</small></summary><div className="lot360-fold-body">
  {error?<div className="system-banner error" role="alert">{error}</div>:null}
  {data.state==='closed'?<><div className="daily-clear-note"><div><b>{t('lot360.lotClosed')}</b><small>{data.latest?`${dt(data.latest.occurredAt)} · ${data.latest.createdBy} · ${data.latest.reason}`:t('lot360.noExtraDetail')}</small></div></div>{data.permissions.canReopen?<div className="form-grid"><label>{t('lot360.reopenReason')}<input value={reason} onChange={event=>setReason(event.target.value)} maxLength={500} placeholder={t('lot360.reopenReasonPlaceholder')}/></label><div><button className="button secondary" type="button" disabled={busy} onClick={()=>void act('reopen')}>{busy?t('lot360.updating'):t('lot360.reopenLot')}</button></div></div>:null}</>:<><div className="lot360-caveat">{t('lot360.closeCaveat')}</div>{data.gate.blockers.length?<div className="queue-list">{data.gate.blockers.map((blocker,index)=><div className="queue-row" key={`${blocker}-${index}`}><span className="queue-priority">{index+1}</span><div><b>{t('lot360.beforeClose')}</b><small>{blocker}</small></div></div>)}</div>:<div className="daily-clear-note"><div><b>{t('lot360.readyToClose')}</b><small>{t('lot360.gatesComplete')}</small></div></div>}{data.permissions.canClose&&data.gate.canClose?<div className="form-grid"><label>{t('lot360.closeReason')}<input value={reason} onChange={event=>setReason(event.target.value)} maxLength={500} placeholder={t('lot360.closeReasonPlaceholder')}/></label><div><button className="button secondary" type="button" disabled={busy} onClick={()=>void act('close')}>{busy?t('lot360.closing'):t('lot360.closeLot')}</button></div></div>:null}</>}
 </div></details>
}

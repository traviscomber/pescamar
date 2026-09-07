import {useEffect,useRef,useState} from 'react'
import {ScanLine,ShieldCheck} from 'lucide-react'
import {useAuth} from '../auth'

type BatchResponse={ok?:boolean;error?:string;analysis?:{processed?:number;succeeded?:number;failed?:number;remaining?:number|null}}

export function AutoPrepareUniReferences(){
 const {operator}=useAuth()
 const started=useRef(false)
 const [status,setStatus]=useState('')
 const [error,setError]=useState('')
 const requested=typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('prepare')==='1'
 const allowed=operator&&['admin','quality'].includes(operator.role)
 useEffect(()=>{
  if(!requested||!allowed||started.current)return
  started.current=true
  let active=true
  void (async()=>{
   try{
    let remaining=50,total=0,round=0
    while(remaining>0&&round<20){
     round++
     if(active)setStatus(`Preparando resultados Vision · lote ${round}`)
     const response=await fetch('/api/sea-urchin-external-references',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'analyze_pending',limit:5})})
     const data=await response.json().catch(()=>({})) as BatchResponse
     if(!response.ok)throw new Error(data.error||'No fue posible preparar los análisis Vision')
     total+=data.analysis?.succeeded??0
     remaining=typeof data.analysis?.remaining==='number'?data.analysis.remaining:0
     if(active)setStatus(`${total} resultados preparados · ${remaining} pendientes`)
     if((data.analysis?.processed??0)===0)break
    }
    if(active)setStatus(remaining===0?'Todas las referencias con imagen quedaron listas para revisión de Calidad.':`${remaining} referencias requieren reintento.`)
   }catch(cause){if(active)setError(cause instanceof Error?cause.message:'No fue posible preparar los análisis Vision')}
  })()
  return()=>{active=false}
 },[requested,allowed])
 if(!requested||!allowed)return null
 return <section className="panel"><div className="governance-note"><ShieldCheck size={19}/><div><b>Preparación de evidencia Vision</b><p>{error||status||'Iniciando análisis de referencias pendientes…'}</p><small>Este proceso sólo genera evidencia derivada para revisión. No aprueba, no asigna Grade y no crea decisiones humanas.</small></div><ScanLine size={18}/></div></section>
}

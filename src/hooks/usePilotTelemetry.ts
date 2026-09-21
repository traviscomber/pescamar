import {useEffect,useRef} from 'react'
import {useLocation} from 'react-router-dom'
import {useLocale} from '../i18n'

// Invisible pilot telemetry: route-visit beacons with path only (never query
// strings), batched and delivered with navigator.sendBeacon so navigation and
// tab close do not lose events. If sendBeacon is unavailable the module is a
// complete no-op by design. Admin surfaces are not instrumented.

const FLUSH_MS=15_000
const MAX_QUEUE=40
const EVENT='route_visited' as const

type PilotEvent={event:typeof EVENT;path:string;locale:'es'|'en'}

function deliver(events:PilotEvent[]):Promise<boolean>{
 const body=JSON.stringify({events})
 const beacon=new Blob([body],{type:'application/json'})
 if(typeof navigator.sendBeacon==='function'&&navigator.sendBeacon('/api/pilot-events',beacon))return Promise.resolve(true)
 // Fallback only when the beacon API exists but the payload could not be queued.
 return fetch('/api/pilot-events',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true}).then(response=>response.ok).catch(()=>false)
}

export function usePilotTelemetry(active:boolean){
 const {pathname}=useLocation()
 const {locale}=useLocale()
 const queue=useRef<PilotEvent[]>([])
 const localeRef=useRef(locale)
 useEffect(()=>{localeRef.current=locale},[locale])
 useEffect(()=>{
  if(!active)return
  if(typeof navigator==='undefined'||typeof navigator.sendBeacon!=='function')return
  if(pathname.startsWith('/admin'))return
  queue.current.push({event:EVENT,path:pathname,locale:localeRef.current==='en'?'en':'es'})
  if(queue.current.length>MAX_QUEUE)queue.current.splice(0,queue.current.length-MAX_QUEUE)
 },[active,pathname])
 useEffect(()=>{
  if(!active)return
  if(typeof navigator==='undefined'||typeof navigator.sendBeacon!=='function')return
  let cancelled=false
  const flush=()=>{
   if(cancelled||!queue.current.length)return
   const batch=queue.current
   queue.current=[]
   void deliver(batch).then(sent=>{if(!sent&&queue.current.length<MAX_QUEUE)queue.current.unshift(...batch.slice(-MAX_QUEUE))})
  }
  const timer=window.setInterval(flush,FLUSH_MS)
  window.addEventListener('pagehide',flush)
  return()=>{cancelled=true;window.clearInterval(timer);window.removeEventListener('pagehide',flush)}
 },[active])
}

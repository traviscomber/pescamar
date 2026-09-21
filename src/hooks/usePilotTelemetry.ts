import {useEffect,useRef} from 'react'
import {useLocation} from 'react-router-dom'
import {useLocale} from '../i18n'

// Invisible pilot telemetry: one instrumentation_heartbeat per mounted
// session plus route-visit beacons with path only (never query strings),
// batched and delivered with navigator.sendBeacon so navigation and tab
// close do not lose events. If sendBeacon is unavailable the module is a
// complete no-op by design. Route visits are not instrumented on admin
// surfaces, but the heartbeat always fires once per session so a dead
// pipeline is detected within minutes, even parked on /admin pages.

const FLUSH_MS=15_000
const MAX_QUEUE=40
const ROUTE_EVENT='route_visited' as const
const HEARTBEAT_EVENT='instrumentation_heartbeat' as const

type PilotEvent={event:typeof ROUTE_EVENT|typeof HEARTBEAT_EVENT;path:string;locale:'es'|'en'}

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
 const pathnameRef=useRef(pathname)
 const heartbeatSent=useRef(false)
 useEffect(()=>{localeRef.current=locale},[locale])
 useEffect(()=>{pathnameRef.current=pathname},[pathname])
 useEffect(()=>{
  if(!active)return
  if(typeof navigator==='undefined'||typeof navigator.sendBeacon!=='function')return
  if(!heartbeatSent.current){
   heartbeatSent.current=true
   queue.current.push({event:HEARTBEAT_EVENT,path:pathnameRef.current,locale:localeRef.current==='en'?'en':'es'})
  }
  if(pathname.startsWith('/admin'))return
  queue.current.push({event:ROUTE_EVENT,path:pathname,locale:localeRef.current==='en'?'en':'es'})
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

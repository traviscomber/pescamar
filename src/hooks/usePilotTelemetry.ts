import {useEffect,useRef} from 'react'
import {useLocation} from 'react-router-dom'
import {useLocale} from '../i18n'

// Invisible pilot telemetry: one instrumentation_heartbeat per browser tab
// session plus route-visit beacons with path only (never query strings),
// batched and delivered with navigator.sendBeacon so navigation and tab
// close do not lose events. If sendBeacon is unavailable the module is a
// complete no-op by design. Route visits are not instrumented on admin
// surfaces, but the heartbeat always fires once per session so a dead
// pipeline is detected within minutes, even parked on /admin pages.
//
// Session guarantees (all backed by sessionStorage, in-memory fallback when
// storage is unavailable):
// - the queue and dedupe state live at module level, so SPA remounts of the
//   host component (auth revalidation flashes, StrictMode, suspense retries)
//   neither duplicate heartbeats nor drop queued events;
// - exactly one heartbeat per tab session, even across reloads (the build
//   watcher reloads after deploys must not look like new sessions);
// - the same path is never queued twice within a 2 s window, so redirect
//   flapping or double navigation inflates neither visit counts nor the
//   per-screen time derived from them;
// - locale is attached at flush time from the i18n context, never cached
//   from an earlier mount.

const FLUSH_MS=15_000
const MAX_QUEUE=40
const ROUTE_EVENT='route_visited' as const
const HEARTBEAT_EVENT='instrumentation_heartbeat' as const
const HEARTBEAT_KEY='pescamar:pilot-heartbeat-at'
const LAST_ROUTE_KEY='pescamar:pilot-last-route'
const ROUTE_DEDUPE_MS=2_000

type PilotEvent={event:typeof ROUTE_EVENT|typeof HEARTBEAT_EVENT;path:string}
type LocaleCode='es'|'en'

// Module-level session state: survives host-component remounts within the
// same page load. sessionStorage extends the same guarantees across reloads.
const queue:PilotEvent[]=[]
const memorySession={heartbeat:false,lastPath:'',lastAt:0}

function storageGet(key:string):string{
 try{return window.sessionStorage.getItem(key)??''}catch{return ''}
}
function storageSet(key:string,value:string){
 try{window.sessionStorage.setItem(key,value)}catch{/* storage denied: in-memory fallback below */}
}

function heartbeatAlreadySent():boolean{
 if(storageGet(HEARTBEAT_KEY))return true
 return memorySession.heartbeat
}
function markHeartbeatSent(){
 memorySession.heartbeat=true
 storageSet(HEARTBEAT_KEY,String(Date.now()))
}
function routeQueuedRecently(pathname:string):boolean{
 const raw=storageGet(LAST_ROUTE_KEY)
 const [lastPath,lastAt]=raw.split('|')
 const recent=lastPath===pathname&&Date.now()-Number(lastAt)<ROUTE_DEDUPE_MS
 const memoryRecent=memorySession.lastPath===pathname&&Date.now()-memorySession.lastAt<ROUTE_DEDUPE_MS
 if(!recent&&!memoryRecent){
  memorySession.lastPath=pathname
  memorySession.lastAt=Date.now()
  storageSet(LAST_ROUTE_KEY,`${pathname}|${Date.now()}`)
 }
 return recent||memoryRecent
}

function deliver(events:PilotEvent[],locale:LocaleCode):Promise<boolean>{
 const body=JSON.stringify({events:events.map(event=>({...event,locale}))})
 const beacon=new Blob([body],{type:'application/json'})
 if(typeof navigator.sendBeacon==='function'&&navigator.sendBeacon('/api/pilot-events',beacon))return Promise.resolve(true)
 // Fallback only when the beacon API exists but the payload could not be queued.
 return fetch('/api/pilot-events',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true}).then(response=>response.ok).catch(()=>false)
}

export function usePilotTelemetry(active:boolean){
 const {pathname}=useLocation()
 const {locale}=useLocale()
 const localeRef=useRef<LocaleCode>(locale==='en'?'en':'es')
 useEffect(()=>{localeRef.current=locale==='en'?'en':'es'},[locale])
 useEffect(()=>{
  if(!active)return
  if(typeof navigator==='undefined'||typeof navigator.sendBeacon!=='function')return
  if(!heartbeatAlreadySent()){
   markHeartbeatSent()
   queue.push({event:HEARTBEAT_EVENT,path:pathname})
  }
  if(pathname.startsWith('/admin'))return
  if(routeQueuedRecently(pathname))return
  queue.push({event:ROUTE_EVENT,path:pathname})
  if(queue.length>MAX_QUEUE)queue.splice(0,queue.length-MAX_QUEUE)
 },[active,pathname])
 useEffect(()=>{
  if(!active)return
  if(typeof navigator==='undefined'||typeof navigator.sendBeacon!=='function')return
  let cancelled=false
  const flush=()=>{
   if(cancelled||!queue.length)return
   const batch=queue.splice(0,queue.length)
   void deliver(batch,localeRef.current).then(sent=>{if(!sent&&queue.length<MAX_QUEUE)queue.unshift(...batch.slice(-MAX_QUEUE))})
  }
  const timer=window.setInterval(flush,FLUSH_MS)
  window.addEventListener('pagehide',flush)
  return()=>{cancelled=true;window.clearInterval(timer);window.removeEventListener('pagehide',flush)}
 },[active])
}

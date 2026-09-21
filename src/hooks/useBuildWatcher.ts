import {useEffect} from 'react'

// Build staleness watcher: a single-page session keeps running the bundle it
// was opened with, so after a deployment every already-open tab runs old code
// until the user reloads manually. That is how pilot telemetry shipped
// without ever executing in active sessions. Poll the served HTML shell and,
// when it references a newer main asset than the one this tab loaded, reload
// once. Reloads are guarded against loops and jittered against herds.

const FIRST_CHECK_MS=2_000
const POLL_MS=5*60_000
const RELOAD_GUARD_MS=10*60_000
const RELOAD_JITTER_MS=30_000
const RELOAD_GUARD_KEY='pescamar-build-reload-at'

const assetPattern=/\/assets\/main-[A-Za-z0-9_-]+\.js/

function loadedAsset(){
 const script=document.querySelector('script[src*="/assets/main-"]')
 const src=script?.getAttribute('src')??''
 const match=src.match(assetPattern)
 return match?match[0]:null
}

export function useBuildWatcher(){
 useEffect(()=>{
  if(typeof window==='undefined'||typeof document==='undefined')return
  let cancelled=false
  let timer:number|undefined
  const check=async()=>{
   if(cancelled)return
   try{
    const response=await fetch(window.location.pathname,{cache:'no-store',credentials:'same-origin'})
    if(!response.ok)return
    const html=await response.text()
    const live=html.match(assetPattern)
    const loaded=loadedAsset()
    if(!live||!loaded||live[0]===loaded)return
    const last=Number(window.sessionStorage.getItem(RELOAD_GUARD_KEY)??0)
    if(Date.now()-last<RELOAD_GUARD_MS)return
    window.sessionStorage.setItem(RELOAD_GUARD_KEY,String(Date.now()))
    window.setTimeout(()=>{if(!cancelled)window.location.reload()},Math.floor(Math.random()*RELOAD_JITTER_MS))
   }catch{/* offline or transient failure: retry on next poll */}
  }
  const schedule=(delay:number)=>{
   if(cancelled)return
   timer=window.setTimeout(()=>{void check();schedule(POLL_MS)},delay)
  }
  schedule(FIRST_CHECK_MS+Math.floor(Math.random()*1_000))
  return()=>{cancelled=true;if(timer!==undefined)window.clearTimeout(timer)}
 },[])
}

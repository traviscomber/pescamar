import { useCallback, useEffect, useState } from 'react'

export type PlatformStatus={ok:boolean;platform:string;environment:string;persistence:{database:boolean;files:boolean};metrics:{pendingDecisions:number;pendingCredits:number;activeOperators:number;receptions:number};commit:string|null;checkedAt:string}

const STATUS_REFRESH_MS=60_000

export function usePlatformStatus(){
  const [status,setStatus]=useState<PlatformStatus|null>(null),[error,setError]=useState(false)
  const refresh=useCallback(async(signal?:AbortSignal)=>{
    try{
      const response=await fetch('/api/status',{signal,cache:'no-store'})
      if(!response.ok)throw new Error('status unavailable')
      const data=await response.json() as PlatformStatus
      setStatus(data);setError(false)
    }catch(reason){if((reason as Error).name!=='AbortError')setError(true)}
  },[])
  useEffect(()=>{
    const controller=new AbortController()
    void refresh(controller.signal)
    const interval=window.setInterval(()=>{if(document.visibilityState==='visible')void refresh()},STATUS_REFRESH_MS)
    const onVisible=()=>{if(document.visibilityState==='visible')void refresh()}
    window.addEventListener('focus',onVisible)
    document.addEventListener('visibilitychange',onVisible)
    return()=>{controller.abort();window.clearInterval(interval);window.removeEventListener('focus',onVisible);document.removeEventListener('visibilitychange',onVisible)}
  },[refresh])
  return {status,error,refresh}
}

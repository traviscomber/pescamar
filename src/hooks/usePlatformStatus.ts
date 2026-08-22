import { useEffect, useState } from 'react'

export type PlatformStatus={ok:boolean;platform:string;environment:string;persistence:{database:boolean;files:boolean};metrics:{pendingDecisions:number;pendingCredits:number;activeOperators:number;receptions:number};commit:string|null;checkedAt:string}

export function usePlatformStatus(){
  const [status,setStatus]=useState<PlatformStatus|null>(null),[error,setError]=useState(false)
  useEffect(()=>{const controller=new AbortController();fetch('/api/status',{signal:controller.signal}).then(response=>{if(!response.ok)throw new Error('status unavailable');return response.json() as Promise<PlatformStatus>}).then(data=>setStatus(data)).catch(reason=>{if((reason as Error).name!=='AbortError')setError(true)});return()=>controller.abort()},[])
  return {status,error}
}

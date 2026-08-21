import type { ImportBatch, PlantState } from './plantImport'

type PlantStateResponse={ok:boolean;plants:PlantState[]|null;history:ImportBatch[]}

async function api<T>(method:string,body?:unknown):Promise<T>{
  const response=await fetch('/api/plant-state',{method,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined})
  if(!response.ok)throw new Error(`plant-state ${response.status}`)
  return response.json() as Promise<T>
}

export const fetchSharedPlantState=()=>api<PlantStateResponse>('GET')
export const publishSharedPlantState=(batch:ImportBatch)=>api<{ok:true;batchId:string}>('POST',{batch})
export const revertSharedPlantState=(batchId:string)=>api<{ok:true;plants:PlantState[]}>('PATCH',{batchId})

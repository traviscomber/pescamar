export type FloorPackingRequest={
 action:'createPackingUnit'
 stationId:string
 receptionId:string
 packingUnitCode:string
 idempotencyKey:string
 netKg:number
 occurredAt:string
}

export type FloorQueueRecord={
 id:string
 request:FloorPackingRequest
 createdAt:string
 attempts:number
 status:'pending'|'attention'
 lastError?:string
}

const DB_NAME='pescamar-floor'
const DB_VERSION=1
const STORE_NAME='packing-queue'

function openDb():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open(DB_NAME,DB_VERSION)
  request.onupgradeneeded=()=>{
   const db=request.result
   if(!db.objectStoreNames.contains(STORE_NAME))db.createObjectStore(STORE_NAME,{keyPath:'id'})
  }
  request.onsuccess=()=>resolve(request.result)
  request.onerror=()=>reject(request.error??new Error('No fue posible abrir cola offline'))
 })
}

async function withStore<T>(mode:IDBTransactionMode,work:(store:IDBObjectStore,done:(value:T)=>void,fail:(error:unknown)=>void)=>void):Promise<T>{
 const db=await openDb()
 return new Promise<T>((resolve,reject)=>{
  const tx=db.transaction(STORE_NAME,mode),store=tx.objectStore(STORE_NAME)
  let settled=false,result:T
  const done=(value:T)=>{result=value;settled=true}
  const fail=(error:unknown)=>{if(!settled){settled=true;reject(error)}}
  tx.oncomplete=()=>{db.close();if(settled)resolve(result)}
  tx.onerror=()=>{db.close();fail(tx.error??new Error('Falló la cola offline'))}
  tx.onabort=()=>{db.close();fail(tx.error??new Error('Operación offline abortada'))}
  work(store,done,fail)
 })
}

export async function listFloorQueue():Promise<FloorQueueRecord[]>{
 return withStore<FloorQueueRecord[]>('readonly',(store,done,fail)=>{
  const request=store.getAll()
  request.onsuccess=()=>done((request.result as FloorQueueRecord[]).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)))
  request.onerror=()=>fail(request.error)
 })
}

export async function queueFloorPacking(request:FloorPackingRequest):Promise<FloorQueueRecord>{
 const record:FloorQueueRecord={id:request.idempotencyKey,request,createdAt:new Date().toISOString(),attempts:0,status:'pending'}
 return withStore<FloorQueueRecord>('readwrite',(store,done,fail)=>{
  const get=store.get(record.id)
  get.onsuccess=()=>{
   const existing=get.result as FloorQueueRecord|undefined
   if(existing){done(existing);return}
   const put=store.put(record)
   put.onsuccess=()=>done(record)
   put.onerror=()=>fail(put.error)
  }
  get.onerror=()=>fail(get.error)
 })
}

export async function removeFloorQueue(id:string):Promise<void>{
 return withStore<void>('readwrite',(store,done,fail)=>{
  const request=store.delete(id)
  request.onsuccess=()=>done(undefined)
  request.onerror=()=>fail(request.error)
 })
}

export async function markFloorQueueAttempt(id:string,error?:string,attention=false):Promise<void>{
 return withStore<void>('readwrite',(store,done,fail)=>{
  const get=store.get(id)
  get.onsuccess=()=>{
   const record=get.result as FloorQueueRecord|undefined
   if(!record){done(undefined);return}
   const updated:FloorQueueRecord={...record,attempts:record.attempts+1,status:attention?'attention':'pending',lastError:error||undefined}
   const put=store.put(updated)
   put.onsuccess=()=>done(undefined)
   put.onerror=()=>fail(put.error)
  }
  get.onerror=()=>fail(get.error)
 })
}

export async function pendingFloorQueueCount():Promise<number>{
 const rows=await listFloorQueue()
 return rows.filter(row=>row.status==='pending').length
}

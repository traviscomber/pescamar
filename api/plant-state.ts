import { neon } from '@neondatabase/serverless'

type ApiRequest={method?:string;body?:unknown}
type ApiResponse={status:(code:number)=>ApiResponse;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type ImportBatch={id:string;fileName:string;periods:string[];plantIds:string[];rowCount:number;publishedAt:string;publishedBy:string;previousPlants:unknown[];resultingPlants:unknown[];revertedAt?:string}
declare const process:{env:Record<string,string|undefined>}

const isBatch=(value:unknown):value is ImportBatch=>{
  if(!value||typeof value!=='object')return false
  const batch=value as Partial<ImportBatch>
  return typeof batch.id==='string'&&batch.id.length<=80&&typeof batch.fileName==='string'&&batch.fileName.length<=255&&Array.isArray(batch.periods)&&Array.isArray(batch.plantIds)&&Number.isInteger(batch.rowCount)&&Number(batch.rowCount)>0&&typeof batch.publishedAt==='string'&&!Number.isNaN(Date.parse(batch.publishedAt))&&typeof batch.publishedBy==='string'&&Array.isArray(batch.previousPlants)&&Array.isArray(batch.resultingPlants)
}

export default async function handler(request:ApiRequest,response:ApiResponse){
  response.setHeader('Cache-Control','no-store')
  const connection=process.env.DATABASE_URL
  if(!connection)return response.status(503).json({ok:false,error:'database_not_configured'})
  const sql=neon(connection)
  try{
    if(request.method==='GET'){
      const [state,history]=await Promise.all([
        sql`SELECT plants, updated_at FROM plant_current_state WHERE state_key = 'current'`,
        sql`SELECT id, file_name, periods, plant_ids, row_count, published_at, published_by, previous_plants, resulting_plants, reverted_at FROM plant_import_batches ORDER BY published_at DESC LIMIT 10`,
      ])
      return response.status(200).json({ok:true,plants:state[0]?.plants??null,updatedAt:state[0]?.updated_at??null,history:history.map(row=>({id:row.id,fileName:row.file_name,periods:row.periods,plantIds:row.plant_ids,rowCount:row.row_count,publishedAt:row.published_at,publishedBy:row.published_by,previousPlants:row.previous_plants,resultingPlants:row.resulting_plants,revertedAt:row.reverted_at??undefined}))})
    }
    if(request.method==='POST'){
      const batch=(request.body as {batch?:unknown}|undefined)?.batch
      if(!isBatch(batch))return response.status(400).json({ok:false,error:'invalid_batch'})
      await sql.transaction([
        sql`INSERT INTO plant_import_batches (id,file_name,periods,plant_ids,row_count,published_at,published_by,previous_plants,resulting_plants) VALUES (${batch.id},${batch.fileName},${batch.periods},${batch.plantIds},${batch.rowCount},${batch.publishedAt},${batch.publishedBy},${JSON.stringify(batch.previousPlants)},${JSON.stringify(batch.resultingPlants)})`,
        sql`INSERT INTO plant_current_state (state_key,plants,latest_batch_id,updated_at) VALUES ('current',${JSON.stringify(batch.resultingPlants)},${batch.id},now()) ON CONFLICT (state_key) DO UPDATE SET plants=EXCLUDED.plants,latest_batch_id=EXCLUDED.latest_batch_id,updated_at=now()`,
      ])
      return response.status(201).json({ok:true,batchId:batch.id})
    }
    if(request.method==='PATCH'){
      const batchId=(request.body as {batchId?:unknown}|undefined)?.batchId
      if(typeof batchId!=='string'||!batchId)return response.status(400).json({ok:false,error:'invalid_batch_id'})
      const rows=await sql`WITH reverted AS (UPDATE plant_import_batches SET reverted_at=now() WHERE id=${batchId} AND reverted_at IS NULL RETURNING id,previous_plants) INSERT INTO plant_current_state (state_key,plants,latest_batch_id,updated_at) SELECT 'current',previous_plants,NULL,now() FROM reverted ON CONFLICT (state_key) DO UPDATE SET plants=EXCLUDED.plants,latest_batch_id=NULL,updated_at=now() RETURNING plants`
      if(!rows.length)return response.status(409).json({ok:false,error:'batch_not_revertible'})
      return response.status(200).json({ok:true,plants:rows[0].plants})
    }
    response.setHeader('Allow','GET, POST, PATCH')
    return response.status(405).json({ok:false,error:'method_not_allowed'})
  }catch(error){
    console.error('plant-state',error)
    return response.status(500).json({ok:false,error:'persistence_failed'})
  }
}

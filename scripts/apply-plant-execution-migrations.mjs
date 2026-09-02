import {readFile} from 'node:fs/promises'
import {Client} from '@neondatabase/serverless'

const files=[
 '033_plant_execution_foundation.sql',
 '034_label_engine.sql',
 '035_pallets.sql',
 '036_cold_chain.sql',
 '037_regulatory_holds.sql',
 '038_regulatory_pallet_membership_freeze.sql',
 '039_cold_asset_active_run_exclusion.sql',
 '040_cold_sensor_station_scope.sql',
]

if(process.env.VERCEL_ENV!=='production'){
 console.log('[plant-execution-migrate] skip: non-production build')
 process.exit(0)
}
if(process.env.PLANT_EXECUTION_WRITES_ENABLED==='true'){
 throw new Error('[plant-execution-migrate] refuse: writes already enabled before schema verification')
}
const databaseUrl=process.env.DATABASE_URL
if(!databaseUrl)throw new Error('[plant-execution-migrate] DATABASE_URL missing')

const client=new Client(databaseUrl)
await client.connect()
try{
 await client.query('begin')
 for(const file of files){
  const sql=await readFile(new URL(`../db/migrations/${file}`,import.meta.url),'utf8')
  console.log(`[plant-execution-migrate] applying ${file}`)
  await client.query(sql)
 }
 await client.query('commit')
 console.log('[plant-execution-migrate] committed 033-040')
}catch(error){
 try{await client.query('rollback')}catch{}
 console.error('[plant-execution-migrate] rollback',error)
 throw error
}finally{
 await client.end()
}

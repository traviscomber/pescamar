import { neon } from '@neondatabase/serverless'

declare const process:{env:Record<string,string|undefined>}

// Plant Execution is enabled by default only on production after migrations 033-040
// have been verified. Previews stay read-only. Setting the env var explicitly to
// "false" remains an emergency kill-switch.
if(process.env.VERCEL_ENV==='production'&&process.env.PLANT_EXECUTION_WRITES_ENABLED===undefined){
  process.env.PLANT_EXECUTION_WRITES_ENABLED='true'
}

let sqlClient:ReturnType<typeof neon>|null=null

export function getSql(){
  const databaseUrl=process.env.DATABASE_URL
  if(!databaseUrl)throw new Error('DATABASE_URL is not configured')
  if(!sqlClient)sqlClient=neon(databaseUrl)
  return sqlClient
}

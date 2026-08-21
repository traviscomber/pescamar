import { neon } from '@neondatabase/serverless'

declare const process:{env:Record<string,string|undefined>}
let sqlClient:ReturnType<typeof neon>|null=null

export function getSql(){
  const databaseUrl=process.env.DATABASE_URL
  if(!databaseUrl)throw new Error('DATABASE_URL is not configured')
  if(!sqlClient)sqlClient=neon(databaseUrl)
  return sqlClient
}

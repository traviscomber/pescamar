import {readFile} from 'node:fs/promises'
import {neon} from '@neondatabase/serverless'

if(process.env.VERCEL_ENV!=='production'){
  console.log('[rollforward-migrations] skipped outside production')
  process.exit(0)
}

const databaseUrl=process.env.DATABASE_URL
if(!databaseUrl)throw new Error('[rollforward-migrations] DATABASE_URL is not configured in production')

const sql=neon(databaseUrl)
const files=[
  'db/migrations/030_production_support_evidence.sql',
  'db/migrations/031_production_support_resolutions.sql',
]

for(const file of files){
  const source=await readFile(new URL(`../${file}`,import.meta.url),'utf8')
  const statements=source.split(';').map(value=>value.trim()).filter(Boolean)
  for(const statement of statements)await sql.query(statement,[])
  console.log(`[rollforward-migrations] applied ${file}`)
}

const verification=await sql.query(`
  select
    to_regclass('public.canonical_production_support_rows') is not null as support_rows_ready,
    to_regclass('public.canonical_production_support_resolutions') is not null as resolutions_ready,
    exists(select 1 from pg_indexes where schemaname='public' and indexname='canonical_production_support_source_idx') as support_index_ready,
    exists(select 1 from pg_indexes where schemaname='public' and indexname='canonical_production_support_resolutions_reviewed_idx') as resolution_index_ready
`,[])
const result=verification[0]??{}
if(!result.support_rows_ready||!result.resolutions_ready||!result.support_index_ready||!result.resolution_index_ready){
  throw new Error('[rollforward-migrations] schema verification failed')
}
console.log('[rollforward-migrations] schema verified')

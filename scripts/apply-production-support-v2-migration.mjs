import {readFile} from 'node:fs/promises'
import {neon} from '@neondatabase/serverless'

if(process.env.VERCEL_ENV!=='production'){
  console.log('[production-support-v2-migration] skipped outside production')
  process.exit(0)
}

const databaseUrl=process.env.DATABASE_URL
if(!databaseUrl)throw new Error('[production-support-v2-migration] DATABASE_URL is not configured in production')

const sql=neon(databaseUrl)
const file='db/migrations/032_production_support_blocks.sql'
const source=await readFile(new URL(`../${file}`,import.meta.url),'utf8')
const statements=source.split(';').map(value=>value.trim()).filter(Boolean)
for(const statement of statements)await sql.query(statement,[])
console.log(`[production-support-v2-migration] applied ${file}`)

const verification=await sql.query(`
  select
    to_regclass('public.canonical_production_support_blocks') is not null as blocks_ready,
    to_regclass('public.canonical_production_support_rows') is not null as rows_ready,
    to_regclass('public.canonical_production_support_resolutions') is not null as resolutions_ready,
    exists(select 1 from pg_indexes where schemaname='public' and indexname='canonical_production_support_blocks_source_idx') as source_index_ready,
    exists(select 1 from pg_indexes where schemaname='public' and indexname='canonical_production_support_blocks_guide_idx') as guide_index_ready,
    exists(select 1 from pg_indexes where schemaname='public' and indexname='canonical_production_support_blocks_lot_idx') as lot_index_ready
`,[])
const result=verification[0]??{}
if(!result.blocks_ready||!result.rows_ready||!result.resolutions_ready||!result.source_index_ready||!result.guide_index_ready||!result.lot_index_ready){
  throw new Error('[production-support-v2-migration] schema verification failed')
}
console.log('[production-support-v2-migration] schema verified')

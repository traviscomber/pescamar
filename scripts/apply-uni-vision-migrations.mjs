import {readFile} from 'node:fs/promises'
import {neon} from '@neondatabase/serverless'

if(process.env.VERCEL!=='1'){
  console.log('[uni-vision-migration] skipped outside Vercel')
  process.exit(0)
}

const databaseUrl=process.env.DATABASE_URL
if(!databaseUrl)throw new Error('[uni-vision-migration] DATABASE_URL is not configured')

const sql=neon(databaseUrl)
const files=[
  'db/migrations/028_uni_vision_station.sql',
  'db/migrations/029_uni_vision_source_image_hash.sql',
]

for(const file of files){
  const text=await readFile(new URL(`../${file}`,import.meta.url),'utf8')
  const statements=text
    .split(';')
    .map(statement=>statement.trim())
    .filter(Boolean)
  for(const statement of statements)await sql.query(statement,[])
  console.log(`[uni-vision-migration] applied ${file}`)
}

const verification=await sql.query(`
  select
    to_regclass('public.sea_urchin_color_references') is not null as has_references,
    to_regclass('public.sea_urchin_color_captures') is not null as has_captures,
    exists(
      select 1
      from information_schema.columns
      where table_schema='public'
        and table_name='sea_urchin_color_captures'
        and column_name='source_image_sha256'
    ) as has_source_hash
`,[])
const row=verification[0]
if(!row?.has_references||!row?.has_captures||!row?.has_source_hash){
  throw new Error('[uni-vision-migration] schema verification failed')
}
console.log('[uni-vision-migration] schema verified')

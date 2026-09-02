import {getSql} from './_db.js'

declare const process:{env:Record<string,string|undefined>}
type Request={method?:string}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}

const tables=['plant_stations','plant_devices','device_events','packing_specs','packing_units','label_templates','label_print_jobs','pallets','pallet_packing_units','cold_assets','cold_runs','cold_run_loads','cold_observations','regulatory_holds','regulatory_hold_events']
const triggers=['lot_dispatches_regulatory_hold_gate','regulatory_holds_pallet_scope_lock','pallet_packing_units_regulatory_freeze','cold_observations_scope_guard']
const indexes=['cold_runs_one_open_per_asset_unique','packing_units_source_device_event_unique','pallet_packing_units_active_unit_unique']

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET only'})
 if(process.env.VERCEL_ENV!=='production')return res.status(404).json({ok:false})
 try{
  const sql=getSql()
  const tableRows=await sql`select c.relname name from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') and c.relname=any(${tables}::text[]) order by c.relname`
  const triggerRows=await sql`select tgname name from pg_trigger where not tgisinternal and tgname=any(${triggers}::text[]) order by tgname`
  const indexRows=await sql`select indexname name from pg_indexes where schemaname='public' and indexname=any(${indexes}::text[]) order by indexname`
  const existingTables=Array.isArray(tableRows)?tableRows.map((r:any)=>String(r.name)):[]
  const existingTriggers=Array.isArray(triggerRows)?triggerRows.map((r:any)=>String(r.name)):[]
  const existingIndexes=Array.isArray(indexRows)?indexRows.map((r:any)=>String(r.name)):[]
  return res.status(200).json({ok:true,writesEnabled:process.env.PLANT_EXECUTION_WRITES_ENABLED==='true',tables:{expected:tables.length,existing:existingTables.length,missing:tables.filter(x=>!existingTables.includes(x))},triggers:{expected:triggers.length,existing:existingTriggers.length,missing:triggers.filter(x=>!existingTriggers.includes(x))},indexes:{expected:indexes.length,existing:existingIndexes.length,missing:indexes.filter(x=>!existingIndexes.includes(x))}})
 }catch(error){return res.status(500).json({ok:false,error:error instanceof Error?error.message:'schema check failed'})}
}

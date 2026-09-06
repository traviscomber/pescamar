import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'
import {expectedMigrations,migrationLandmarks} from './_migration-manifest.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type LandmarkRow=Record<string,boolean>
type TrackerRow={schemaname:string;tablename:string}
type MigrationRow={migration_name:string;evidence_kind:string;applied_at:unknown}

export default async function handler(req:Request,res:Response){
  res.setHeader('Cache-Control','no-store')
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
  try{
    const operator=await requireOperator(req)
    if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
    const sql=getSql()
    const [landmarkRaw,trackerRaw]=await Promise.all([
      sql`select
        to_regclass('public.parties') is not null parties,
        to_regclass('public.receptions') is not null receptions,
        to_regclass('public.operators') is not null operators,
        to_regclass('public.historical_production_records') is not null historical_production_records,
        to_regclass('public.canonical_production_support_blocks') is not null canonical_production_support_blocks,
        to_regclass('public.plant_stations') is not null plant_stations,
        to_regclass('public.packing_units') is not null packing_units,
        to_regclass('public.label_templates') is not null label_templates,
        to_regclass('public.pallets') is not null pallets,
        to_regclass('public.cold_runs') is not null cold_runs,
        to_regclass('public.regulatory_holds') is not null regulatory_holds,
        to_regclass('public.japan_export_release_evidence') is not null japan_export_release_evidence,
        to_regclass('public.lot_lifecycle_events') is not null lot_lifecycle_events`,
      sql`select schemaname,tablename from pg_tables where schemaname not in ('pg_catalog','information_schema') and (tablename ilike '%migration%' or tablename ilike '%schema%') order by schemaname,tablename`
    ])
    const landmarkRow=((Array.isArray(landmarkRaw)?landmarkRaw:[])[0]??{}) as LandmarkRow
    const landmarks=migrationLandmarks.map(name=>({name,present:Boolean(landmarkRow[name])}))
    const presentLandmarks=landmarks.filter(item=>item.present).length
    const trackers=(Array.isArray(trackerRaw)?trackerRaw:[]) as TrackerRow[]
    const runtimeCompatible=presentLandmarks===landmarks.length
    const registryPresent=trackers.some(row=>row.schemaname==='public'&&row.tablename==='schema_migrations')
    const migrationRaw=registryPresent?await sql`select migration_name,evidence_kind,applied_at from schema_migrations order by migration_name`:[]
    const migrationRows=(Array.isArray(migrationRaw)?migrationRaw:[]) as MigrationRow[]
    const byName=new Map(migrationRows.map(row=>[row.migration_name,row]))
    const expectedSet=new Set<string>(expectedMigrations)
    const missing=expectedMigrations.filter(name=>!byName.has(name))
    const unexpected=migrationRows.map(row=>row.migration_name).filter(name=>!expectedSet.has(name))
    const invalid=migrationRows.filter(row=>row.evidence_kind!=='baseline'&&row.evidence_kind!=='applied').map(row=>row.migration_name)
    const latest=expectedMigrations.at(-1)!
    const latestRow=byName.get(latest)
    const latestApplied=latestRow?.evidence_kind==='applied'&&Boolean(latestRow.applied_at)
    const baselineRows=migrationRows.filter(row=>row.evidence_kind==='baseline').length
    const appliedRows=migrationRows.filter(row=>row.evidence_kind==='applied'&&Boolean(row.applied_at)).length
    const trackerVerified=runtimeCompatible&&registryPresent&&missing.length===0&&unexpected.length===0&&invalid.length===0&&latestApplied
    const trackerTables=trackers.map(row=>`${row.schemaname}.${row.tablename}`)
    return res.status(200).json({
      ok:true,
      expected:{count:expectedMigrations.length,first:expectedMigrations[0],latest,migrations:expectedMigrations},
      runtimeCompatibility:{status:runtimeCompatible?'compatible':'incomplete',present:presentLandmarks,total:landmarks.length,landmarks},
      executionEvidence:{
        status:trackerVerified?'inventory_verified':registryPresent?'tracker_present_unverified':'missing',
        tracked:trackerVerified,
        trackerTables,
        baselineRows,
        appliedRows,
        missing,
        unexpected,
        invalid
      },
      pilotGate:{
        status:trackerVerified?'pass':'hold',
        reason:trackerVerified
          ?`Neon contiene los ${expectedMigrations.length} archivos canónicos del manifiesto: 001–040 conservan baseline estructural y cada migración posterior está registrada individualmente. La última migración verificada es ${latest}.`
          :registryPresent
            ?`Existe schema_migrations, pero todavía no reconcilia exactamente los ${expectedMigrations.length} archivos del inventario canónico o ${latest} no consta como aplicada.`
            :'El entorno no conserva una bitácora de migraciones aplicada que permita demostrar qué archivos se ejecutaron y en qué orden.'
      },
      governance:{writesDatabase:false,rule:'Un baseline estructural explícito puede cerrar el gap histórico sin inventar fechas de ejecución. PASS requiere compatibilidad runtime, cobertura exacta del manifiesto y la migración más reciente registrada como applied. Este endpoint sólo inspecciona; no aplica ni registra migraciones.'}
    })
  }catch(error){
    const message=error instanceof Error?error.message:''
    return res.status(message.includes('DATABASE_URL')?503:500).json({ok:false,error:message.includes('DATABASE_URL')?'Base de datos no conectada':'No fue posible calcular el preflight de esquema'})
  }
}

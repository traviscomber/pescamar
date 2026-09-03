import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'
import {expectedMigrations,migrationLandmarks} from './_migration-manifest.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type LandmarkRow=Record<string,boolean>
type TrackerRow={schemaname:string;tablename:string}

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
        to_regclass('public.regulatory_holds') is not null regulatory_holds`,
      sql`select schemaname,tablename from pg_tables where schemaname not in ('pg_catalog','information_schema') and (tablename ilike '%migration%' or tablename ilike '%schema%') order by schemaname,tablename`
    ])
    const landmarkRow=((Array.isArray(landmarkRaw)?landmarkRaw:[])[0]??{}) as LandmarkRow
    const landmarks=migrationLandmarks.map(name=>({name,present:Boolean(landmarkRow[name])}))
    const presentLandmarks=landmarks.filter(item=>item.present).length
    const trackers=(Array.isArray(trackerRaw)?trackerRaw:[]) as TrackerRow[]
    const runtimeCompatible=presentLandmarks===landmarks.length
    const executionTracked=trackers.length>0
    return res.status(200).json({
      ok:true,
      expected:{count:expectedMigrations.length,first:expectedMigrations[0],latest:expectedMigrations.at(-1),migrations:expectedMigrations},
      runtimeCompatibility:{status:runtimeCompatible?'compatible':'incomplete',present:presentLandmarks,total:landmarks.length,landmarks},
      executionEvidence:{status:executionTracked?'tracker_present_unverified':'missing',tracked:false,trackerTables:trackers.map(row=>`${row.schemaname}.${row.tablename}`)},
      pilotGate:{status:'hold',reason:executionTracked?'Existe una tabla candidata de tracking, pero este preflight no puede demostrar todavía que contiene exactamente todas las migraciones canónicas en orden.':'El entorno no conserva una bitácora de migraciones aplicada que permita demostrar qué archivos se ejecutaron y en qué orden.'},
      governance:{writesDatabase:false,rule:'Compatibilidad estructural no equivale a evidencia de ejecución. El PASS del piloto requiere reconciliar el Neon objetivo contra todos los archivos versionados en db/migrations. Este endpoint sólo inspecciona; no aplica ni registra migraciones.'}
    })
  }catch(error){
    const message=error instanceof Error?error.message:''
    return res.status(message.includes('DATABASE_URL')?503:500).json({ok:false,error:message.includes('DATABASE_URL')?'Base de datos no conectada':'No fue posible calcular el preflight de esquema'})
  }
}

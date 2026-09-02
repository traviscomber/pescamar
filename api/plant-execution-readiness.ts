import {requireOperator} from './_auth.js'
import {allowedPlantIds} from './_plants.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type Row={plant_id:string;stations:string|number;floor_stations:string|number;packing_stations:string|number;cold_stations:string|number;devices:string|number;scanners:string|number;scales:string|number;printers:string|number;sensors:string|number;packing_units:string|number;label_templates:string|number;printed_label_jobs:string|number;pallets:string|number;closed_pallets:string|number;linked_cold_assets:string|number;cold_runs_with_evidence:string|number;resolved_holds:string|number}

const n=(value:unknown)=>Number(value??0)

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
 try{
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  if(!['admin','operations'].includes(operator.role))return res.status(403).json({ok:false,error:'Readiness de rollout reservado a Administración y Operaciones'})
  const plantIds=allowedPlantIds(operator)
  if(!plantIds.length)return res.status(200).json({ok:true,plants:[],rule:'Evidencia Plant Execution separada del gate LIVE; no declara aceptación humana.'})
  const sql=getSql()
  const rows=await sql`with scoped as (select unnest(${plantIds}::text[]) plant_id),
   stations as (select plant_id,count(*) filter(where active) stations,count(*) filter(where active and station_type='floor') floor_stations,count(*) filter(where active and station_type='packing') packing_stations,count(*) filter(where active and station_type='cold') cold_stations from plant_stations where plant_id=any(${plantIds}::text[]) group by plant_id),
   devices as (select s.plant_id,count(*) filter(where d.active and s.active) devices,count(*) filter(where d.active and s.active and d.device_type='scanner') scanners,count(*) filter(where d.active and s.active and d.device_type='scale') scales,count(*) filter(where d.active and s.active and d.device_type='printer') printers,count(*) filter(where d.active and s.active and d.device_type='sensor') sensors from plant_devices d join plant_stations s on s.id=d.station_id where s.plant_id=any(${plantIds}::text[]) group by s.plant_id),
   packing as (select plant_id,count(*) packing_units from packing_units where plant_id=any(${plantIds}::text[]) and status<>'voided' group by plant_id),
   labels as (select s.plant_id,(select count(*) from label_templates t where t.active=true and (t.plant_id is null or t.plant_id=s.plant_id)) label_templates,(select count(*) from label_print_jobs j where j.plant_id=s.plant_id and j.status in ('printed','reprinted')) printed_label_jobs from scoped s),
   pallet as (select plant_id,count(*) pallets,count(*) filter(where status in ('closed','held','released','dispatched')) closed_pallets from pallets where plant_id=any(${plantIds}::text[]) and status<>'voided' group by plant_id),
   cold_assets_evidence as (select a.plant_id,count(*) filter(where a.active and a.station_id is not null and s.active and s.station_type='cold' and s.plant_id=a.plant_id) linked_cold_assets from cold_assets a left join plant_stations s on s.id=a.station_id where a.plant_id=any(${plantIds}::text[]) group by a.plant_id),
   cold_evidence as (select r.plant_id,count(*) cold_runs_with_evidence from cold_runs r where r.plant_id=any(${plantIds}::text[]) and r.status in ('completed','deviation') and r.observation_count>0 and exists(select 1 from cold_run_loads l where l.run_id=r.id) group by r.plant_id),
   regulatory as (select plant_id,count(*) resolved_holds from regulatory_holds where plant_id=any(${plantIds}::text[]) and status in ('released','rejected') group by plant_id)
   select p.plant_id,coalesce(s.stations,0) stations,coalesce(s.floor_stations,0) floor_stations,coalesce(s.packing_stations,0) packing_stations,coalesce(s.cold_stations,0) cold_stations,coalesce(d.devices,0) devices,coalesce(d.scanners,0) scanners,coalesce(d.scales,0) scales,coalesce(d.printers,0) printers,coalesce(d.sensors,0) sensors,coalesce(pk.packing_units,0) packing_units,coalesce(lb.label_templates,0) label_templates,coalesce(lb.printed_label_jobs,0) printed_label_jobs,coalesce(pa.pallets,0) pallets,coalesce(pa.closed_pallets,0) closed_pallets,coalesce(ca.linked_cold_assets,0) linked_cold_assets,coalesce(cr.cold_runs_with_evidence,0) cold_runs_with_evidence,coalesce(rg.resolved_holds,0) resolved_holds from scoped p left join stations s using(plant_id) left join devices d using(plant_id) left join packing pk using(plant_id) left join labels lb using(plant_id) left join pallet pa using(plant_id) left join cold_assets_evidence ca using(plant_id) left join cold_evidence cr using(plant_id) left join regulatory rg using(plant_id) order by p.plant_id`
  const plants=((Array.isArray(rows)?rows:[]) as Row[]).map(row=>{
   const metrics={stations:n(row.stations),floorStations:n(row.floor_stations),packingStations:n(row.packing_stations),coldStations:n(row.cold_stations),devices:n(row.devices),scanners:n(row.scanners),scales:n(row.scales),printers:n(row.printers),sensors:n(row.sensors),packingUnits:n(row.packing_units),labelTemplates:n(row.label_templates),printedLabelJobs:n(row.printed_label_jobs),pallets:n(row.pallets),closedPallets:n(row.closed_pallets),linkedColdAssets:n(row.linked_cold_assets),coldRunsWithEvidence:n(row.cold_runs_with_evidence),resolvedHolds:n(row.resolved_holds)}
   const checks=[
    {key:'station',label:'Estación física',complete:metrics.stations>0,detail:metrics.stations?`${metrics.stations} estación(es) activa(s)`:'Sin estaciones físicas registradas'},
    {key:'devices',label:'Hardware registrado',complete:metrics.devices>0,detail:metrics.devices?`${metrics.devices} dispositivo(s) activo(s)`:'Sin scanner, balanza, impresora, terminal o sensor registrado'},
    {key:'packing',label:'Packing real',complete:metrics.packingUnits>0,detail:metrics.packingUnits?`${metrics.packingUnits} caja(s) live`:'Sin packing units live'},
    {key:'label',label:'Etiqueta física confirmada',complete:metrics.labelTemplates>0&&metrics.printers>0&&metrics.printedLabelJobs>0,detail:metrics.labelTemplates?`${metrics.labelTemplates} plantilla(s) usable(s) · ${metrics.printers} impresora(s) · ${metrics.printedLabelJobs} impresión(es) confirmadas`:'Sin plantilla de etiqueta activa usable'},
    {key:'pallet',label:'Pallet trazable',complete:metrics.closedPallets>0,detail:metrics.closedPallets?`${metrics.closedPallets} pallet(s) cerrados/liberados`:'Sin pallet físico cerrado'},
    {key:'cold',label:'Frío con evidencia',complete:metrics.linkedColdAssets>0&&metrics.coldRunsWithEvidence>0,detail:metrics.linkedColdAssets?`${metrics.linkedColdAssets} activo(s) vinculados · ${metrics.coldRunsWithEvidence} ciclo(s) cerrados con carga y temperatura`:'Sin activo de frío vinculado a estación'},
    {key:'regulatory',label:'Control regulatorio ejercitado',complete:metrics.resolvedHolds>0,detail:metrics.resolvedHolds?`${metrics.resolvedHolds} hold(s) resueltos con historial`:'Sin ciclo hold → resolución demostrado'},
   ]
   const completed=checks.filter(check=>check.complete).length
   return {plantId:row.plant_id,completed,total:checks.length,score:Math.round(completed/checks.length*100),hasPhysicalUatEvidence:checks.every(check=>check.complete),checks,metrics}
  })
  return res.status(200).json({ok:true,plants,rule:'Esta señal mide configuración y evidencia física observada. No modifica el gate UAT/LIVE ni reemplaza aceptación humana.'})
 }catch(error){const message=error instanceof Error?error.message:'';const schema=['plant_stations','plant_devices','packing_units','label_templates','label_print_jobs','pallets','cold_assets','cold_runs','regulatory_holds'].some(name=>message.includes(name));return res.status(schema?503:500).json({ok:false,error:schema?'Faltan tablas Plant Execution en el entorno':'No fue posible calcular readiness de Plant Execution'})}
}

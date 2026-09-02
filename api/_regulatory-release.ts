import {getSql} from './_db.js'

declare const process:{env:Record<string,string|undefined>}

type HoldRow={id:string;authority:string;status:string;reason:string;target_type:string}

const writesEnabled=()=>process.env.PLANT_EXECUTION_WRITES_ENABLED==='true'

export type RegulatoryReleaseState={active:boolean;releasable:boolean;holds:HoldRow[];reasons:string[]}

export async function getRegulatoryReleaseState(receptionId:string):Promise<RegulatoryReleaseState>{
 if(!writesEnabled())return {active:false,releasable:true,holds:[],reasons:[]}
 const sql=getSql()
 const rows=await sql`select h.id,h.authority,h.status,h.reason,case when h.reception_id is not null then 'reception' when h.pallet_id is not null then 'pallet' else 'packing_unit' end target_type from regulatory_holds h where h.status in ('open','rejected') and (h.reception_id=${receptionId}::uuid or (h.packing_unit_id is not null and exists(select 1 from packing_units u where u.id=h.packing_unit_id and u.reception_id=${receptionId}::uuid)) or (h.pallet_id is not null and exists(select 1 from pallet_packing_units i join packing_units u on u.id=i.packing_unit_id where i.pallet_id=h.pallet_id and i.removed_at is null and u.reception_id=${receptionId}::uuid))) order by h.opened_at`
 const holds=(Array.isArray(rows)?rows:[]) as HoldRow[]
 return {active:true,releasable:holds.length===0,holds,reasons:holds.map(h=>`${h.authority}: ${h.reason}`)}
}

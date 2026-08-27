import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type GradeKey='A1'|'A2'|'Vj100'|'Vj50'|'C1'|'C2'|'D'|'PT'|'R'
type GradeObservation={grade:GradeKey;kg:number|null;boxes:number|null}
type RollforwardRow={source_row:unknown;event_date:unknown;guide_number:unknown;supplier:unknown;extraction_zone:unknown;process_site:unknown;lot_code:unknown;guide_kg:unknown;received_kg:unknown;grade_breakdown:unknown;client:unknown;observations:unknown}
type LinkStatus='ready_for_reconciliation'|'needs_destination'|'needs_evidence'
const GRADES:GradeKey[]=['A1','A2','Vj100','Vj50','C1','C2','D','PT','R']
const n=(value:unknown)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:null}
const text=(value:unknown)=>String(value??'').trim()
const pct=(part:number,total:number)=>total?Number((part/total*100).toFixed(1)):null
function familyFor(site:string,lot:string){const normalizedLot=lot.toLowerCase(),normalizedSite=site.toLowerCase();if(normalizedLot.startsWith('ig')||normalizedSite==='curanue')return {key:'IG',label:'Isla Guafo / Curanue'};if(normalizedLot.startsWith('mdq')||normalizedSite==='santa rosa')return {key:'MDQ',label:'Santa Rosa / MDQ'};if(normalizedLot.startsWith('mi')||normalizedSite==='candelaria')return {key:'MI',label:'Cesar / candelaria'};return {key:'RF',label:site||'Roll-forward'}}
function gradesOf(value:unknown):GradeObservation[]{const source=value&&typeof value==='object'?value as Record<string,unknown>:{};const out:GradeObservation[]=[];for(const grade of GRADES){const raw=source[grade];if(!raw||typeof raw!=='object')continue;const item=raw as Record<string,unknown>,kg=n(item.kg),boxes=n(item.boxes);if((kg??0)>0||(boxes??0)>0)out.push({grade,kg,boxes})}return out}

export default async function handler(request:Request,response:Response){
 response.setHeader('Cache-Control','no-store')
 if(request.method!=='GET'){response.setHeader('Allow','GET');return response.status(405).json({ok:false,error:'Método no permitido'})}
 try{
  const operator=await requireOperator(request)
  if(!operator)return response.status(401).json({ok:false,error:'Sesión requerida'})
  const sql=getSql()
  const raw=await sql`select h.source_row,h.event_date,h.guide_number,
    coalesce(nullif(btrim(h.supplier_name),''),nullif(btrim(h.supplier_original),''),'Sin proveedor') supplier,
    h.extraction_zone,coalesce(nullif(btrim(h.process_site_original),''),nullif(btrim(h.plant_id),''),'Sin planta') process_site,
    h.lot_code,h.guide_kg,h.received_kg,h.grade_breakdown,h.client,h.observations
   from historical_production_records h
   where h.record_status='operational'
    and h.source_file_hash in(select file_hash from canonical_source_files where canonical and (source_kind='production' or file_name ilike '%produccion%'))
    and (lower(coalesce(h.process_site_original,h.plant_id,'')) in ('curanue','santa rosa','candelaria')
      or lower(h.lot_code) like 'ig%' or lower(h.lot_code) like 'mdq%' or lower(h.lot_code) like 'mi%')
   order by h.event_date nulls last,h.source_row`
  const sourceRows=(Array.isArray(raw)?raw:[]) as RollforwardRow[]
  const observations=sourceRows.map(row=>{const lot=text(row.lot_code),site=text(row.process_site),supplier=text(row.supplier),guide=text(row.guide_number),destination=text(row.client),grades=gradesOf(row.grade_breakdown),family=familyFor(site,lot);return {sourceRow:Number(row.source_row)||0,eventDate:row.event_date??null,guide:guide||null,supplier,extractionZone:text(row.extraction_zone)||null,site,lot,guideKg:n(row.guide_kg),receivedKg:n(row.received_kg),grades,destination:destination||null,notes:text(row.observations)||null,familyKey:family.key,familyLabel:family.label}})
  const groups=new Map<string,typeof observations>()
  for(const row of observations){const key=`${row.familyKey}|${row.supplier}|${row.site}`;const bucket=groups.get(key);if(bucket)bucket.push(row);else groups.set(key,[row])}
  const chains=[...groups.values()].map(rows=>{const first=rows[0],lots=new Set(rows.map(row=>row.lot).filter(Boolean)),guides=new Set(rows.map(row=>row.guide).filter((item):item is string=>Boolean(item))),destinations=new Set(rows.map(row=>row.destination).filter((item):item is string=>Boolean(item))),gradeSet=new Set<GradeKey>(),gradeObservationCount=rows.reduce((sum,row)=>{for(const item of row.grades)gradeSet.add(item.grade);return sum+row.grades.length},0),destinationRows=rows.filter(row=>row.destination).length,guideRows=rows.filter(row=>row.guide).length,gradeRows=rows.filter(row=>row.grades.length).length,receivedKg=rows.reduce((sum,row)=>sum+(row.receivedKg??0),0),status:LinkStatus=gradeRows<rows.length||guideRows<rows.length?'needs_evidence':destinationRows<rows.length?'needs_destination':'ready_for_reconciliation';return {key:`${first.familyKey}-${first.supplier}-${first.site}`,familyKey:first.familyKey,familyLabel:first.familyLabel,supplier:first.supplier,site:first.site,rows:rows.length,lots:lots.size,guides:guides.size,receivedKg:Number(receivedKg.toFixed(1)),destinationCoveragePct:pct(destinationRows,rows.length),guideCoveragePct:pct(guideRows,rows.length),gradeCoveragePct:pct(gradeRows,rows.length),destinations:[...destinations],grades:[...gradeSet],gradeObservationCount,status,observations:rows}}).sort((a,b)=>b.rows-a.rows||b.receivedKg-a.receivedKg)
  const uniqueLots=new Set(observations.map(row=>row.lot).filter(Boolean)).size,uniqueGuides=new Set(observations.map(row=>row.guide).filter(Boolean)).size,destinationRows=observations.filter(row=>row.destination).length,gradeRows=observations.filter(row=>row.grades.length).length,gradeObservationCount=observations.reduce((sum,row)=>sum+row.grades.length,0),receivedKg=observations.reduce((sum,row)=>sum+(row.receivedKg??0),0)
  return response.status(200).json({ok:true,method:{version:'rollforward-linkage-v1',rule:'Cada fila roll-forward conserva recepción, lote, guía, proveedor y planta. El sistema genera enlaces auditables lote → grado y, sólo cuando existe cliente explícito, grado → destino. Los kg de grado no se suman como rendimiento porque pueden representar arrastres entre lotes. Cierre de masa queda pendiente hasta enlazar de forma determinística las hojas de apoyo Isla Guafo, Diaz termiando y Cesar.'},summary:{rows:observations.length,chains:chains.length,uniqueLots,uniqueGuides,receivedKg:Number(receivedKg.toFixed(1)),destinationRows,destinationCoveragePct:pct(destinationRows,observations.length),gradeRows,gradeCoveragePct:pct(gradeRows,observations.length),gradeObservationCount,unresolvedDestinationRows:observations.length-destinationRows},chains})
 }catch(error){const message=error instanceof Error?error.message:'';return response.status(message.includes('DATABASE_URL')?503:500).json({ok:false,error:message.includes('DATABASE_URL')?'Base de datos no conectada':'No fue posible construir la conciliación roll-forward'})}
}

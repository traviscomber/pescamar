import type {SessionOperator} from './_auth.js'
import {getSql} from './_db.js'

export type CanonicalBusinessIntelligence={
 source:{id:'canonical_intelligence';label:string;path:string;rows:number;freshness:string|null}
 data:{
  evidenceBoundary:{historicalOnly:true;writesLiveInventory:false;rule:string}
  reception:{rows:number;guideKg:number;receivedKg:number;varianceKg:number;explainedPct:number|null}
  lineage:{direct:number;consolidated:number;review:number;chronologyReview:number}
  packing:{boxes:number;kg:number;missingLotBoxes:number;traceabilityPct:number|null;observedEnd:string|null;registeredEnd:string|null;metadataCoverageMismatch:boolean}
  stockEvidence:{kg:number;historicalOnly:true}
  finance:null|{importedRows:number;transactionalRows:number;summaryRows:number;inflowClp:number;outflowClp:number;balanceDeltaClp:number}
  priorities:Array<{priority:1|2|3;kind:string;title:string;detail:string}>
 }
}

const n=(value:unknown)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:0}
const s=(value:unknown)=>value instanceof Date?value.toISOString().slice(0,10):typeof value==='string'?value.slice(0,10):null
const pct=(part:number,total:number)=>total>0?Number((part/total*100).toFixed(1)):null
const rows=(value:unknown)=>Array.isArray(value)?value as Record<string,unknown>[]:[]

export async function buildCanonicalBusinessIntelligence(operator:SessionOperator):Promise<CanonicalBusinessIntelligence|null>{
 const corporate=operator.role==='admin'||operator.plantIds.length>=6
 if(!corporate)return null
 const financial=['admin','finance','operations'].includes(operator.role)
 const sql=getSql()
 const productionHash=`(select file_hash from canonical_source_files where canonical and file_name='planilla de produccion 2026.xlsx' limit 1)`
 const packingHash=`(select file_hash from canonical_source_files where canonical and file_name='packing pulpo pescamar 2026-2.xlsx' limit 1)`
 const accountHash=`(select file_hash from canonical_source_files where canonical and file_name='CUENTA2.xlsx' limit 1)`
 const [productionRaw,relationshipRaw,packingRaw,stockRaw,ledgerRaw]=await Promise.all([
  sql.query(`select count(*)::int rows,coalesce(sum(guide_kg),0)::numeric guide_kg,coalesce(sum(received_kg),0)::numeric received_kg,count(*) filter(where 'date_sequence_inconsistent'=any(data_quality_flags))::int chronology_review,max(coalesce(production_date,process_date,reception_date,event_date)) latest_date from historical_production_records where record_status='operational' and source_file_hash=${productionHash}`,[]),
  sql.query(`select relationship_status,count(*)::int rows from historical_record_eligibility where source_file_hash=${productionHash} group by relationship_status`,[]),
  sql.query(`select count(*)::int boxes,coalesce(sum(total_kg),0)::numeric kg,count(*) filter(where lot_code is null)::int missing_lot,max(production_date) observed_end,(select period_end from canonical_source_files where file_hash=${packingHash} limit 1) registered_end from canonical_packing_boxes where source_file_hash=${packingHash}`,[]),
  sql.query(`select coalesce(sum(total_kg),0)::numeric kg from canonical_stock_records where source_file_hash=${accountHash}`,[]),
  financial?sql.query(`select count(*)::int imported_rows,count(*) filter(where event_date is not null or inflow_clp is not null or outflow_clp is not null)::int transactional_rows,count(*) filter(where event_date is null and inflow_clp is null and outflow_clp is null)::int summary_rows,coalesce(sum(inflow_clp),0)::numeric inflow_clp,coalesce(sum(outflow_clp),0)::numeric outflow_clp from canonical_account_entries where source_file_hash=${accountHash}`,[]):Promise.resolve([])
 ])
 const production=(rows(productionRaw)[0]??{}) as Record<string,unknown>
 const packing=(rows(packingRaw)[0]??{}) as Record<string,unknown>
 const stock=(rows(stockRaw)[0]??{}) as Record<string,unknown>
 const ledger=financial?((rows(ledgerRaw)[0]??{}) as Record<string,unknown>):null
 const rel=new Map(rows(relationshipRaw).map(row=>[String(row.relationship_status??''),n(row.rows)]))
 const productionRows=n(production.rows),guideKg=n(production.guide_kg),receivedKg=n(production.received_kg),chronologyReview=n(production.chronology_review)
 const boxes=n(packing.boxes),packingKg=n(packing.kg),missingLotBoxes=n(packing.missing_lot),observedEnd=s(packing.observed_end),registeredEnd=s(packing.registered_end)
 const transactionalRows=n(ledger?.transactional_rows),summaryRows=n(ledger?.summary_rows),importedRows=n(ledger?.imported_rows),inflowClp=n(ledger?.inflow_clp),outflowClp=n(ledger?.outflow_clp)
 const priorities=[] as CanonicalBusinessIntelligence['data']['priorities']
 if(missingLotBoxes)priorities.push({priority:1,kind:'packing-lineage',title:`Vincular ${missingLotBoxes} cajas IQF a lote`,detail:'El packing físico existe, pero esas cajas no tienen referencia de lote en la fuente. No deben asignarse por fecha ni por inferencia.'})
 if(chronologyReview)priorities.push({priority:1,kind:'production-chronology',title:`Revisar ${chronologyReview} secuencias de fecha`,detail:'Recepción, proceso y producción presentan secuencias incompatibles en registros canónicos concretos; mantenerlos históricos hasta resolver evidencia.'})
 if(financial&&summaryRows)priorities.push({priority:2,kind:'ledger-grain',title:`Separar ${summaryRows} filas resumen de CUENTA2`,detail:`El archivo contiene ${importedRows} filas importadas, pero ${transactionalRows} corresponden a movimientos con fecha o dinero. Las filas resumen no deben inflar el conteo transaccional.`})
 if(observedEnd&&registeredEnd&&observedEnd>registeredEnd)priorities.push({priority:2,kind:'source-coverage',title:'Actualizar cobertura del packing',detail:`La evidencia física llega hasta ${observedEnd}, mientras la metadata canónica declara cierre ${registeredEnd}. Corregir metadata sin alterar las cajas originales.`})
 const direct=rel.get('directa')??0,consolidated=rel.get('lote_consolidado')??0,review=rel.get('requiere_revision')??0
 const totalRows=productionRows+boxes+n(stock.kg>0?1:0)+(financial?transactionalRows:0)
 const latest=[s(production.latest_date),observedEnd].filter((value):value is string=>Boolean(value)).sort().at(-1)??null
 return {
  source:{id:'canonical_intelligence',label:'Inteligencia canónica auditada',path:'/importaciones',rows:totalRows,freshness:latest},
  data:{
   evidenceBoundary:{historicalOnly:true,writesLiveInventory:false,rule:'La evidencia canónica explica el negocio y sus excepciones; no crea recepciones, inventario ni movimientos live.'},
   reception:{rows:productionRows,guideKg,receivedKg,varianceKg:Number((guideKg-receivedKg).toFixed(1)),explainedPct:pct(receivedKg,guideKg)},
   lineage:{direct,consolidated,review,chronologyReview},
   packing:{boxes,kg:packingKg,missingLotBoxes,traceabilityPct:pct(boxes-missingLotBoxes,boxes),observedEnd,registeredEnd,metadataCoverageMismatch:Boolean(observedEnd&&registeredEnd&&observedEnd>registeredEnd)},
   stockEvidence:{kg:n(stock.kg),historicalOnly:true},
   finance:financial?{importedRows,transactionalRows,summaryRows,inflowClp,outflowClp,balanceDeltaClp:Number((inflowClp-outflowClp).toFixed(0))}:null,
   priorities:priorities.slice(0,4)
  }
 }
}

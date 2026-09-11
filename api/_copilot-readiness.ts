import {getSql} from './_db.js'

export type DecisionReadinessState='ready'|'pilot'|'blocked'
export type DecisionReadinessGate={capability:string;state:DecisionReadinessState;confidence:'observed'|'derived'|'needs-human-validation';evidence:string[];blockers:string[];responseMode:'recommend'|'hypothesis'|'insufficient-data'}

const n=(value:unknown)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:0}
const pct=(part:number,total:number)=>total?Number((part/total*100).toFixed(1)):null

export async function buildCopilotReadinessEvidence(){
 const sql=getSql()
 const raw=await sql`select
  (select count(*) from historical_production_records where record_status='operational')::int production_total,
  (select count(*) from historical_production_records where record_status='operational' and nullif(btrim(guide_number),'') is not null)::int production_guide,
  (select count(*) from historical_production_records where record_status='operational' and nullif(btrim(lot_code),'') is not null)::int production_lot,
  (select count(*) from historical_production_records where record_status='operational' and received_kg is not null)::int production_received,
  (select count(*) from historical_production_records where record_status='operational' and grade_breakdown is not null and grade_breakdown<>'{}'::jsonb)::int production_grade,
  (select count(*) from historical_production_records where record_status='operational' and guide_price_clp is not null)::int production_price,
  (select count(*) from canonical_production_support_blocks where parser_version='production-support-v2')::int support_blocks,
  (select count(*) from canonical_production_support_blocks where parser_version='production-support-v2' and nullif(btrim(guide_number),'') is not null)::int support_guide,
  (select count(*) from canonical_packing_boxes)::int packing_total,
  (select count(*) from canonical_packing_boxes where nullif(btrim(lot_code),'') is not null)::int packing_lot,
  (select count(*) from canonical_packing_boxes where production_date is not null)::int packing_date,
  (select count(*) from canonical_packing_boxes where total_kg is not null and total_kg>0)::int packing_kg,
  (select count(*) from canonical_account_entries)::int ledger_total,
  (select count(*) from canonical_account_entries where event_date is not null)::int ledger_date,
  (select count(*) from canonical_account_entries where nullif(btrim(description),'') is not null)::int ledger_desc,
  (select count(*) from canonical_account_entries where coalesce(inflow_clp,0)<>0 or coalesce(outflow_clp,0)<>0)::int ledger_amount,
  (select count(*) from canonical_transfers_received)::int transfers_total,
  (select count(*) from canonical_transfers_received where event_date is not null and amount_clp is not null and nullif(btrim(bank),'') is not null)::int transfers_complete,
  (select count(*) from sales_orders)::int sales_orders,
  (select count(*) from lot_sales)::int lot_sales,
  (select count(*) from settlements)::int settlements`
 const row=(Array.isArray(raw)?raw[0]:raw) as Record<string,unknown>
 const production=n(row.production_total),support=n(row.support_blocks),packing=n(row.packing_total),ledger=n(row.ledger_total),transfers=n(row.transfers_total)
 const productionIdentityReady=(pct(n(row.production_guide),production)??0)>=95&&(pct(n(row.production_lot),production)??0)>=95&&(pct(n(row.production_received),production)??0)>=95
 const gradeReady=(pct(n(row.production_grade),production)??0)>=90
 const supplierTraceReady=(pct(n(row.support_guide),support)??0)>=95&&productionIdentityReady
 const packingReady=(pct(n(row.packing_lot),packing)??0)>=75&&(pct(n(row.packing_date),packing)??0)>=95&&(pct(n(row.packing_kg),packing)??0)>=95
 const financeStructureReady=(pct(n(row.ledger_date),ledger)??0)>=90&&(pct(n(row.ledger_desc),ledger)??0)>=95&&(pct(n(row.ledger_amount),ledger)??0)>=90&&(pct(n(row.transfers_complete),transfers)??0)>=95
 const priceReady=(pct(n(row.production_price),production)??0)>=80
 const salesOrders=n(row.sales_orders),lotSales=n(row.lot_sales),settlements=n(row.settlements)
 const liveCommercialReady=salesOrders>0&&lotSales>0&&settlements>0
 const gate=(capability:string,state:DecisionReadinessState,confidence:DecisionReadinessGate['confidence'],evidence:string[],blockers:string[]):DecisionReadinessGate=>({capability,state,confidence,evidence,blockers,responseMode:state==='ready'?'recommend':state==='pilot'?'hypothesis':'insufficient-data'})
 const capabilityGates:DecisionReadinessGate[]=[
  gate('historical-traceability',supplierTraceReady&&packingReady?'ready':'pilot','derived',[`${n(row.production_lot)}/${production} producción con lote`,`${n(row.support_guide)}/${support} soportes con guía`,`${n(row.packing_lot)}/${packing} cajas con lote`],packingReady?[]:['Packing sin lote explícito requiere continuidad determinística o validación humana.']),
  gate('supplier-pattern-intelligence',supplierTraceReady&&gradeReady?'pilot':'blocked','needs-human-validation',[`${support} bloques auxiliares`,`Composición histórica por grado disponible en ${n(row.production_grade)}/${production} registros`],['La semántica de Kilos Aceptados/D no está validada homogéneamente entre proveedores.','No habilitar ranking transversal.']),
  gate('exception-intelligence',productionIdentityReady&&packingReady&&financeStructureReady?'ready':'pilot','derived',[`${production} registros de producción`,`${packing} cajas de packing`,`${ledger} entradas financieras`],[]),
  gate('margin-intelligence',priceReady&&liveCommercialReady?'ready':priceReady?'pilot':'blocked',priceReady?'needs-human-validation':'observed',[`${n(row.production_price)}/${production} registros con precio histórico`,`${lotSales} ventas live por lote`,`${settlements} liquidaciones live`],[...(!priceReady?['Cobertura de precio/costo histórico insuficiente.']:[]),...(!liveCommercialReady?['Falta ciclo comercial live pedido→venta por lote→liquidación.']:[])]),
  gate('order-fulfilment-intelligence',salesOrders>0&&lotSales>0?'pilot':'blocked','observed',[`${salesOrders} pedidos live`,`${lotSales} ventas por lote live`],salesOrders>0&&lotSales>0?['Requiere continuidad física despacho/venta validada.']:['Sin pedidos y ventas por lote live no se puede validar fulfilment real.']),
  gate('predictive-intelligence','blocked','observed',['Baselines históricas existen parcialmente, pero no están validadas por especie/proveedor/origen/proceso/período.'],['Faltan baselines segmentadas y validadas.','Falta evidencia live suficiente para medir error de predicción.'])
 ]
 return {status:'ready' as const,maturity:'pilot-evidence' as const,historicalOnly:true,writesLive:false,predictive:false,method:'copilot-readiness-v1',capabilityGates,guardrail:'Seafood AI debe obedecer responseMode. ready permite recomendación sólo cuando la evidencia de la consulta también es suficiente; pilot exige formular como hipótesis con límites; blocked exige declarar datos insuficientes y no emitir recomendación fuerte.'}
}

import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type Metric={name:string,available:number,total:number,pct:number|null,state:'ready'|'partial'|'blocked',note:string}
type CapabilityGate={capability:string,state:'ready'|'pilot'|'blocked',confidence:'observed'|'derived'|'needs-human-validation',evidence:string[],blockers:string[]}
const num=(v:unknown)=>{const x=Number(v);return Number.isFinite(x)?x:0}
const pct=(a:number,b:number)=>b?Number((a/b*100).toFixed(1)):null
const metric=(name:string,available:number,total:number,readyAt:number,note:string):Metric=>{const p=pct(available,total);return{name,available,total,pct:p,state:p==null?'blocked':p>=readyAt?'ready':available>0?'partial':'blocked',note}}

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
 try{
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  if(!(operator.role==='admin'||operator.plantIds.length>=6))return res.status(403).json({ok:false,error:'Acceso corporativo requerido'})
  const sql=getSql()
  const rows=await sql`select
   (select count(*) from historical_production_records where record_status='operational')::int production_total,
   (select count(*) from historical_production_records where record_status='operational' and nullif(btrim(guide_number),'') is not null)::int production_guide,
   (select count(*) from historical_production_records where record_status='operational' and nullif(btrim(lot_code),'') is not null)::int production_lot,
   (select count(*) from historical_production_records where record_status='operational' and received_kg is not null)::int production_received,
   (select count(*) from historical_production_records where record_status='operational' and grade_breakdown is not null and grade_breakdown<>'{}'::jsonb)::int production_grade,
   (select count(*) from historical_production_records where record_status='operational' and guide_price_clp is not null)::int production_price,
   (select count(*) from canonical_production_support_blocks where parser_version='production-support-v2')::int support_blocks,
   (select count(*) from canonical_production_support_blocks where parser_version='production-support-v2' and nullif(btrim(guide_number),'') is not null)::int support_guide,
   (select count(*) from canonical_production_support_blocks where parser_version='production-support-v2' and nullif(btrim(lot_reference),'') is not null)::int support_lot,
   (select count(*) from canonical_packing_boxes)::int packing_total,
   (select count(*) from canonical_packing_boxes where nullif(btrim(lot_code),'') is not null)::int packing_lot,
   (select count(*) from canonical_packing_boxes where production_date is not null)::int packing_date,
   (select count(*) from canonical_packing_boxes where total_kg is not null and total_kg>0)::int packing_kg,
   (select count(*) from canonical_account_entries)::int ledger_total,
   (select count(*) from canonical_account_entries where event_date is not null)::int ledger_date,
   (select count(*) from canonical_account_entries where nullif(btrim(description),'') is not null)::int ledger_desc,
   (select count(*) from canonical_account_entries where coalesce(inflow_clp,0)<>0 or coalesce(outflow_clp,0)<>0)::int ledger_amount,
   (select count(*) from canonical_account_entries where balance_clp is not null)::int ledger_balance,
   (select count(*) from canonical_transfers_received)::int transfers_total,
   (select count(*) from canonical_transfers_received where event_date is not null and amount_clp is not null and nullif(btrim(bank),'') is not null)::int transfers_complete,
   (select count(*) from sales_orders)::int sales_orders,
   (select count(*) from lot_sales)::int lot_sales,
   (select count(*) from settlements)::int settlements`
  const r=(Array.isArray(rows)?rows[0]:rows) as Record<string,unknown>
  const pt=num(r.production_total),sb=num(r.support_blocks),pk=num(r.packing_total),lt=num(r.ledger_total),tt=num(r.transfers_total)
  const dimensions={
   production:[metric('guía',num(r.production_guide),pt,95,'Identidad documental de recepción'),metric('lote',num(r.production_lot),pt,95,'Identidad de lote'),metric('kg recibidos',num(r.production_received),pt,95,'Masa observada'),metric('grados',num(r.production_grade),pt,90,'Composición/calidad histórica')],
   economics:[metric('precio materia prima',num(r.production_price),pt,80,'Cobertura mínima recomendada antes de automatizar margen por proveedor')],
   supplierSupport:[metric('guía soporte',num(r.support_guide),sb,95,'Identidad auxiliar'),metric('lote soporte',num(r.support_lot),sb,75,'Referencia de lote auxiliar; faltantes requieren vínculo por guía')],
   packing:[metric('lote packing',num(r.packing_lot),pk,75,'Trazabilidad directa por lote'),metric('fecha packing',num(r.packing_date),pk,95,'Fecha observada'),metric('kg packing',num(r.packing_kg),pk,95,'Masa de caja')],
   finance:[metric('fecha ledger',num(r.ledger_date),lt,90,'Fecha estructural'),metric('descripción ledger',num(r.ledger_desc),lt,95,'Concepto registrado'),metric('monto ledger',num(r.ledger_amount),lt,90,'Movimiento con importe'),metric('balance ledger',num(r.ledger_balance),lt,95,'Balance registrado; no implica conciliación contable validada'),metric('transferencias completas',num(r.transfers_complete),tt,95,'Fecha+monto+banco')]
  }
  const live={salesOrders:num(r.sales_orders),lotSales:num(r.lot_sales),settlements:num(r.settlements)}
  const historicalCore=[...dimensions.production,...dimensions.supplierSupport,...dimensions.packing,...dimensions.finance]
  const weightedHistoricalPct=historicalCore.length?Number((historicalCore.reduce((s,m)=>s+(m.pct??0),0)/historicalCore.length).toFixed(1)):null
  const liveCommercialReady=live.salesOrders>0&&live.lotSales>0&&live.settlements>0
  const pilotReady=(weightedHistoricalPct??0)>=85&&dimensions.production.every(m=>m.state==='ready')&&dimensions.packing.every(m=>m.state==='ready')&&dimensions.finance.every(m=>m.state==='ready')
  const priceReady=dimensions.economics[0].state==='ready'
  const supplierTraceReady=dimensions.supplierSupport[0].state==='ready'&&dimensions.production[0].state==='ready'&&dimensions.production[1].state==='ready'
  const packingTraceReady=dimensions.packing.every(m=>m.state==='ready')&&dimensions.production[1].state==='ready'
  const financeStructureReady=dimensions.finance.every(m=>m.state==='ready')
  const capabilityGates:CapabilityGate[]=[
   {capability:'historical-traceability',state:supplierTraceReady&&packingTraceReady?'ready':'pilot',confidence:'derived',evidence:[`${num(r.production_lot)}/${pt} producción con lote`,`${num(r.support_guide)}/${sb} soportes con guía`,`${num(r.packing_lot)}/${pk} cajas con lote`],blockers:packingTraceReady?[]:['IQF y/o packing sin lote explícito requieren continuidad determinística o validación humana.']},
   {capability:'supplier-pattern-intelligence',state:supplierTraceReady?'pilot':'blocked',confidence:'needs-human-validation',evidence:[`${sb} bloques auxiliares disponibles`,'Patrones históricos detectables por proveedor y régimen'],blockers:['La semántica de Kilos Aceptados/D no está validada de forma homogénea entre proveedores.','No habilitar ranking transversal todavía.']},
   {capability:'exception-intelligence',state:pilotReady?'ready':'pilot',confidence:'derived',evidence:[`${pt} registros de producción`,`${pk} cajas de packing`,`${lt} entradas de cuenta corriente`],blockers:[]},
   {capability:'margin-intelligence',state:priceReady&&liveCommercialReady?'ready':priceReady?'pilot':'blocked',confidence:priceReady?'needs-human-validation':'observed',evidence:[`${num(r.production_price)}/${pt} registros con precio histórico`,`${live.lotSales} ventas live por lote`,`${live.settlements} liquidaciones live`],blockers:[...(!priceReady?['Cobertura histórica de precio/costo insuficiente.']:[]),...(!liveCommercialReady?['Falta ciclo comercial live pedido→venta por lote→liquidación.']:[])]},
   {capability:'order-fulfilment-intelligence',state:live.salesOrders>0&&live.lotSales>0?'pilot':'blocked',confidence:'observed',evidence:[`${live.salesOrders} pedidos live`,`${live.lotSales} ventas por lote live`],blockers:live.salesOrders>0&&live.lotSales>0?['Aún requiere continuidad física despacho/venta validada.']:['Sin pedidos y ventas por lote live no se puede validar fulfilment real.']},
   {capability:'predictive-intelligence',state:'blocked',confidence:'observed',evidence:['Baselines históricas existen parcialmente, pero no están validadas por especie/proveedor/origen/proceso/período.'],blockers:['Faltan baselines segmentadas y validadas.','Falta suficiente evidencia live para medir error de predicción.']}
  ]
  const blockers=[
   ...(dimensions.economics.some(m=>m.state!=='ready')?['Cobertura de precio/costo histórico insuficiente para margen automatizado.']:[]),
   ...(!liveCommercialReady?['No existe todavía evidencia live suficiente en ventas por pedido/lote y liquidaciones.']:[])
  ]
  return res.status(200).json({ok:true,status:'ready',maturity:'pilot-evidence',historicalOnly:true,writesLive:false,method:{version:'data-readiness-v2-capability-gates',rule:'Cada porcentaje es completitud estructural observada sobre registros existentes. Los umbrales son gates explícitos de preparación, no imputaciones. La presencia de un campo no valida su significado contable u operacional.'},summary:{historicalEvidencePct:weightedHistoricalPct,pilotOperationalReady:pilotReady,liveCommercialReady,predictiveReady:false},counts:{production:pt,supplierSupportBlocks:sb,packingBoxes:pk,ledgerEntries:lt,transfers:tt,live},dimensions,capabilityGates,blockers,guardrail:'No usar estos porcentajes para afirmar validación Pescamar, exactitud contable, rendimiento causal ni capacidad predictiva. Es readiness de evidencia, no certeza de negocio.'})
 }catch(error){const message=error instanceof Error?error.message:'';return res.status(message.includes('DATABASE_URL')?503:500).json({ok:false,error:message.includes('DATABASE_URL')?'Base de datos no conectada':'No fue posible construir data readiness intelligence'})}
}

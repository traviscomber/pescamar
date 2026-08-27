import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type CapabilityStatus='ready'|'review'|'blocked'|'reference'
const rows=(value:unknown)=>Array.isArray(value)?value:[]
const n=(value:unknown)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:0}
const pct=(part:number,total:number)=>total>0?Number((part/total*100).toFixed(1)):null

export default async function handler(request:Request,response:Response){
 response.setHeader('Cache-Control','no-store')
 if(request.method!=='GET'){response.setHeader('Allow','GET');return response.status(405).json({ok:false,error:'Método no permitido'})}
 try{
  const operator=await requireOperator(request)
  if(!operator)return response.status(401).json({ok:false,error:'Sesión requerida'})
  const financial=['admin','finance','operations'].includes(operator.role)
  const sql=getSql()
  const productionBase=`
   with raw as (
    select h.*,
     coalesce((h.grade_breakdown->'A1'->>'kg')::numeric,0)+coalesce((h.grade_breakdown->'A2'->>'kg')::numeric,0)+
     coalesce((h.grade_breakdown->'Vj100'->>'kg')::numeric,0)+coalesce((h.grade_breakdown->'Vj50'->>'kg')::numeric,0)+
     coalesce((h.grade_breakdown->'C1'->>'kg')::numeric,0)+coalesce((h.grade_breakdown->'C2'->>'kg')::numeric,0)+
     coalesce((h.grade_breakdown->'D'->>'kg')::numeric,0)+coalesce((h.grade_breakdown->'PT'->>'kg')::numeric,0)+
     coalesce((h.grade_breakdown->'R'->>'kg')::numeric,0) reported_output_kg,
     case
      when lower(coalesce(nullif(btrim(h.process_site_original),''),'')) in ('curanue','santa rosa','candelaria')
       or lower(coalesce(h.lot_code,'')) like 'ig%'
       or lower(coalesce(h.lot_code,'')) like 'mdq%'
       or lower(coalesce(h.lot_code,'')) like 'mi%'
      then 'cross_lot_rollforward'
      else 'row_mass_balance'
     end capture_mode
    from historical_production_records h
    where h.record_status='operational' and h.source_file_hash in(
     select file_hash from canonical_source_files where canonical and (source_kind='production' or file_name ilike '%produccion 2026%')
    )
   ),base as (
    select *,capture_mode='row_mass_balance' and received_kg>0 and reported_output_kg>received_kg mass_review from raw
   )`
  const [sourcesRaw,productionRaw,suppliersRaw,packingRaw,stockRaw,transfersRaw,ledgerRaw]=await Promise.all([
   sql`select file_name,source_kind,record_count,period_start,period_end,imported_at from canonical_source_files where canonical order by imported_at desc,file_name`,
   sql.query(`${productionBase}
    select count(*)::int rows,coalesce(sum(guide_kg),0)::numeric guide_kg,coalesce(sum(received_kg),0)::numeric received_kg,
     coalesce(sum(guide_kg)-sum(received_kg),0)::numeric difference_kg,count(*) filter(where cardinality(data_quality_flags)>0)::int flagged,
     count(*) filter(where guide_price_clp is not null)::int priced_rows,coalesce(sum(received_kg*guide_price_clp) filter(where guide_price_clp is not null),0)::numeric priced_value_clp,
     count(*) filter(where capture_mode='row_mass_balance')::int row_mass_balance_rows,
     count(*) filter(where capture_mode='cross_lot_rollforward')::int rollforward_rows,
     coalesce(sum(received_kg) filter(where capture_mode='row_mass_balance'),0)::numeric row_mass_balance_received_kg,
     coalesce(sum(reported_output_kg) filter(where capture_mode='row_mass_balance' and not mass_review),0)::numeric reported_output_kg,
     count(*) filter(where mass_review)::int mass_inconsistent_rows,
     count(*) filter(where capture_mode='row_mass_balance' and reported_output_kg=0)::int missing_output_rows,
     min(event_date) first_date,max(event_date) last_date from base`,[]),
   sql.query(`${productionBase}
    select coalesce(nullif(btrim(supplier_name),''),nullif(btrim(supplier_original),''),'Sin proveedor') supplier,count(*)::int rows,
     coalesce(sum(guide_kg),0)::numeric guide_kg,coalesce(sum(received_kg),0)::numeric received_kg,
     count(*) filter(where cardinality(data_quality_flags)>0)::int flagged,count(*) filter(where guide_price_clp is not null)::int priced_rows,
     count(*) filter(where capture_mode='row_mass_balance')::int row_mass_balance_rows,
     count(*) filter(where capture_mode='cross_lot_rollforward')::int rollforward_rows,
     coalesce(sum(reported_output_kg) filter(where capture_mode='row_mass_balance' and not mass_review),0)::numeric reported_output_kg,
     coalesce(sum(received_kg) filter(where capture_mode='row_mass_balance'),0)::numeric row_mass_balance_received_kg,
     count(*) filter(where mass_review)::int mass_inconsistent_rows
    from base group by supplier order by received_kg desc`,[]),
   sql`select b.pack_format,count(*)::int boxes,coalesce(sum(b.total_kg),0)::numeric kg,count(distinct b.lot_code) filter(where b.lot_code is not null)::int lots,
    count(*) filter(where cardinality(b.data_quality_flags)>0)::int flagged,avg(b.total_kg)::numeric avg_box_kg,min(b.total_kg)::numeric min_box_kg,max(b.total_kg)::numeric max_box_kg,
    stddev_samp(b.total_kg)::numeric box_stddev_kg,min(b.production_date) first_date,max(b.production_date) last_date
    from canonical_packing_boxes b join canonical_source_files s on s.file_hash=b.source_file_hash and s.canonical group by b.pack_format order by b.pack_format`,
   sql`select r.product_family,count(*)::int rows,coalesce(sum(r.total_kg),0)::numeric observed_net_kg,max(r.event_date) last_date,min(r.event_date) first_date,
    count(*) filter(where cardinality(r.data_quality_flags)>0)::int flagged from canonical_stock_records r join canonical_source_files s on s.file_hash=r.source_file_hash and s.canonical
    group by r.product_family order by r.product_family`,
   financial?sql`select count(*)::int rows,coalesce(sum(t.amount_clp),0)::numeric amount_clp,min(t.event_date) first_date,max(t.event_date) last_date,
    count(*) filter(where cardinality(t.data_quality_flags)>0)::int flagged from canonical_transfers_received t join canonical_source_files s on s.file_hash=t.source_file_hash and s.canonical`:Promise.resolve([]),
   financial?sql`select count(*)::int rows,coalesce(sum(a.inflow_clp),0)::numeric inflow_clp,coalesce(sum(a.outflow_clp),0)::numeric outflow_clp,
    (array_agg(a.balance_clp order by a.source_row desc))[1] final_balance_clp,count(*) filter(where cardinality(a.data_quality_flags)>0)::int flagged,
    min(a.event_date) first_date,max(a.event_date) last_date from canonical_account_entries a join canonical_source_files s on s.file_hash=a.source_file_hash and s.canonical`:Promise.resolve([])
  ])

  const sourceFiles=rows(sourcesRaw).map(item=>{const row=item as Record<string,unknown>;return {fileName:String(row.file_name??''),kind:String(row.source_kind??''),recordCount:n(row.record_count),periodStart:row.period_start??null,periodEnd:row.period_end??null,importedAt:row.imported_at??null}})
  const production=(rows(productionRaw)[0]??{}) as Record<string,unknown>
  const productionRows=n(production.rows),guideKg=n(production.guide_kg),receivedKg=n(production.received_kg),reportedOutputKg=n(production.reported_output_kg)
  const rowMassBalanceRows=n(production.row_mass_balance_rows),rollforwardRows=n(production.rollforward_rows),rowMassBalanceReceivedKg=n(production.row_mass_balance_received_kg)
  const massInconsistentRows=n(production.mass_inconsistent_rows),pricedRows=n(production.priced_rows),productionFlagged=n(production.flagged)
  const receptionPct=pct(receivedKg,guideKg),priceCoveragePct=pct(pricedRows,productionRows)
  const suppliers=rows(suppliersRaw).map(item=>{const row=item as Record<string,unknown>,supplierGuide=n(row.guide_kg),supplierReceived=n(row.received_kg),supplierOutput=n(row.reported_output_kg),supplierRows=n(row.rows),supplierPriced=n(row.priced_rows),supplierBalanceReceived=n(row.row_mass_balance_received_kg);return {
   supplier:String(row.supplier??'Sin proveedor'),rows:supplierRows,guideKg:supplierGuide,receivedKg:supplierReceived,receptionPct:pct(supplierReceived,supplierGuide),
   rowMassBalanceRows:n(row.row_mass_balance_rows),rollforwardRows:n(row.rollforward_rows),reportedOutputKg:supplierOutput,reportedOutputPct:pct(supplierOutput,supplierBalanceReceived),
   massInconsistentRows:n(row.mass_inconsistent_rows),flagged:n(row.flagged),priceCoveragePct:pct(supplierPriced,supplierRows)
  }})
  const packing=rows(packingRaw).map(item=>{const row=item as Record<string,unknown>;return {format:String(row.pack_format??''),boxes:n(row.boxes),kg:n(row.kg),lots:n(row.lots),flagged:n(row.flagged),avgBoxKg:n(row.avg_box_kg),minBoxKg:n(row.min_box_kg),maxBoxKg:n(row.max_box_kg),boxStddevKg:row.box_stddev_kg==null?null:n(row.box_stddev_kg),firstDate:row.first_date??null,lastDate:row.last_date??null}})
  const stock=rows(stockRaw).map(item=>{const row=item as Record<string,unknown>;return {productFamily:String(row.product_family??''),rows:n(row.rows),observedNetKg:n(row.observed_net_kg),firstDate:row.first_date??null,lastDate:row.last_date??null,flagged:n(row.flagged)}})
  const transfers=financial?(rows(transfersRaw)[0] as Record<string,unknown>|undefined):undefined
  const ledger=financial?(rows(ledgerRaw)[0] as Record<string,unknown>|undefined):undefined
  const packingBoxes=packing.reduce((sum,item)=>sum+item.boxes,0),packingKg=packing.reduce((sum,item)=>sum+item.kg,0),packingFlagged=packing.reduce((sum,item)=>sum+item.flagged,0)
  const stockRows=stock.reduce((sum,item)=>sum+item.rows,0),stockFlagged=stock.reduce((sum,item)=>sum+item.flagged,0)
  const transferRows=n(transfers?.rows),transferFlagged=n(transfers?.flagged),ledgerRows=n(ledger?.rows),ledgerFlagged=n(ledger?.flagged)
  const totalRows=productionRows+packingBoxes+stockRows+transferRows+ledgerRows,totalFlagged=productionFlagged+packingFlagged+stockFlagged+transferFlagged+ledgerFlagged
  const exceptions=[] as Array<{severity:'warning'|'info';kind:string;title:string;detail:string}>
  for(const supplier of suppliers){if(supplier.guideKg>=1000&&supplier.receptionPct!==null&&supplier.receptionPct<95)exceptions.push({severity:'warning',kind:'proveedor',title:`${supplier.supplier}: recepción ${supplier.receptionPct.toFixed(1)}%`,detail:`${supplier.receivedKg.toLocaleString('es-CL',{maximumFractionDigits:1})} kg recibidos de ${supplier.guideKg.toLocaleString('es-CL',{maximumFractionDigits:1})} kg guía.`})}
  if(rollforwardRows)exceptions.push({severity:'info',kind:'semantica-captura',title:`${rollforwardRows} filas usan captura roll-forward por planta`,detail:'Curanue/Isla Guafo, Santa Rosa y candelaria/Cesar registran grados o destinos con arrastre entre lotes. No se comparan fila a fila ni se atribuyen como error al proveedor.'})
  if(massInconsistentRows)exceptions.push({severity:'warning',kind:'consistencia-masa',title:`${massInconsistentRows} filas directas requieren reconciliar masa`,detail:'Estas filas sí pertenecen a captura directa y la suma de categorías supera los kilos recibidos.'})
  if(productionRows&&pricedRows<productionRows)exceptions.push({severity:'info',kind:'cobertura-precio',title:`Precio guía disponible en ${priceCoveragePct??0}% de producción`,detail:`${pricedRows} de ${productionRows} registros tienen precio. Los valores económicos derivados se mantienen como referencia parcial, no como margen.`})
  for(const item of packing){if(item.flagged)exceptions.push({severity:'info',kind:'packing',title:`${item.flagged} cajas ${item.format} requieren trazabilidad adicional`,detail:item.lots?`${item.lots} lotes identificados en la fuente.`:'La fuente no aporta referencia de lote utilizable para estas cajas.'})}
  if(ledgerFlagged)exceptions.push({severity:'info',kind:'finanzas',title:`${ledgerFlagged} movimientos de cuenta con observaciones de calidad`,detail:'Fechas, fórmulas o secuencia de origen deben mantenerse visibles antes de interpretar el saldo reconstruido.'})
  const finance=financial?{transfers:{rows:transferRows,amountClp:n(transfers?.amount_clp),flagged:transferFlagged,firstDate:transfers?.first_date??null,lastDate:transfers?.last_date??null},ledger:{rows:ledgerRows,inflowClp:n(ledger?.inflow_clp),outflowClp:n(ledger?.outflow_clp),balanceClp:n(ledger?.final_balance_clp),flagged:ledgerFlagged,firstDate:ledger?.first_date??null,lastDate:ledger?.last_date??null}}:null

  const capability=(key:string,label:string,status:CapabilityStatus,detail:string)=>({key,label,status,detail})
  const capabilities=[
   capability('reception','Recepción vs guía',productionRows&&receptionPct!==null?'ready':'blocked',productionRows&&receptionPct!==null?`${receptionPct.toFixed(1)}% de kilos guía están explicados por kilos recibidos en ${productionRows} registros canónicos.`:'Falta producción canónica comparable.'),
   capability('packing','Packing pulpo',packingBoxes?(packingFlagged?'review':'ready'):'blocked',packingBoxes?`${packingBoxes} cajas y ${packingKg.toLocaleString('es-CL',{maximumFractionDigits:1})} kg; ${packingFlagged} cajas requieren completar trazabilidad.`:'Falta evidencia canónica de packing.'),
   capability('supplier','Decisión por proveedor',suppliers.length?(rollforwardRows||massInconsistentRows?'review':'ready'):'blocked',suppliers.length?`${suppliers.length} proveedores con volumen/cumplimiento canónico. ${rollforwardRows} filas de planta se excluyen de masa/rendimiento por su semántica roll-forward, sin castigar al proveedor.`:'Falta producción canónica por proveedor.'),
   capability('yield','Rendimiento',rollforwardRows||massInconsistentRows?'blocked':reportedOutputKg>0?'review':'blocked',rollforwardRows?`${rowMassBalanceRows} filas son comparables fila a fila, pero ${rollforwardRows} usan arrastre entre lotes. Se puede analizar composición directa; el rendimiento total sigue bloqueado hasta conciliar ese roll-forward.`:massInconsistentRows?`${massInconsistentRows} filas directas no reconcilian masa.`:reportedOutputKg>0?'La masa directa reconcilia; falta validar que la salida reportada sea completa antes de publicar rendimiento oficial.':'No existe salida productiva suficiente.'),
   capability('purchase-cost','Costo de compra',priceCoveragePct===100?'ready':'blocked',priceCoveragePct===100?'Precio guía disponible en toda la producción canónica.':`Precio guía disponible en ${priceCoveragePct??0}% de las filas; no publicar costo total ni margen como cifra completa.`),
   capability('ledger','Cuenta reconstruida',finance?(ledgerFlagged?'review':'reference'):'reference',finance?`${ledgerRows} movimientos reconstruidos desde CUENTA2; ${ledgerFlagged} presentan observaciones de calidad.`:'Información financiera oculta para este rol.')
  ]
  const actions=[] as Array<{priority:1|2|3;kind:string;title:string;detail:string}>
  if(rollforwardRows)actions.push({priority:1,kind:'rollforward-reconciliation',title:`Conciliar ${rollforwardRows} filas roll-forward por lote`,detail:'Vincular arrastres de Isla Guafo/Curanue, Santa Rosa y Cesar/candelaria entre recepción, grado y destino para recuperar rendimiento sin sumar columnas incompatibles.'})
  if(massInconsistentRows)actions.push({priority:1,kind:'mass-reconciliation',title:`Revisar ${massInconsistentRows} filas directas`,detail:'Estas sí son comparables fila a fila y requieren corregir la masa antes de entrar a rendimiento.'})
  if(priceCoveragePct!==100)actions.push({priority:1,kind:'price-coverage',title:`Completar precio en ${productionRows-pricedRows} registros`,detail:`La cobertura actual es ${priceCoveragePct??0}%. Con 100% de precio guía se habilita costo de compra canónico; margen todavía requiere venta/costo de transformación trazables.`})
  if(packingFlagged)actions.push({priority:2,kind:'packing-traceability',title:`Completar trazabilidad de ${packingFlagged} cajas`,detail:'Asignar referencia de lote o regla equivalente a las cajas hoy marcadas por la fuente de packing.'})
  if(ledgerFlagged)actions.push({priority:2,kind:'ledger-quality',title:`Revisar ${ledgerFlagged} movimientos de CUENTA2`,detail:'Corregir outliers de fecha, fórmulas o secuencia antes de usar el saldo reconstruido como control financiero.'})
  const topSupplier=suppliers[0]??null,topSupplierSharePct=topSupplier?pct(topSupplier.receivedKg,receivedKg):null
  const blocked=capabilities.filter(item=>item.status==='blocked').map(item=>item.label.toLowerCase())
  const headline=blocked.length?`Recepción y packing ya generan señal operativa; ${blocked.join(' y ')} siguen bloqueados por cobertura o semántica de captura.`:'La evidencia canónica disponible permite operar los indicadores principales sin bloqueos estructurales.'
  const decisionBrief={headline,capabilities,actions,supplierConcentration:topSupplier?{supplier:topSupplier.supplier,receivedKg:topSupplier.receivedKg,sharePct:topSupplierSharePct}:null}

  return response.status(200).json({
   ok:true,generatedAt:new Date().toISOString(),sources:{count:sourceFiles.length,files:sourceFiles},
   production:{rows:productionRows,guideKg,receivedKg,differenceKg:n(production.difference_kg),receptionPct,flagged:productionFlagged,pricedRows,priceCoveragePct,pricedValueClp:n(production.priced_value_clp),firstDate:production.first_date??null,lastDate:production.last_date??null,rowMassBalanceRows,rollforwardRows,rowMassBalanceReceivedKg,reportedOutputKg,reportedOutputPct:pct(reportedOutputKg,rowMassBalanceReceivedKg),massInconsistentRows,missingOutputRows:n(production.missing_output_rows),reportedOutputUsable:rollforwardRows===0&&massInconsistentRows===0},
   suppliers,packing,packingSummary:{boxes:packingBoxes,kg:packingKg,lots:packing.reduce((sum,item)=>sum+item.lots,0),flagged:packingFlagged},stock,finance,
   dataQuality:{totalRows,totalFlagged,flaggedPct:pct(totalFlagged,totalRows),rowMassBalanceRows,rollforwardRows,massInconsistentRows},decisionBrief,exceptions
  })
 }catch(error){const message=error instanceof Error?error.message:'';return response.status(message.includes('DATABASE_URL')?503:500).json({ok:false,error:message.includes('DATABASE_URL')?'Base de datos no conectada':'No fue posible construir la inteligencia Pescamar'})}
}
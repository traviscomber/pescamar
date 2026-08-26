import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
const rows=(value:unknown)=>Array.isArray(value)?value:[]

export default async function handler(request:Request,response:Response){
  response.setHeader('Cache-Control','no-store')
  if(request.method!=='GET'){response.setHeader('Allow','GET');return response.status(405).json({ok:false,error:'Método no permitido'})}
  try{
    const operator=await requireOperator(request)
    if(!operator)return response.status(401).json({ok:false,error:'Sesión requerida'})
    const financial=['admin','finance','operations'].includes(operator.role)
    const sql=getSql()
    const [productionRaw,suppliersRaw,packingRaw,stockRaw,transfersRaw,ledgerRaw]=await Promise.all([
      sql`select count(*)::int rows,coalesce(sum(guide_kg),0)::numeric guide_kg,coalesce(sum(received_kg),0)::numeric received_kg,coalesce(sum(guide_kg)-sum(received_kg),0)::numeric difference_kg,count(*) filter(where cardinality(data_quality_flags)>0)::int flagged,min(event_date) first_date,max(event_date) last_date from historical_production_records where source_file_hash='ce92c3ff3da518b181eb826257a23187257b05173e0026c16a5e09230b6ea9b0'`,
      sql`select coalesce(supplier_name,supplier_original,'Sin proveedor') supplier,count(*)::int rows,coalesce(sum(guide_kg),0)::numeric guide_kg,coalesce(sum(received_kg),0)::numeric received_kg,round(case when sum(coalesce(guide_kg,0))>0 then sum(coalesce(received_kg,0))/sum(coalesce(guide_kg,0))*100 else null end,1) reception_pct from historical_production_records where source_file_hash='ce92c3ff3da518b181eb826257a23187257b05173e0026c16a5e09230b6ea9b0' group by 1 order by received_kg desc`,
      sql`select pack_format,count(*)::int boxes,coalesce(sum(total_kg),0)::numeric kg,count(distinct lot_code) filter(where lot_code is not null)::int lots,count(*) filter(where cardinality(data_quality_flags)>0)::int flagged,min(production_date) first_date,max(production_date) last_date from canonical_packing_boxes where source_file_hash='b6248bd7b9d8f20079eef1e8a3a3e8c5006661e3850802ab1431c2e1ce317972' group by pack_format order by pack_format`,
      sql`select product_family,count(*)::int rows,coalesce(sum(total_kg),0)::numeric accumulated_kg,max(event_date) last_date,count(*) filter(where cardinality(data_quality_flags)>0)::int flagged from canonical_stock_records where source_file_hash='5483c63d9605e8fab93e669ac94db3f871a116f725dd74203660b3c76af515fb' group by product_family order by product_family`,
      financial?sql`select count(*)::int rows,coalesce(sum(amount_clp),0)::numeric amount_clp,min(event_date) first_date,max(event_date) last_date,count(*) filter(where cardinality(data_quality_flags)>0)::int flagged from canonical_transfers_received where source_file_hash='5483c63d9605e8fab93e669ac94db3f871a116f725dd74203660b3c76af515fb'`:Promise.resolve([]),
      financial?sql`select count(*)::int rows,coalesce(sum(inflow_clp),0)::numeric inflow_clp,coalesce(sum(outflow_clp),0)::numeric outflow_clp,(array_agg(balance_clp order by source_row desc))[1] final_balance_clp,count(*) filter(where cardinality(data_quality_flags)>0)::int flagged,min(event_date) first_date,max(event_date) last_date from canonical_account_entries where source_file_hash='5483c63d9605e8fab93e669ac94db3f871a116f725dd74203660b3c76af515fb'`:Promise.resolve([])
    ])
    const production=rows(productionRaw)[0] as Record<string,unknown>|undefined
    const guideKg=Number(production?.guide_kg??0),receivedKg=Number(production?.received_kg??0)
    const suppliers=rows(suppliersRaw).map(item=>{const row=item as Record<string,unknown>;return {supplier:String(row.supplier??'Sin proveedor'),rows:Number(row.rows??0),guideKg:Number(row.guide_kg??0),receivedKg:Number(row.received_kg??0),receptionPct:row.reception_pct==null?null:Number(row.reception_pct)}})
    const packing=rows(packingRaw).map(item=>{const row=item as Record<string,unknown>;return {format:String(row.pack_format??''),boxes:Number(row.boxes??0),kg:Number(row.kg??0),lots:Number(row.lots??0),flagged:Number(row.flagged??0),firstDate:row.first_date??null,lastDate:row.last_date??null}})
    const stock=rows(stockRaw).map(item=>{const row=item as Record<string,unknown>;return {productFamily:String(row.product_family??''),rows:Number(row.rows??0),accumulatedKg:Number(row.accumulated_kg??0),lastDate:row.last_date??null,flagged:Number(row.flagged??0)}})
    const transfers=financial?(rows(transfersRaw)[0] as Record<string,unknown>|undefined):undefined
    const ledger=financial?(rows(ledgerRaw)[0] as Record<string,unknown>|undefined):undefined
    const exceptions=[] as Array<{severity:'warning'|'info';kind:string;title:string;detail:string}>
    for(const supplier of suppliers){if(supplier.guideKg>=1000&&supplier.receptionPct!==null&&supplier.receptionPct<95)exceptions.push({severity:'warning',kind:'proveedor',title:`${supplier.supplier}: recepción ${supplier.receptionPct.toFixed(1)}%`,detail:`${supplier.receivedKg.toLocaleString('es-CL',{maximumFractionDigits:1})} kg recibidos de ${supplier.guideKg.toLocaleString('es-CL',{maximumFractionDigits:1})} kg guía.`})}
    const iqf=packing.find(item=>item.format==='IQF');if(iqf?.flagged)exceptions.push({severity:'info',kind:'packing',title:`${iqf.flagged} cajas IQF sin lote verificable`,detail:'Se mantienen en la Base de Datos Pescamar y requieren reconciliación antes de asociarlas a un lote.'})
    const flagged=Number(production?.flagged??0)+packing.reduce((sum,item)=>sum+item.flagged,0)+stock.reduce((sum,item)=>sum+item.flagged,0)+Number(transfers?.flagged??0)+Number(ledger?.flagged??0)
    return response.status(200).json({ok:true,generatedAt:new Date().toISOString(),production:{rows:Number(production?.rows??0),guideKg,receivedKg,differenceKg:Number(production?.difference_kg??0),receptionPct:guideKg>0?Number(((receivedKg/guideKg)*100).toFixed(1)):null,flagged:Number(production?.flagged??0),firstDate:production?.first_date??null,lastDate:production?.last_date??null},suppliers,packing,stock,finance:financial?{transfers:{rows:Number(transfers?.rows??0),amountClp:Number(transfers?.amount_clp??0),firstDate:transfers?.first_date??null,lastDate:transfers?.last_date??null},ledger:{rows:Number(ledger?.rows??0),inflowClp:Number(ledger?.inflow_clp??0),outflowClp:Number(ledger?.outflow_clp??0),balanceClp:Number(ledger?.final_balance_clp??0),flagged:Number(ledger?.flagged??0)}}:null,exceptions,totalFlagged:flagged})
  }catch(error){const message=error instanceof Error?error.message:'';return response.status(message.includes('DATABASE_URL')?503:500).json({ok:false,error:message.includes('DATABASE_URL')?'Base de datos no conectada':'No fue posible construir la inteligencia Pescamar'})}
}

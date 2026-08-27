import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
const n=(value:unknown)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:0}
const pct=(part:number,total:number)=>total>0?Number((part/total*100).toFixed(1)):null
const CATEGORIES=[['A1','a1_kg'],['A2','a2_kg'],['Vj100','vj100_kg'],['Vj50','vj50_kg'],['C1','c1_kg'],['C2','c2_kg'],['D','d_kg'],['PT','pt_kg'],['R','r_kg']] as const

export default async function handler(request:Request,response:Response){
 response.setHeader('Cache-Control','no-store')
 if(request.method!=='GET'){response.setHeader('Allow','GET');return response.status(405).json({ok:false,error:'Método no permitido'})}
 try{
  const operator=await requireOperator(request)
  if(!operator)return response.status(401).json({ok:false,error:'Sesión requerida'})
  const sql=getSql()
  const baseSql=`
    with raw as (
      select coalesce(nullif(btrim(h.supplier_name),''),nullif(btrim(h.supplier_original),''),'Sin proveedor') supplier,
        coalesce(nullif(btrim(h.process_site_original),''),nullif(btrim(h.plant_id),''),'Sin planta') process_site,
        coalesce(h.received_kg,0) received_kg,
        coalesce((h.grade_breakdown->'A1'->>'kg')::numeric,0) a1_kg,
        coalesce((h.grade_breakdown->'A2'->>'kg')::numeric,0) a2_kg,
        coalesce((h.grade_breakdown->'Vj100'->>'kg')::numeric,0) vj100_kg,
        coalesce((h.grade_breakdown->'Vj50'->>'kg')::numeric,0) vj50_kg,
        coalesce((h.grade_breakdown->'C1'->>'kg')::numeric,0) c1_kg,
        coalesce((h.grade_breakdown->'C2'->>'kg')::numeric,0) c2_kg,
        coalesce((h.grade_breakdown->'D'->>'kg')::numeric,0) d_kg,
        coalesce((h.grade_breakdown->'PT'->>'kg')::numeric,0) pt_kg,
        coalesce((h.grade_breakdown->'R'->>'kg')::numeric,0) r_kg
      from historical_production_records h
      where h.record_status='operational' and h.source_file_hash in(
        select file_hash from canonical_source_files where canonical and (source_kind='production' or file_name ilike '%produccion%')
      )
    ), measured as (
      select *,a1_kg+a2_kg+vj100_kg+vj50_kg+c1_kg+c2_kg+d_kg+pt_kg+r_kg category_kg from raw
    ), classified as (
      select *,received_kg>0 and category_kg>received_kg mass_review from measured
    )`
  const [summaryRaw,supplierRaw,siteRaw]=await Promise.all([
   sql.query(`${baseSql}
    select count(*)::int rows,count(*) filter(where not mass_review and category_kg>0)::int eligible_rows,
      count(*) filter(where mass_review)::int excluded_rows,count(*) filter(where category_kg=0)::int missing_output_rows,
      coalesce(sum(category_kg) filter(where not mass_review),0)::numeric reconciled_category_kg,
      coalesce(sum(a1_kg) filter(where not mass_review),0)::numeric a1_kg,
      coalesce(sum(a2_kg) filter(where not mass_review),0)::numeric a2_kg,
      coalesce(sum(vj100_kg) filter(where not mass_review),0)::numeric vj100_kg,
      coalesce(sum(vj50_kg) filter(where not mass_review),0)::numeric vj50_kg,
      coalesce(sum(c1_kg) filter(where not mass_review),0)::numeric c1_kg,
      coalesce(sum(c2_kg) filter(where not mass_review),0)::numeric c2_kg,
      coalesce(sum(d_kg) filter(where not mass_review),0)::numeric d_kg,
      coalesce(sum(pt_kg) filter(where not mass_review),0)::numeric pt_kg,
      coalesce(sum(r_kg) filter(where not mass_review),0)::numeric r_kg
    from classified`,[]),
   sql.query(`${baseSql}
    select supplier,count(*)::int rows,coalesce(sum(received_kg),0)::numeric received_kg,
      count(*) filter(where mass_review)::int mass_review_rows,
      count(*) filter(where not mass_review and category_kg>0)::int eligible_rows,
      coalesce(sum(category_kg) filter(where not mass_review),0)::numeric reconciled_category_kg
    from classified group by supplier order by received_kg desc`,[]),
   sql.query(`${baseSql}
    select process_site,count(*)::int rows,coalesce(sum(received_kg),0)::numeric received_kg,
      count(*) filter(where mass_review)::int mass_review_rows,
      count(*) filter(where not mass_review and category_kg>0)::int eligible_rows,
      coalesce(sum(category_kg) filter(where not mass_review),0)::numeric reconciled_category_kg
    from classified group by process_site order by rows desc`,[])
  ])
  const raw=(Array.isArray(summaryRaw)?summaryRaw[0]:null) as Record<string,unknown>|null
  const totalKg=n(raw?.reconciled_category_kg)
  const categories=CATEGORIES.map(([label,key])=>{const value=n(raw?.[key]);return {label,kg:value,sharePct:pct(value,totalKg)}}).filter(item=>item.kg>0)
  const shape=(item:unknown,labelKey:'supplier'|'process_site')=>{const row=item as Record<string,unknown>,rows=n(row.rows),massReviewRows=n(row.mass_review_rows);return {name:String(row[labelKey]??(labelKey==='supplier'?'Sin proveedor':'Sin planta')),rows,receivedKg:n(row.received_kg),massReviewRows,eligibleRows:n(row.eligible_rows),massReconciledPct:rows?Number(((rows-massReviewRows)/rows*100).toFixed(1)):null,reconciledCategoryKg:n(row.reconciled_category_kg)}}
  const suppliers=(Array.isArray(supplierRaw)?supplierRaw:[]).map(item=>{const row=shape(item,'supplier');return {supplier:row.name,rows:row.rows,receivedKg:row.receivedKg,massReviewRows:row.massReviewRows,eligibleRows:row.eligibleRows,massReconciledPct:row.massReconciledPct,reconciledCategoryKg:row.reconciledCategoryKg}})
  const sites=(Array.isArray(siteRaw)?siteRaw:[]).map(item=>{const row=shape(item,'process_site');return {site:row.name,rows:row.rows,receivedKg:row.receivedKg,massReviewRows:row.massReviewRows,eligibleRows:row.eligibleRows,massReconciledPct:row.massReconciledPct,reconciledCategoryKg:row.reconciledCategoryKg}})
  return response.status(200).json({ok:true,method:{version:'canonical-category-mix-v1.1-capture-pattern',rule:'Sólo suma categorías A1, A2, Vj100, Vj50, C1, C2, D, PT y R en filas donde esa suma no supera los kg recibidos. Las filas no reconciliadas se excluyen del mix y no se transforman en rendimiento ni Supplier Score. La distribución por planta se muestra para detectar diferencias de captura antes de atribuirlas al proveedor.'},summary:{rows:n(raw?.rows),eligibleRows:n(raw?.eligible_rows),excludedRows:n(raw?.excluded_rows),missingOutputRows:n(raw?.missing_output_rows),reconciledCategoryKg:totalKg},categories,suppliers,sites})
 }catch(error){const message=error instanceof Error?error.message:'';return response.status(message.includes('DATABASE_URL')?503:500).json({ok:false,error:message.includes('DATABASE_URL')?'Base de datos no conectada':'No fue posible calcular el mix canónico reconciliado'})}
}

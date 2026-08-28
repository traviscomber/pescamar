import {getSql} from './_db.js'

declare const process:{env:Record<string,string|undefined>}
export type Health='healthy'|'degraded'|'stuck'|'broken'
export type HealthCheck={key:string;label:string;status:Health;detail:string;metrics?:Record<string,number|string|null|boolean>}
export type HealthAlert={id:string;severity:'critical'|'warning'|'info';domain:'data'|'traceability'|'vision'|'process'|'communications'|'platform';title:string;detail:string;actionPath:string}
export type OperationalHealthResult={ok:true;status:Health;summary:{checks:number;healthy:number;degraded:number;stuck:number;broken:number;critical:number;warnings:number};checks:HealthCheck[];alerts:HealthAlert[];method:{version:string;staleProcessHours:number;canonicalFreshness:string;supportExpected:{blocks:number;observations:number;zeroObservationBlocks:number};scheduledHealthCheck:boolean};deployment:{environment:string;commit:string|null};checkedAt:string}
const rows=(value:unknown)=>Array.isArray(value)?value:[]
const first=(value:unknown)=>rows(value)[0] as Record<string,unknown>|undefined
const num=(value:unknown)=>Number(value??0)
const iso=(value:unknown)=>value?new Date(String(value)).toISOString():null
const expectedCanonicalFiles=['planilla de produccion 2026.xlsx','CUENTA2.xlsx','packing pulpo pescamar 2026-2.xlsx'] as const
function overall(checks:HealthCheck[]){if(checks.some(item=>item.status==='broken'))return 'broken' as const;if(checks.some(item=>item.status==='stuck'))return 'stuck' as const;if(checks.some(item=>item.status==='degraded'))return 'degraded' as const;return 'healthy' as const}

export async function calculateOperationalHealth(options:{scheduledHealthCheck:boolean}):Promise<OperationalHealthResult>{
 const checks:HealthCheck[]=[],alerts:HealthAlert[]=[]
 const sql=getSql()
 const registry=first(await sql`select
  to_regclass('public.canonical_source_files') is not null canonical_sources,
  to_regclass('public.canonical_production_support_blocks') is not null support_blocks,
  to_regclass('public.canonical_production_support_rows') is not null support_rows,
  to_regclass('public.canonical_production_support_resolutions') is not null support_resolutions,
  to_regclass('public.sea_urchin_process_runs') is not null process_runs,
  to_regclass('public.sea_urchin_stage_checks') is not null stage_checks,
  to_regclass('public.sea_urchin_color_captures') is not null color_captures,
  to_regclass('public.sea_urchin_color_references') is not null color_references,
  to_regclass('public.reception_evidence_files') is not null evidence_files,
  to_regclass('public.whatsapp_channels') is not null whatsapp_channels,
  to_regclass('public.whatsapp_messages_raw') is not null whatsapp_messages,
  to_regclass('public.communication_insights') is not null communication_insights`)
 checks.push({key:'database',label:'Base operacional',status:'healthy',detail:'Postgres responde y el control plane puede inspeccionar el estado.',metrics:{connected:true}})

 if(!registry?.canonical_sources){
  checks.push({key:'canonical',label:'Fuentes canónicas',status:'broken',detail:'Falta la capa de fuentes canónicas.'})
  alerts.push({id:'canonical-schema',severity:'critical',domain:'data',title:'Capa canónica no disponible',detail:'No existe canonical_source_files en este entorno.',actionPath:'/importaciones'})
 }else{
  const sourceRows=rows(await sql`select file_name,file_hash,record_count,imported_at from canonical_source_files where canonical order by imported_at desc`) as Array<Record<string,unknown>>
  const present=new Set(sourceRows.map(row=>String(row.file_name)))
  const missing=expectedCanonicalFiles.filter(name=>!present.has(name))
  const lastImported=sourceRows.reduce<string|null>((latest,row)=>{const value=iso(row.imported_at);return !latest||value&&value>latest?value:latest},null)
  checks.push({key:'canonical',label:'Fuentes canónicas',status:missing.length?'degraded':'healthy',detail:missing.length?`${missing.length} de 3 fuentes aprobadas aún no están registradas.`:'Las 3 fuentes aprobadas están registradas con linaje.',metrics:{registered:expectedCanonicalFiles.length-missing.length,expected:expectedCanonicalFiles.length,lastImportedAt:lastImported}})
  if(missing.length)alerts.push({id:'canonical-missing',severity:'warning',domain:'data',title:'Fuente canónica pendiente',detail:`Falta publicar: ${missing.join(', ')}.`,actionPath:'/importaciones'})
 }

 if(!registry?.support_blocks||!registry?.support_rows){
  checks.push({key:'support-v2',label:'Trazabilidad física v2',status:'broken',detail:'Faltan tablas de bloques u observaciones de soporte.'})
  alerts.push({id:'support-schema',severity:'critical',domain:'traceability',title:'Soporte físico v2 no disponible',detail:'Las migraciones 030/032 no están completas en este entorno.',actionPath:'/importaciones'})
 }else{
  const block=first(await sql`select count(*)::int blocks,coalesce(sum(observation_count),0)::int block_observations,count(*) filter(where observation_count=0)::int zero_observation_blocks,max(imported_at) last_imported_at from canonical_production_support_blocks where parser_version='production-support-v2'`)
  const observation=first(await sql`select count(*)::int observations,max(imported_at) last_imported_at from canonical_production_support_rows where parser_version='production-support-v2'`)
  const blocks=num(block?.blocks),observations=num(observation?.observations),zero=num(block?.zero_observation_blocks)
  const loaded=blocks>0||observations>0,drift=loaded&&(blocks!==89||observations!==332||zero!==1)
  const status:Health=!loaded?'degraded':drift?'degraded':'healthy'
  checks.push({key:'support-v2',label:'Trazabilidad física v2',status,detail:!loaded?'La estructura está lista, pero el workbook canónico aún no ha publicado sus cadenas físicas.':drift?`Conteo observado ${blocks} cadenas / ${observations} observaciones; el libro canónico esperado es 89 / 332 con 1 cadena sin observaciones.`:'89 cadenas físicas y 332 observaciones coinciden con el workbook canónico.',metrics:{blocks,observations,zeroObservationBlocks:zero,lastImportedAt:iso(block?.last_imported_at)}})
  if(!loaded)alerts.push({id:'support-not-loaded',severity:'warning',domain:'traceability',title:'Evidencia física v2 pendiente',detail:'La próxima publicación del XLSX de producción debe cargar principal + 89 cadenas + 332 observaciones.',actionPath:'/importaciones'})
  else if(drift)alerts.push({id:'support-drift',severity:'warning',domain:'traceability',title:'Drift en soporte físico',detail:`Se observan ${blocks} cadenas y ${observations} observaciones; revisar linaje antes de usar la cobertura para decisión.`,actionPath:'/importaciones'})
 }

 if(!registry?.process_runs||!registry?.stage_checks){
  checks.push({key:'process',label:'Proceso erizo',status:'broken',detail:'Falta la capa de control de proceso de erizo.'})
  alerts.push({id:'process-schema',severity:'critical',domain:'process',title:'Control de proceso no disponible',detail:'No están disponibles las tablas de runs/checks de erizo.',actionPath:'/proceso-erizo'})
 }else{
  const run=first(await sql`select count(*) filter(where status in ('in_process','hold','ready_for_packing'))::int open_runs,count(*) filter(where status in ('in_process','hold','ready_for_packing') and updated_at<now()-interval '24 hours')::int stale_runs,count(*) filter(where status='hold')::int holds,max(updated_at) last_update from sea_urchin_process_runs`)
  const stage=first(await sql`select count(*) filter(where sc.status in ('deviation','hold'))::int attention,count(*) filter(where sc.status='hold')::int holds from sea_urchin_stage_checks sc join sea_urchin_process_runs r on r.id=sc.run_id where r.status in ('in_process','hold','ready_for_packing')`)
  const stale=num(run?.stale_runs),attention=num(stage?.attention),open=num(run?.open_runs)
  const status:Health=stale>0?'stuck':attention>0||num(run?.holds)>0?'degraded':'healthy'
  checks.push({key:'process',label:'Proceso erizo',status,detail:stale?`${stale} run(s) abiertos llevan más de 24 h sin actualización.`:attention?`${attention} chequeo(s) activos requieren atención.`:`${open} run(s) abiertos sin estancamiento detectado.`,metrics:{openRuns:open,staleRuns:stale,stageAttention:attention,lastUpdate:iso(run?.last_update)}})
  if(stale)alerts.push({id:'process-stale',severity:'critical',domain:'process',title:'Proceso de erizo estancado',detail:`${stale} run(s) abiertos superan 24 h sin actualización.`,actionPath:'/proceso-erizo'})
  else if(attention)alerts.push({id:'process-attention',severity:'warning',domain:'process',title:'Desviación activa en proceso',detail:`${attention} chequeo(s) de etapa están en deviation/hold.`,actionPath:'/proceso-erizo'})
 }

 if(!registry?.color_captures||!registry?.color_references||!registry?.evidence_files){
  checks.push({key:'vision',label:'Vision / color',status:'broken',detail:'Falta una parte del esquema de evidencia o Uni Vision.'})
  alerts.push({id:'vision-schema',severity:'critical',domain:'vision',title:'Uni Vision incompleto',detail:'No están disponibles todas las tablas de evidencia, capturas y referencias.',actionPath:'/proceso-erizo'})
 }else{
  const capture=first(await sql`select count(*)::int captures,count(*) filter(where created_at>now()-interval '24 hours')::int captures_24h,count(*) filter(where decision in ('pending','review','ng'))::int attention,max(created_at) last_capture from sea_urchin_color_captures`)
  const refs=first(await sql`select count(*) filter(where is_active)::int active_references,count(distinct plant_id) filter(where is_active)::int plants from sea_urchin_color_references`)
  const evidence=first(await sql`select count(*)::int files,count(*) filter(where created_at>now()-interval '24 hours')::int files_24h,max(created_at) last_file from reception_evidence_files`)
  const configured=Boolean(process.env.OPENAI_API_KEY),activeRefs=num(refs?.active_references),attention=num(capture?.attention)
  const status:Health=!configured||activeRefs===0||attention>0?'degraded':'healthy'
  const detail=!configured?'La evidencia se guarda, pero OpenAI Vision no está configurado.':activeRefs===0?'Vision está disponible, pero Uni Vision aún no tiene referencias de color activas aprobadas.':attention?`${attention} captura(s) requieren confirmación/revisión.`:'Vision y referencias de color están disponibles sin cola pendiente.'
  checks.push({key:'vision',label:'Vision / color',status,detail,metrics:{openAiConfigured:configured,captures:num(capture?.captures),captures24h:num(capture?.captures_24h),attention,activeReferences:activeRefs,referencePlants:num(refs?.plants),evidenceFiles:num(evidence?.files),lastCapture:iso(capture?.last_capture)}})
  if(!configured)alerts.push({id:'vision-config',severity:'warning',domain:'vision',title:'OpenAI Vision no configurado',detail:'Las fotos se preservan, pero no se completa extracción asistida.',actionPath:'/recepciones'})
  if(activeRefs===0)alerts.push({id:'vision-references',severity:'warning',domain:'vision',title:'Referencias de color pendientes',detail:'Uni Vision no debe sugerir una clasificación fuerte hasta aprobar referencias reales por planta.',actionPath:'/proceso-erizo'})
  if(attention)alerts.push({id:'vision-review',severity:'warning',domain:'vision',title:'Capturas Vision por revisar',detail:`${attention} captura(s) están pending/review/ng.`,actionPath:'/proceso-erizo'})
 }

 if(!registry?.whatsapp_channels||!registry?.whatsapp_messages||!registry?.communication_insights){
  checks.push({key:'communications',label:'WhatsApp Intelligence',status:'broken',detail:'Falta el esquema de comunicaciones inteligentes.'})
  alerts.push({id:'whatsapp-schema',severity:'critical',domain:'communications',title:'WhatsApp Intelligence no disponible',detail:'No están disponibles canales, mensajes raw e insights.',actionPath:'/comunicaciones'})
 }else{
  const channel=first(await sql`select count(*) filter(where active)::int active_channels,count(*) filter(where active and interpret)::int interpreted_channels from whatsapp_channels`)
  const message=first(await sql`select count(*)::int messages,count(*) filter(where ingested_at>now()-interval '24 hours')::int messages_24h,max(ingested_at) last_ingested_at from whatsapp_messages_raw`)
  const insight=first(await sql`select count(*) filter(where status='pending')::int pending,count(*) filter(where status='pending' and severity='critical')::int critical_pending,count(*) filter(where status='pending' and severity='warning')::int warning_pending from communication_insights`)
  const configured=Boolean(process.env.WHATSAPP_WEBHOOK_SECRET),critical=num(insight?.critical_pending),pending=num(insight?.pending),messages=num(message?.messages)
  const status:Health=!configured?'degraded':critical>0?'degraded':messages===0?'degraded':'healthy'
  const detail=!configured?'El webhook no tiene secreto configurado.':critical?`${critical} insight(s) críticos esperan revisión.`:messages===0?'Canales configurados, pero todavía no hay mensajes raw ingeridos.':`${num(message?.messages_24h)} mensaje(s) ingeridos en 24 h; ${pending} insight(s) pendientes.`
  checks.push({key:'communications',label:'WhatsApp Intelligence',status,detail,metrics:{webhookConfigured:configured,activeChannels:num(channel?.active_channels),interpretedChannels:num(channel?.interpreted_channels),messages,messages24h:num(message?.messages_24h),pendingInsights:pending,criticalPending:critical,lastIngestedAt:iso(message?.last_ingested_at)}})
  if(!configured)alerts.push({id:'whatsapp-config',severity:'warning',domain:'communications',title:'Webhook WhatsApp no configurado',detail:'La estructura existe, pero no se puede aceptar ingesta sin WHATSAPP_WEBHOOK_SECRET.',actionPath:'/comunicaciones'})
  else if(messages===0)alerts.push({id:'whatsapp-no-messages',severity:'warning',domain:'communications',title:'WhatsApp sin ingesta observada',detail:'Hay canales configurados, pero no existe evidencia raw recibida todavía.',actionPath:'/comunicaciones'})
  if(critical)alerts.push({id:'whatsapp-critical',severity:'critical',domain:'communications',title:'Insight crítico sin revisar',detail:`${critical} insight(s) críticos de comunicaciones siguen pendientes.`,actionPath:'/comunicaciones'})
  else if(num(insight?.warning_pending))alerts.push({id:'whatsapp-warning',severity:'warning',domain:'communications',title:'Insights operacionales pendientes',detail:`${num(insight?.warning_pending)} warning(s) de comunicaciones requieren revisión.`,actionPath:'/comunicaciones'})
 }

 checks.push({key:'automation',label:'Supervisión automática',status:options.scheduledHealthCheck?'healthy':'degraded',detail:options.scheduledHealthCheck?'El scheduler está declarado y protegido por CRON_SECRET.':'El health es live bajo demanda; CRON_SECRET no está configurado para activar el scheduler.',metrics:{scheduledHealthCheck:options.scheduledHealthCheck}})
 if(!options.scheduledHealthCheck)alerts.push({id:'health-manual',severity:'info',domain:'platform',title:'Supervisión automática pendiente',detail:'La agenda existe, pero permanece en modo seguro hasta configurar CRON_SECRET.',actionPath:'/observabilidad'})
 const state=overall(checks)
 return {ok:true,status:state,summary:{checks:checks.length,healthy:checks.filter(item=>item.status==='healthy').length,degraded:checks.filter(item=>item.status==='degraded').length,stuck:checks.filter(item=>item.status==='stuck').length,broken:checks.filter(item=>item.status==='broken').length,critical:alerts.filter(item=>item.severity==='critical').length,warnings:alerts.filter(item=>item.severity==='warning').length},checks,alerts,method:{version:'operational-health-v2-scheduled',staleProcessHours:24,canonicalFreshness:'manual-source-no-age-penalty',supportExpected:{blocks:89,observations:332,zeroObservationBlocks:1},scheduledHealthCheck:options.scheduledHealthCheck},deployment:{environment:process.env.VERCEL_ENV??'local',commit:process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,12)??null},checkedAt:new Date().toISOString()}
}

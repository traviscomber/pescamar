import { AlertTriangle, CheckCircle2, Database, FileSpreadsheet, History, RotateCcw, ShieldCheck, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PlantImportModal } from '../components/PlantImportModal'
import { PageHeader } from '../components/PageHeader'
import { usePlatformStatus } from '../hooks/usePlatformStatus'
import { fetchSharedPlantState, publishSharedPlantState, revertSharedPlantState } from '../plantApi'
import { createImportBatch, type ImportBatch, type PlantState, type ValidatedImport } from '../plantImport'
import { plants as configuredPlants } from '../plants'

type CanonicalSource={file_hash:string;file_name:string;source_kind:string;period_start:string|null;period_end:string|null;record_count:number|string;notes:string|null}
type CanonicalRow={rows:number|string;flagged:number|string;guide_kg?:number|string;received_kg?:number|string;inflow_clp?:number|string;outflow_clp?:number|string;final_balance_clp?:number|string;amount_clp?:number|string;kg?:number|string;product_family?:string;pack_format?:string}
type CanonicalStatus={sources?:CanonicalSource[];datasets?:{production?:CanonicalRow[];ledger?:CanonicalRow[];stock?:CanonicalRow[];transfers?:CanonicalRow[];packing?:CanonicalRow[]};error?:string}
type CanonicalUploadResult={ok?:boolean;fileName?:string;fileHash?:string;result?:Record<string,number>;error?:string}
type CanonicalConnection={target:string;mode:string;total?:number|string;reception_ready?:number|string;timing_ready?:number|string;quality_ready?:number|string;review_required?:number|string;non_unique_context_rows?:number|string;non_unique_contexts?:number|string;production_before_process?:number|string;date_sequence_inconsistent?:number|string;missing_received_kg?:number|string;missing_reception_date?:number|string;missing_process_date?:number|string;process_before_reception?:number|string;production_before_reception?:number|string;yield_formula_error?:number|string;missing_production_date?:number|string;missing_grade_breakdown?:number|string;suppliers?:number|string;exact?:number|string;missing?:number|string;ambiguous?:number|string;unmatched?:number|string;lots?:number|string;exact_lots?:number|string;unmatched_lots?:number|string;outside_coverage_lots?:number|string;unresolved_within_coverage_lots?:number|string;boxes?:number|string;lot_referenced_boxes?:number|string;unreferenced_boxes?:number|string;unreferenced_kg?:number|string;upstream_last_date?:string|null;packing_first_date?:string|null;packing_last_date?:string|null;product_family?:string|null;kg?:number|string;transfers?:number|string;direct_exact_transfers?:number|string;grouped_exact_transfers?:number|string;grouped_exact_groups?:number|string;matched_transfers?:number|string;rows?:number|string;flagged?:number|string}
type CanonicalConnections={connections?:{production?:CanonicalConnection;parties?:CanonicalConnection;packing?:CanonicalConnection;finance?:CanonicalConnection;stock?:CanonicalConnection};governance?:{promotion?:string;writesLive?:boolean;rule?:string};error?:string}
const nf=new Intl.NumberFormat('es-CL',{maximumFractionDigits:1})
const clp=new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0})
const approvedNames=new Set(['planilla de produccion 2026.xlsx','CUENTA2.xlsx','packing pulpo pescamar 2026-2.xlsx'])

export function Imports(){
  const [plants,setPlants]=useState<PlantState[]>(configuredPlants)
  const [history,setHistory]=useState<ImportBatch[]>([])
  const [canonical,setCanonical]=useState<CanonicalStatus|null>(null)
  const [connections,setConnections]=useState<CanonicalConnections|null>(null)
  const [open,setOpen]=useState(false)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [reverting,setReverting]=useState('')
  const [canonicalBusy,setCanonicalBusy]=useState(false)
  const [canonicalResult,setCanonicalResult]=useState<CanonicalUploadResult|null>(null)
  const canonicalInput=useRef<HTMLInputElement>(null)
  const {status,error:statusError}=usePlatformStatus()

  const load=async()=>{
    setLoading(true)
    try{
      const [state,canonicalResponse,connectionsResponse]=await Promise.all([
        fetchSharedPlantState(),
        fetch('/api/canonical-status',{cache:'no-store'}),
        fetch('/api/canonical-connections',{cache:'no-store'})
      ])
      setPlants(state.plants?.length?state.plants:configuredPlants)
      setHistory(state.history??[])
      if(canonicalResponse.ok)setCanonical(await canonicalResponse.json() as CanonicalStatus)
      if(connectionsResponse.ok)setConnections(await connectionsResponse.json() as CanonicalConnections)
      else setConnections({error:(await connectionsResponse.json().catch(()=>({} as CanonicalConnections)) as CanonicalConnections).error??'Conexiones canónicas no disponibles'})
      setError('')
    }catch(cause){
      setError(cause instanceof Error?cause.message:'No fue posible cargar las importaciones')
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{void load()},[])

  const publish=async(rows:ValidatedImport[])=>{
    const batch=createImportBatch(plants,rows)
    await publishSharedPlantState(batch)
    setPlants(batch.resultingPlants)
    await load()
  }

  const uploadCanonical=async(file:File)=>{
    if(!approvedNames.has(file.name)){setCanonicalResult({ok:false,error:'El archivo no corresponde a una de las tres fuentes canónicas aprobadas.'});return}
    if(file.size>15*1024*1024){setCanonicalResult({ok:false,error:'El archivo supera 15 MB.'});return}
    setCanonicalBusy(true);setCanonicalResult(null);setError('')
    try{
      const base64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('No fue posible leer el archivo'));reader.onload=()=>resolve(String(reader.result??''));reader.readAsDataURL(file)})
      const response=await fetch('/api/canonical-upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fileName:file.name,base64})})
      const payload=await response.json() as CanonicalUploadResult
      if(!response.ok)throw new Error(payload.error??'No fue posible publicar la fuente canónica')
      setCanonicalResult(payload)
      await load()
    }catch(cause){setCanonicalResult({ok:false,error:cause instanceof Error?cause.message:'No fue posible publicar la fuente canónica'})}
    finally{setCanonicalBusy(false);if(canonicalInput.current)canonicalInput.current.value=''}
  }

  const latestActive=useMemo(()=>history.find(batch=>!batch.revertedAt),[history])
  const canonicalRows=useMemo(()=>Object.values(canonical?.datasets??{}).flat().reduce((sum,row)=>sum+Number(row.rows??0),0),[canonical])
  const flaggedRows=useMemo(()=>Object.values(canonical?.datasets??{}).flat().reduce((sum,row)=>sum+Number(row.flagged??0),0),[canonical])
  const production=canonical?.datasets?.production?.[0],ledger=canonical?.datasets?.ledger?.[0],transfers=canonical?.datasets?.transfers?.[0]
  const packingKg=(canonical?.datasets?.packing??[]).reduce((sum,row)=>sum+Number(row.kg??0),0)
  const productionReview=Number(connections?.connections?.production?.review_required??0)
  const connectionRows=useMemo(()=>{
    const value=connections?.connections
    if(!value)return []
    const productionConnection=value.production,review=Number(productionConnection?.review_required??0),productionFlags=Number(productionConnection?.flagged??0),contextRows=Number(productionConnection?.non_unique_context_rows??0),contexts=Number(productionConnection?.non_unique_contexts??0)
    const parties=value.parties,partyMissing=Number(parties?.missing??0),partyAmbiguous=Number(parties?.ambiguous??0)
    const packing=value.packing,packingReview=Number(packing?.unresolved_within_coverage_lots??0),packingCoverage=Number(packing?.outside_coverage_lots??0),packingUnreferenced=Number(packing?.unreferenced_boxes??0),packingProduct=packing?.product_family?` ${packing.product_family}`:''
    const finance=value.finance,financeGrouped=Number(finance?.grouped_exact_transfers??0),financeGroups=Number(finance?.grouped_exact_groups??0),financeUnresolved=Number(finance?.unmatched??0)+Number(finance?.ambiguous??0)
    return [
      {key:'production',title:'Producción → operación',detail:`${nf.format(Number(productionConnection?.reception_ready??0))} filas elegibles para recepción · ${nf.format(productionFlags)} con flags · ${nf.format(contextRows)} filas en ${nf.format(contexts)} contextos no únicos · ${nf.format(review)} requieren revisión`,target:productionConnection?.target,status:review>0?'REVISAR':'EXACTO'},
      {key:'parties',title:'Proveedores → maestro',detail:`${nf.format(Number(parties?.exact??0))} identidades exactas · ${nf.format(partyMissing)} pendientes de alta en maestro · ${nf.format(partyAmbiguous)} ambiguas`,target:parties?.target,status:partyAmbiguous>0?'REVISAR':partyMissing>0?'MAESTRO':'EXACTO'},
      {key:'packing',title:`Packing${packingProduct} → lotes`,detail:`${nf.format(Number(packing?.exact_lots??0))} lotes exactos · ${nf.format(packingCoverage)} fuera de cobertura upstream · ${nf.format(packingReview)} requieren revisión · ${nf.format(Number(packing?.lot_referenced_boxes??0))}/${nf.format(Number(packing?.boxes??0))} cajas con lote · ${nf.format(packingUnreferenced)} sin referencia de lote`,target:packing?.target,status:packingReview>0?'REVISAR':packingCoverage>0||packingUnreferenced>0?'COBERTURA':'EXACTO'},
      {key:'finance',title:'CUENTA2 → finanzas',detail:`${nf.format(Number(finance?.direct_exact_transfers??0))} transferencias 1:1 · ${nf.format(financeGrouped)} conciliadas en ${nf.format(financeGroups)} depósitos agrupados · ${nf.format(financeUnresolved)} sin resolver`,target:finance?.target,status:financeUnresolved>0?'REVISAR':financeGrouped>0?'CONCILIADO':'EXACTO'},
      {key:'stock',title:'Stock → inventario',detail:`${nf.format(Number(value.stock?.rows??0))} filas staging · ${nf.format(Number(value.stock?.kg??0))} kg · ${nf.format(Number(value.stock?.flagged??0))} con flags`,target:value.stock?.target,status:'STAGING'}
    ]
  },[connections])
  const revert=async(batchId:string)=>{
    setReverting(batchId)
    try{
      const result=await revertSharedPlantState(batchId)
      setPlants(result.plants?.length?result.plants:configuredPlants)
      await load()
    }catch(cause){
      setError(cause instanceof Error?cause.message:'No fue posible revertir la importación')
    }finally{
      setReverting('')
    }
  }

  return <>
    <PageHeader
      eyebrow="Gobierno de datos"
      title="Importar planilla"
      description="Carga planillas operacionales y controla las fuentes canónicas que alimentan producción, stock, packing y finanzas sin escribir directamente sobre transacciones live."
      actions={<button className="button primary" onClick={()=>setOpen(true)}><Upload size={16}/>Importar operacional</button>}
    />

    <section className="platform-strip">
      <div><span className={`platform-dot ${status?.ok?'online':'pending'}`}/><span><small>Vercel Functions</small><b>{status?.ok?'Conectado':statusError?'No disponible':'Comprobando…'}</b></span></div>
      <div><small>Base de datos</small><b>{status?.persistence.database?'Conectada':'Pendiente'}</b></div>
      <div><small>Fuentes canónicas</small><b>{canonical?.sources?.length??0} registradas</b></div>
      <div><small>Filas publicadas</small><b>{nf.format(canonicalRows)}</b></div>
    </section>

    {error?<div className="system-banner error" role="alert">{error}</div>:null}

    <section className="signal-grid">
      <article className="signal-card"><span><FileSpreadsheet size={16}/>Producción 2026</span><b>{nf.format(Number(production?.received_kg??0))} kg</b><small>{nf.format(Number(production?.rows??0))} filas · guía {nf.format(Number(production?.guide_kg??0))} kg</small></article>
      <article className="signal-card"><span><Database size={16}/>Packing</span><b>{nf.format(packingKg)} kg</b><small>{nf.format((canonical?.datasets?.packing??[]).reduce((s,r)=>s+Number(r.rows??0),0))} cajas publicadas</small></article>
      <article className="signal-card"><span><CheckCircle2 size={16}/>Transferencias</span><b>{clp.format(Number(transfers?.amount_clp??0))}</b><small>{nf.format(Number(transfers?.rows??0))} movimientos recibidos</small></article>
      <article className="signal-card"><span><AlertTriangle size={16}/>Revisión</span><b>{nf.format(flaggedRows)}</b><small>filas con flags de linaje, fórmula o calidad</small></article>
    </section>

    <section className="panel import-history">
      <header className="panel-header"><div><span className="overline teal">Conexiones canónicas</span><h2>Qué alimenta cada módulo</h2></div><span>{connections?.governance?.writesLive===false?'Lectura segura':'Verificando'}</span></header>
      {connections?.error?<div className="system-banner error"><AlertTriangle size={16}/>{connections.error}</div>:connectionRows.length?<div className="detail-alerts">{connectionRows.map(row=><div key={row.key}>
        <Database size={17}/><span><b>{row.title}</b><small>{row.detail} · destino: {row.target??'—'}</small></span><em>{row.status}</em>
      </div>)}</div>:<div className="empty-inline"><div><b>Calculando conexiones</b><small>Se están contrastando identidades, lotes y coincidencias canónicas.</small></div></div>}
      {productionReview>0?<div className="governance-note"><AlertTriangle size={19}/><div><b>Por qué producción requiere revisión</b><p>{nf.format(Number(connections?.connections?.production?.production_before_process??0))} producción antes de proceso · {nf.format(Number(connections?.connections?.production?.date_sequence_inconsistent??0))} secuencia de fechas inconsistente · {nf.format(Number(connections?.connections?.production?.missing_process_date??0))} sin fecha de proceso · {nf.format(Number(connections?.connections?.production?.missing_reception_date??0))} sin fecha de recepción · {nf.format(Number(connections?.connections?.production?.missing_received_kg??0))} sin kg recibido · {nf.format(Number(connections?.connections?.production?.process_before_reception??0))} proceso antes de recepción · {nf.format(Number(connections?.connections?.production?.production_before_reception??0))} producción antes de recepción · {nf.format(Number(connections?.connections?.production?.yield_formula_error??0))} fórmula de rendimiento.</p><p>Los flags pueden coexistir: las {nf.format(Number(connections?.connections?.production?.flagged??0))} filas con flags son filas únicas. Otras {nf.format(Number(connections?.connections?.production?.non_unique_context_rows??0))} filas comparten {nf.format(Number(connections?.connections?.production?.non_unique_contexts??0))} contextos base no únicos; no se consideran copias idénticas ni se deduplican automáticamente.</p></div></div>:null}
      <div className="governance-note"><ShieldCheck size={19}/><div><b>Sin promoción implícita</b><p>{connections?.governance?.rule??'Las conexiones exactas se muestran como evidencia. Las filas ambiguas o con flags permanecen en staging hasta revisión.'}</p></div></div>
    </section>

    <section className="panel import-history">
      <header className="panel-header"><div><span className="overline">Fuentes canónicas</span><h2>Publicar evidencia 2026</h2></div><span>{canonicalRows?`${nf.format(canonicalRows)} filas staging`:'Pendiente de publicación'}</span></header>
      <div className="import-layout canonical-upload-layout">
        <article className="import-upload">
          <input ref={canonicalInput} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onChange={event=>{const file=event.target.files?.[0];if(file)void uploadCanonical(file)}}/>
          <button className="file-drop" disabled={canonicalBusy} onClick={()=>canonicalInput.current?.click()}><Upload size={28}/><b>{canonicalBusy?'Validando y publicando…':'Seleccionar XLSX canónico'}</b><small>Se acepta sólo uno de los tres archivos aprobados y el SHA-256 debe coincidir exactamente</small></button>
          {canonicalResult?<div className={`system-banner ${canonicalResult.ok?'':'error'}`}>{canonicalResult.ok?<><CheckCircle2 size={16}/><span><b>{canonicalResult.fileName}</b> publicado · {Object.entries(canonicalResult.result??{}).map(([key,value])=>`${key}: ${value}`).join(' · ')}</span></>:<><AlertTriangle size={16}/>{canonicalResult.error}</>}</div>:null}
        </article>
        <aside className="import-assignment">
          <div className="governance-note"><ShieldCheck size={19}/><div><b>Promoción bloqueada</b><p>Esta acción sólo publica staging canónico. No crea recepciones, movimientos de inventario, ventas, liquidaciones ni pagos.</p></div></div>
          <div className="import-contract"><Database/><div><b>Hash + hoja + fila</b><p>La evidencia es idempotente y conserva el valor original en cada registro para auditoría posterior.</p></div></div>
        </aside>
      </div>
      <div className="detail-alerts">{(canonical?.sources??[]).map(source=><div key={source.file_hash}>
        <FileSpreadsheet size={17}/><span><b>{source.file_name}</b><small>{source.source_kind} · {Number(source.record_count)} filas declaradas · hash {source.file_hash.slice(0,10)}…</small></span><em>{datasetPublished(source.file_name,canonical)?'CANON':'REGISTRADO'}</em>
      </div>)}</div>
      {ledger?<div className="governance-note"><ShieldCheck size={19}/><div><b>Cuenta corriente preservada como staging</b><p>Entradas {clp.format(Number(ledger.inflow_clp??0))} · salidas {clp.format(Number(ledger.outflow_clp??0))} · saldo recalculado {clp.format(Number(ledger.final_balance_clp??0))}. No se interpreta aún como caja, deuda o saldo bancario.</p></div></div>:null}
    </section>

    <section className="import-layout">
      <article className="panel import-upload">
        <div className="import-step"><span>01</span><div><h2>Snapshot operacional</h2><p>Este flujo permanece separado para planillas de estado por planta. Valida estructura y publica el estado compartido actual.</p></div></div>
        <button className="file-drop" onClick={()=>setOpen(true)}><Upload size={28}/><b>Seleccionar planilla operacional</b><small>La vista previa valida la estructura antes de publicar</small></button>
        <div className="governance-note"><ShieldCheck size={19}/><div><b>Canonical Intake separado</b><p>Los tres libros 2026 usan hash, hoja y fila como linaje. Su publicación ocurre primero en staging y nunca crea recepciones, ventas, inventario o liquidaciones por inferencia.</p></div></div>
      </article>

      <aside className="panel import-assignment">
        <div className="import-step"><span>02</span><div><h2>Publicación compartida</h2><p>Los snapshots de planta continúan guardándose en Neon con trazabilidad y reversión administrativa.</p></div></div>
        <div className="import-contract"><Database/><div><b>{plants.filter(plant=>plant.sourceStatus==='linked').length} de {configuredPlants.length} plantas con fuente</b><p>La publicación conserva el lote anterior para trazabilidad y reversión administrativa.</p></div></div>
        <div className="import-contract"><CheckCircle2/><div><b>Idempotencia canónica</b><p>Los libros canónicos se deduplican por hash + hoja + fila; volver a publicar el mismo origen actualiza la misma evidencia.</p></div></div>
      </aside>
    </section>

    <section className="panel import-history">
      <header className="panel-header"><div><span className="overline">Trazabilidad operacional</span><h2>Historial de importaciones</h2></div><span>{loading?'Sincronizando…':`${history.length} lotes`}</span></header>
      {history.length?<div className="detail-alerts">{history.map(batch=><div key={batch.id}>
        <FileSpreadsheet size={17}/><span><b>{batch.fileName}</b><small>{batch.rowCount} filas · {batch.plantIds.join(', ')} · {new Date(batch.publishedAt).toLocaleString('es-CL')}</small></span><em>{batch.revertedAt?'Revertido':batch.id===latestActive?.id?'Activo':'Histórico'}</em>
        {batch.id===latestActive?.id&&!batch.revertedAt?<button className="button secondary" disabled={Boolean(reverting)} onClick={()=>void revert(batch.id)}><RotateCcw size={14}/>{reverting===batch.id?'Revirtiendo…':'Revertir'}</button>:null}
      </div>)}</div>:<div className="empty-state"><History size={30}/><h3>Aún no hay snapshots operacionales publicados</h3><p>El registro canónico 2026 se mantiene separado de estos snapshots para no mezclar evidencia histórica con estado live.</p></div>}
    </section>

    <PlantImportModal open={open} plants={configuredPlants} onClose={()=>setOpen(false)} onPublish={publish}/>
  </>
}

function datasetPublished(fileName:string,status:CanonicalStatus|null){if(fileName==='planilla de produccion 2026.xlsx')return Number(status?.datasets?.production?.[0]?.rows??0)>0;if(fileName==='CUENTA2.xlsx')return Number(status?.datasets?.ledger?.[0]?.rows??0)>0||Number(status?.datasets?.stock?.[0]?.rows??0)>0;if(fileName==='packing pulpo pescamar 2026-2.xlsx')return (status?.datasets?.packing??[]).some(row=>Number(row.rows??0)>0);return false}

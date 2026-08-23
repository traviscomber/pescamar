import { CheckCircle2, Database, FileSpreadsheet, History, RotateCcw, ShieldCheck, Upload } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { PlantImportModal } from '../components/PlantImportModal'
import { PageHeader } from '../components/PageHeader'
import { usePlatformStatus } from '../hooks/usePlatformStatus'
import { fetchSharedPlantState, publishSharedPlantState, revertSharedPlantState } from '../plantApi'
import { createImportBatch, type ImportBatch, type PlantState, type ValidatedImport } from '../plantImport'
import { plants as configuredPlants } from '../plants'

export function Imports(){
  const [plants,setPlants]=useState<PlantState[]>(configuredPlants)
  const [history,setHistory]=useState<ImportBatch[]>([])
  const [open,setOpen]=useState(false)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [reverting,setReverting]=useState('')
  const {status,error:statusError}=usePlatformStatus()

  const load=async()=>{
    setLoading(true)
    try{
      const state=await fetchSharedPlantState()
      setPlants(state.plants?.length?state.plants:configuredPlants)
      setHistory(state.history??[])
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

  const latestActive=useMemo(()=>history.find(batch=>!batch.revertedAt),[history])
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
      description="Carga una planilla operacional, valida todas sus filas y publícala como una actualización compartida de las plantas. Ningún dato se modifica antes de confirmar la publicación."
      actions={<button className="button primary" onClick={()=>setOpen(true)}><Upload size={16}/>Importar XLSX o CSV</button>}
    />

    <section className="platform-strip">
      <div><span className={`platform-dot ${status?.ok?'online':'pending'}`}/><span><small>Vercel Functions</small><b>{status?.ok?'Conectado':statusError?'No disponible':'Comprobando…'}</b></span></div>
      <div><small>Base de datos</small><b>{status?.persistence.database?'Conectada':'Pendiente'}</b></div>
      <div><small>Persistencia</small><b>{status?.persistence.files?'Neon activo':'Pendiente'}</b></div>
      <div><small>Entorno</small><b>{status?.environment??'—'}</b></div>
    </section>

    {error?<div className="system-banner error" role="alert">{error}</div>:null}

    <section className="import-layout">
      <article className="panel import-upload">
        <div className="import-step"><span>01</span><div><h2>Seleccionar y validar</h2><p>Formatos admitidos: Excel `.xlsx` y CSV. Máximo 15 MB, 10.000 filas y 200 columnas. Se procesa la primera hoja.</p></div></div>
        <button className="file-drop" onClick={()=>setOpen(true)}>
          <Upload size={28}/><b>Seleccionar planilla real</b><small>La vista previa valida la estructura antes de publicar</small>
        </button>
        <div className="governance-note"><ShieldCheck size={19}/><div><b>Validación previa obligatoria</b><p>No se publica si existe una fila inválida, una planta no reconocida, números negativos, una meta en cero o una fecha incorrecta.</p></div></div>
      </article>

      <aside className="panel import-assignment">
        <div className="import-step"><span>02</span><div><h2>Publicación compartida</h2><p>Al confirmar, el snapshot se guarda en Neon y queda disponible para todos los usuarios con acceso a esas plantas.</p></div></div>
        <div className="import-contract"><Database/><div><b>{plants.filter(plant=>plant.sourceStatus==='linked').length} de {configuredPlants.length} plantas con fuente</b><p>La publicación conserva el lote anterior para trazabilidad y reversión administrativa.</p></div></div>
        <div className="import-contract"><CheckCircle2/><div><b>Deduplicación por planta</b><p>Una misma planta no puede aparecer más de una vez dentro del mismo archivo.</p></div></div>
      </aside>
    </section>

    <section className="panel import-history">
      <header className="panel-header"><div><span className="overline">Trazabilidad</span><h2>Historial de importaciones</h2></div><span>{loading?'Sincronizando…':`${history.length} lotes`}</span></header>
      {history.length?<div className="detail-alerts">{history.map(batch=><div key={batch.id}>
        <FileSpreadsheet size={17}/>
        <span><b>{batch.fileName}</b><small>{batch.rowCount} filas · {batch.plantIds.join(', ')} · {new Date(batch.publishedAt).toLocaleString('es-CL')}</small></span>
        <em>{batch.revertedAt?'Revertido':batch.id===latestActive?.id?'Activo':'Histórico'}</em>
        {batch.id===latestActive?.id&&!batch.revertedAt?<button className="button secondary" disabled={Boolean(reverting)} onClick={()=>void revert(batch.id)}><RotateCcw size={14}/>{reverting===batch.id?'Revirtiendo…':'Revertir'}</button>:null}
      </div>)}</div>:<div className="empty-state"><History size={30}/><h3>Aún no hay importaciones publicadas</h3><p>La primera planilla validada creará el estado operacional compartido y su lote de trazabilidad.</p></div>}
    </section>

    <PlantImportModal open={open} plants={configuredPlants} onClose={()=>setOpen(false)} onPublish={publish}/>
  </>
}

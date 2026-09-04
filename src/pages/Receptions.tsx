import {ChevronRight,Search} from 'lucide-react'
import {useDeferredValue,useEffect,useMemo,useState} from 'react'
import {Link,useSearchParams} from 'react-router-dom'
import {canCreateReception} from '../access'
import {useAuth} from '../auth'
import {DataContinuityBanner} from '../components/DataContinuityBanner'
import {useLot360} from '../components/Lot360Context'
import {LotTable} from '../components/LotTable'
import {PageHeader} from '../components/PageHeader'
import type {Lot} from '../types'

const kg=(value:string|number|null|undefined)=>value==null?'—':`${Number(value).toLocaleString('es-CL',{maximumFractionDigits:1})} kg`
const date=(value:string|null)=>value?new Intl.DateTimeFormat('es-CL',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value)):'Sin fecha'

export function Receptions({lots,onNew}:{lots:Lot[];onNew:()=>void}){
  const {operator}=useAuth()
  const {records:history,summary,error:historyError,openRecord,openLive}=useLot360()
  const [params]=useSearchParams()
  const requestedReceptionId=params.get('receptionId')
  const requestedPlantId=params.get('plantId')??''
  const [query,setQuery]=useState('')
  const deferred=useDeferredValue(query.toLowerCase())
  const scopedLots=requestedPlantId?lots.filter(l=>l.plantId===requestedPlantId):lots
  const filtered=scopedLots.filter(l=>`${l.id} ${l.supplier} ${l.zone}`.toLowerCase().includes(deferred))
  const historicalFiltered=useMemo(()=>history.filter(item=>`${item.lot_code} ${item.supplier_name??item.supplier_original??''} ${item.guide_number??''} ${item.extraction_zone??''} ${item.process_site_original??''} ${item.source_file}`.toLowerCase().includes(deferred)),[history,deferred])
  const mayCreate=operator?canCreateReception(operator.role):false
  const historyCount=Number(summary?.total??history.length)
  useEffect(()=>{if(requestedReceptionId&&lots.some(l=>l.receptionId===requestedReceptionId))openLive(requestedReceptionId)},[requestedReceptionId,lots,openLive])

  return <>
    <PageHeader eyebrow="Operación" title="Recepciones" description="Qué está entrando ahora. El histórico y la evidencia quedan disponibles cuando los necesitas." actions={<>{requestedPlantId?<Link className="button secondary" to={`/plantas/${encodeURIComponent(requestedPlantId)}`}>Volver a planta</Link>:null}{mayCreate?<button className="button primary" onClick={onNew}>+ Nueva recepción</button>:null}</>}/>

    <section className="panel list-panel receptions-workspace" aria-label="Recepciones activas">
      {scopedLots.length?<>
        <div className="panel-header"><div><span className="overline teal">Ahora</span><h2>{filtered.length} recepción{filtered.length===1?'':'es'} activa{filtered.length===1?'':'s'}</h2><p>Abre un lote para continuar su flujo operacional.</p></div></div>
        <div className="toolbar"><div className="search-box"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar lote o proveedor…" aria-label="Buscar recepciones"/></div></div>
        <LotTable lots={filtered} onOpen={lot=>{if(lot.receptionId)openLive(lot.receptionId)}}/>
      </>:<div className="empty-inline"><div><span className="overline teal">Ahora</span><b>{requestedPlantId?'Sin recepciones activas en esta planta':'Sin recepciones activas'}</b><small>{mayCreate?'Registra la siguiente entrada cuando llegue materia prima.':'No hay una acción pendiente en este momento.'}</small>{mayCreate?<button className="button primary" onClick={onNew}>Nueva recepción</button>:null}</div></div>}
    </section>

    <details className="panel list-panel receptions-history">
      <summary><span><b>Histórico canónico</b><small>{historyCount.toLocaleString('es-CL')} registros disponibles · solo lectura</small></span><span>Ver histórico</span></summary>
      <div className="receptions-history-body">
        <DataContinuityBanner compact/>
        <section className="summary-strip reception-context" aria-label="Base histórica Pescamar">
          <div><small>Registros</small><b>{historyCount.toLocaleString('es-CL')}</b></div>
          <div><small>Kg guía</small><b>{kg(summary?.guide_kg)}</b></div>
          <div><small>Kg recibidos</small><b>{kg(summary?.received_kg)}</b></div>
          <div><small>Con observaciones</small><b>{Number(summary?.flagged??0).toLocaleString('es-CL')}</b></div>
        </section>
        {historyError?<div className="notice error" role="alert">{historyError}</div>:null}
        <div className="toolbar"><div className="search-box"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar lote, proveedor, guía, zona o archivo…" aria-label="Buscar histórico canónico"/></div></div>
        {requestedPlantId?<p className="data-caveat">La historia no se filtra por esta planta hasta confirmar equivalencias 1:1 entre sitios históricos y plantas operacionales.</p>:null}
        <div className="table-scroll"><table className="data-table canonical-receptions"><thead><tr><th>Fecha</th><th>Lote</th><th>Proveedor</th><th>Guía</th><th className="numeric">Kg recibidos</th><th>Fuente</th><th></th></tr></thead><tbody>{historicalFiltered.map(item=>{const flags=item.data_quality_flags?.length??0;return <tr key={item.id} className={item.record_status==='void'?'muted':''}><td>{date(item.event_date)}</td><td><button className="lot-link" onClick={()=>openRecord(item)}>{item.lot_code}</button></td><td>{item.supplier_name??item.supplier_original??'—'}</td><td>{item.guide_number??'—'}</td><td className="numeric">{kg(item.received_kg)}</td><td>{item.record_status==='void'?<span className="status-pill pending">Anulado</span>:flags?<span className="status-pill pending">{flags} obs.</span>:<span className="status-pill active">Canónico</span>}</td><td><button className="icon-button" onClick={()=>openRecord(item)} aria-label={`Abrir ficha ${item.lot_code}`}><ChevronRight size={17}/></button></td></tr>})}</tbody></table></div>
      </div>
    </details>
  </>
}

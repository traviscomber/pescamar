import {ChevronRight,Search} from 'lucide-react'
import {useDeferredValue,useMemo,useState} from 'react'
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
  const [query,setQuery]=useState('')
  const deferred=useDeferredValue(query.toLowerCase())
  const filtered=lots.filter(l=>`${l.id} ${l.supplier} ${l.zone}`.toLowerCase().includes(deferred))
  const historicalFiltered=useMemo(()=>history.filter(item=>`${item.lot_code} ${item.supplier_name??item.supplier_original??''} ${item.guide_number??''} ${item.extraction_zone??''} ${item.process_site_original??''}`.toLowerCase().includes(deferred)),[history,deferred])
  const mayCreate=operator?canCreateReception(operator.role):false

  return <>
    <PageHeader eyebrow="Recepciones" title="Recepciones" description="La operación nueva continúa sobre la base canónica 2025. Abre cualquier lote para ver el detalle completo en su Ficha 360." actions={mayCreate?<button className="button primary" onClick={onNew}>+ Nueva recepción</button>:undefined}/>
    <DataContinuityBanner compact/>
    <section className="summary-strip reception-context" aria-label="Contexto canónico 2025">
      <div><small>Base 2025</small><b>{Number(summary?.total??0).toLocaleString('es-CL')} lotes</b></div>
      <div><small>Kg guía</small><b>{kg(summary?.guide_kg)}</b></div>
      <div><small>Kg recibidos</small><b>{kg(summary?.received_kg)}</b></div>
      <div><small>Observaciones de fuente</small><b>{Number(summary?.flagged??0).toLocaleString('es-CL')}</b></div>
    </section>
    {historyError?<div className="notice error" role="alert">{historyError}</div>:null}
    <section className="panel list-panel receptions-workspace">
      <div className="toolbar"><div className="search-box"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar lote, proveedor, guía o zona…" aria-label="Buscar recepciones"/></div></div>
      {lots.length?<><div className="panel-header"><div><span className="overline teal">Operación viva</span><h2>Recepciones activas</h2></div><span>{filtered.length} registros</span></div><LotTable lots={filtered} onOpen={lot=>{if(lot.receptionId)openLive(lot.receptionId)}}/></>:<div className="empty-inline"><div><b>Aún no existen recepciones vivas</b><small>La primera recepción nueva aparecerá aquí y continuará automáticamente hacia Calidad y Producción.</small></div></div>}
      <div className="panel-header canonical-table-heading"><div><span className="overline">Base canónica</span><h2>Recepciones 2025</h2></div><span>{historicalFiltered.length} de {Number(summary?.total??history.length)}</span></div>
      <div className="table-scroll"><table className="data-table canonical-receptions"><thead><tr><th>Fecha</th><th>Lote</th><th>Proveedor</th><th>Guía</th><th className="numeric">Kg recibidos</th><th>Fuente</th><th></th></tr></thead><tbody>{historicalFiltered.map(item=>{const flags=item.data_quality_flags?.length??0;return <tr key={item.source_row} className={item.record_status==='void'?'muted':''}><td>{date(item.event_date)}</td><td><button className="lot-link" onClick={()=>openRecord(item)}>{item.lot_code}</button></td><td>{item.supplier_name??item.supplier_original??'—'}</td><td>{item.guide_number??'—'}</td><td className="numeric">{kg(item.received_kg)}</td><td>{item.record_status==='void'?<span className="status-pill pending">Anulado</span>:flags?<span className="status-pill pending">{flags} obs.</span>:<span className="status-pill active">Canónico</span>}</td><td><button className="icon-button" onClick={()=>openRecord(item)} aria-label={`Abrir ficha ${item.lot_code}`}><ChevronRight size={17}/></button></td></tr>})}</tbody></table></div>
    </section>
  </>
}

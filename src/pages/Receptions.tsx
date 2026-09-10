import {ChevronRight,Search} from 'lucide-react'
import {useDeferredValue,useEffect,useMemo,useState} from 'react'
import {Link,useNavigate,useSearchParams} from 'react-router-dom'
import {canCreateReception} from '../access'
import {useAuth} from '../auth'
import {ContextualGuidance} from '../components/ContextualGuidance'
import {DataContinuityBanner} from '../components/DataContinuityBanner'
import {useLot360} from '../components/Lot360Context'
import {LotTable} from '../components/LotTable'
import {PageHeader} from '../components/PageHeader'
import {localeTag,useLocale} from '../i18n'
import type {Lot} from '../types'

const kg=(value:string|number|null|undefined,locale:string)=>value==null?'—':`${Number(value).toLocaleString(locale,{maximumFractionDigits:1})} kg`
const date=(value:string|null,locale:string,missing:string)=>value?new Intl.DateTimeFormat(locale,{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value)):missing

export function Receptions({lots,onNew}:{lots:Lot[];onNew:()=>void}){
  const {operator}=useAuth()
  const {locale}=useLocale()
  const isEs=locale==='es'
  const formatLocale=localeTag(locale)
  const c=isEs?{
    eyebrow:'Operación',title:'Recepciones',description:'Materia prima recibida hoy y registros históricos cuando los necesites.',backPlant:'Volver a planta',newReception:'+ Nueva recepción',
    noActive:'Sin recepciones activas',activeSingular:'recepción activa',activePlural:'recepciones activas',openLot:'Abre el lote que vas a revisar',registerNext:'Registra la próxima entrada',noAction:'No hay una acción pendiente ahora',
    reason:'La recepción crea el punto de partida del lote. Desde aquí se conserva su identidad, peso y evidencia hacia producción, calidad e inventario.',assistant:'Consultar recepciones',now:'Ahora',
    activeDescription:'Abre un lote para revisar estado, siguiente acción, kilos y documentos asociados.',search:'Buscar lote o proveedor…',searchAria:'Buscar recepciones',noPlant:'Sin recepciones activas en esta planta',emptyCreate:'Registra la siguiente entrada cuando llegue materia prima.',emptyNoAction:'No hay una acción pendiente en este momento.',
    history:'Historial de recepciones',recordsAvailable:'registros disponibles · solo consulta',viewHistory:'Ver historial',records:'Registros',guideKg:'Kg guía',receivedKg:'Kg recibidos',withObs:'Con observaciones',historySearch:'Buscar lote, proveedor, guía, zona o archivo…',historySearchAria:'Buscar historial',historyPlantCaveat:'El historial aún no se filtra por esta planta hasta confirmar qué nombres históricos corresponden a cada planta actual.',
    historyAria:'Historial de Pescamar',missingDate:'Sin fecha',date:'Fecha',lot:'Lote',supplier:'Proveedor',guide:'Guía',status:'Estado',action:'Acción',void:'Anulado',reviewed:'Revisado',openCard:'Abrir ficha'
  }:{
    eyebrow:'Operations',title:'Receptions',description:'Raw material received today, with historical records available when needed.',backPlant:'Back to plant',newReception:'+ New reception',
    noActive:'No active receptions',activeSingular:'active reception',activePlural:'active receptions',openLot:'Open the lot you need to review',registerNext:'Record the next incoming delivery',noAction:'No action is pending now',
    reason:'Reception creates the starting point for the lot. From here, identity, weight and evidence are preserved through production, quality and inventory.',assistant:'Review receptions',now:'Now',
    activeDescription:'Open a lot to review status, next action, kilograms and linked documents.',search:'Search lot or supplier…',searchAria:'Search receptions',noPlant:'No active receptions at this plant',emptyCreate:'Record the next incoming delivery when raw material arrives.',emptyNoAction:'There is no pending action at this time.',
    history:'Reception history',recordsAvailable:'records available · read only',viewHistory:'View history',records:'Records',guideKg:'Guide kg',receivedKg:'Received kg',withObs:'With observations',historySearch:'Search lot, supplier, guide, zone or file…',historySearchAria:'Search history',historyPlantCaveat:'Historical records are not filtered by this plant until historical plant names are confirmed against current plants.',
    historyAria:'Pescamar history',missingDate:'No date',date:'Date',lot:'Lot',supplier:'Supplier',guide:'Guide',status:'Status',action:'Action',void:'Voided',reviewed:'Reviewed',openCard:'Open record'
  }
  const {records:history,summary,error:historyError,openRecord,openLive}=useLot360()
  const navigate=useNavigate()
  const [params]=useSearchParams()
  const requestedReceptionId=params.get('receptionId')
  const requestedAction=params.get('action')==='1'
  const requestedPlantId=params.get('plantId')??''
  const [query,setQuery]=useState('')
  const deferred=useDeferredValue(query.toLowerCase())
  const scopedLots=requestedPlantId?lots.filter(l=>l.plantId===requestedPlantId):lots
  const filtered=scopedLots.filter(l=>`${l.id} ${l.supplier} ${l.zone}`.toLowerCase().includes(deferred))
  const historicalFiltered=useMemo(()=>history.filter(item=>`${item.lot_code} ${item.supplier_name??item.supplier_original??''} ${item.guide_number??''} ${item.extraction_zone??''} ${item.process_site_original??''} ${item.source_file}`.toLowerCase().includes(deferred)),[history,deferred])
  const mayCreate=operator?canCreateReception(operator.role):false
  const historyCount=Number(summary?.total??history.length)
  const activeLabel=scopedLots.length?`${scopedLots.length} ${scopedLots.length===1?c.activeSingular:c.activePlural}`:c.noActive
  const guidanceAction=scopedLots.length?c.openLot:mayCreate?c.registerNext:c.noAction
  useEffect(()=>{if(!requestedReceptionId||!lots.some(l=>l.receptionId===requestedReceptionId))return;if(requestedAction){openLive(requestedReceptionId);return}navigate(`/lotes/${encodeURIComponent(requestedReceptionId)}`,{replace:true})},[requestedReceptionId,requestedAction,lots,navigate,openLive])

  return <>
    <PageHeader eyebrow={c.eyebrow} title={c.title} description={c.description} actions={<>{requestedPlantId?<Link className="button secondary" to={`/plantas/${encodeURIComponent(requestedPlantId)}`}>{c.backPlant}</Link>:null}{mayCreate?<button className="button primary" onClick={onNew}>{c.newReception}</button>:null}</>}/>
    <ContextualGuidance state={activeLabel} action={guidanceAction} reason={c.reason} assistantLabel={c.assistant}/>

    <section className="panel list-panel receptions-workspace" aria-label={c.activePlural}>
      {scopedLots.length?<>
        <div className="panel-header"><div><span className="overline teal">{c.now}</span><h2>{filtered.length} {filtered.length===1?c.activeSingular:c.activePlural}</h2><p>{c.activeDescription}</p></div></div>
        <div className="toolbar"><div className="search-box"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={c.search} aria-label={c.searchAria}/></div></div>
        <LotTable lots={filtered} onOpen={lot=>{if(lot.receptionId)navigate(`/lotes/${encodeURIComponent(lot.receptionId)}`)}}/>
      </>:<div className="empty-inline"><div><span className="overline teal">{c.now}</span><b>{requestedPlantId?c.noPlant:c.noActive}</b><small>{mayCreate?c.emptyCreate:c.emptyNoAction}</small></div></div>}
    </section>

    <details className="panel list-panel receptions-history">
      <summary><span><b>{c.history}</b><small>{historyCount.toLocaleString(formatLocale)} {c.recordsAvailable}</small></span><span>{c.viewHistory}</span></summary>
      <div className="receptions-history-body">
        <DataContinuityBanner compact/>
        <section className="summary-strip reception-context" aria-label={c.historyAria}>
          <div><small>{c.records}</small><b>{historyCount.toLocaleString(formatLocale)}</b></div>
          <div><small>{c.guideKg}</small><b>{kg(summary?.guide_kg,formatLocale)}</b></div>
          <div><small>{c.receivedKg}</small><b>{kg(summary?.received_kg,formatLocale)}</b></div>
          <div><small>{c.withObs}</small><b>{Number(summary?.flagged??0).toLocaleString(formatLocale)}</b></div>
        </section>
        {historyError?<div className="notice error" role="alert">{historyError}</div>:null}
        <div className="toolbar"><div className="search-box"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={c.historySearch} aria-label={c.historySearchAria}/></div></div>
        {requestedPlantId?<p className="data-caveat">{c.historyPlantCaveat}</p>:null}
        <div className="table-scroll mobile-card-scroll"><table className="data-table canonical-receptions mobile-card-table"><thead><tr><th>{c.date}</th><th>{c.lot}</th><th>{c.supplier}</th><th>{c.guide}</th><th className="numeric">{c.receivedKg}</th><th>{c.status}</th><th></th></tr></thead><tbody>{historicalFiltered.map(item=>{const flags=item.data_quality_flags?.length??0;return <tr key={item.id} className={item.record_status==='void'?'muted':''}><td data-label={c.date}>{date(item.event_date,formatLocale,c.missingDate)}</td><td data-label={c.lot}><button className="lot-link" onClick={()=>openRecord(item)}>{item.lot_code}</button></td><td data-label={c.supplier}>{item.supplier_name??item.supplier_original??'—'}</td><td data-label={c.guide}>{item.guide_number??'—'}</td><td data-label={c.receivedKg} className="numeric">{kg(item.received_kg,formatLocale)}</td><td data-label={c.status}>{item.record_status==='void'?<span className="status-pill pending">{c.void}</span>:flags?<span className="status-pill pending">{flags} {isEs?'obs.':'obs.'}</span>:<span className="status-pill active">{c.reviewed}</span>}</td><td data-label={c.action}><button className="icon-button" onClick={()=>openRecord(item)} aria-label={`${c.openCard} ${item.lot_code}`}><ChevronRight size={17}/></button></td></tr>})}</tbody></table></div>
      </div>
    </details>
  </>
}
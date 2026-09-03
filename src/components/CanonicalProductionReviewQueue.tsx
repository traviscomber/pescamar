import {AlertTriangle, FileSpreadsheet, ShieldCheck} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'

type ReviewFocus='process_date_review'|'reception_date_review'|'production_date_review'|'source_completion'|'formula_review'|'context_review'|'chronology_review'|'manual_review'
type ReviewTriage={focus:ReviewFocus;lotDate:string|null;lotDateMatches:Array<'reception'|'process'|'production'>;referenceOnly:boolean}
type ReviewRow={source_file_hash:string;source_file:string;source_row:number;event_date:string|null;supplier_name:string|null;lot_code:string|null;guide_number:string|null;guide_kg:number|string|null;received_kg:number|string|null;reception_date:string|null;process_date:string|null;production_date:string|null;data_quality_flags:string[];context_rows:number;review_reasons:string[];triage:ReviewTriage}
type ReviewSourceSummary={source_file:string;rows:number;flagged_rows:number;non_unique_context_rows:number}
type LotEvidence={parseableRows:number;processMatches:number;productionMatches:number;receptionMatches:number;processMatchRate:number;flaggedWithLotDate:number;flaggedProcessConflicts:number}
type ReviewPayload={ok?:boolean;rows?:ReviewRow[];summary?:{rows:number;flaggedRows:number;nonUniqueContextRows:number;nonUniqueContexts:number;firstDate:string|null;lastDate:string|null;bySource:ReviewSourceSummary[];lotEvidence:LotEvidence;focusCounts:Record<string,number>};governance?:{mode:string;writesHistorical:boolean;writesLive:boolean;derivedLotDate?:string;rule:string};error?:string}

const nf=new Intl.NumberFormat('es-CL',{maximumFractionDigits:1})
const pf=new Intl.NumberFormat('es-CL',{style:'percent',maximumFractionDigits:1})
const df=new Intl.DateTimeFormat('es-CL',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'})
const reasonLabels:Record<string,string>={
  production_before_process:'producción antes de proceso',
  date_sequence_inconsistent:'secuencia de fechas inconsistente',
  missing_process_date:'sin fecha de proceso',
  missing_reception_date:'sin fecha de recepción',
  missing_received_kg:'sin kg recibido',
  process_before_reception:'proceso antes de recepción',
  production_before_reception:'producción antes de recepción',
  yield_formula_error:'fórmula de rendimiento',
  non_unique_context:'contexto base no único'
}
const focusLabels:Record<ReviewFocus,string>={
  process_date_review:'revisar fecha de proceso',
  reception_date_review:'revisar fecha de recepción',
  production_date_review:'revisar fecha de producción',
  source_completion:'completar dato desde fuente',
  formula_review:'revisar fórmula',
  context_review:'comparar contexto',
  chronology_review:'revisar secuencia',
  manual_review:'revisión manual'
}
const focusOrder:ReviewFocus[]=['process_date_review','source_completion','chronology_review','context_review','reception_date_review','production_date_review','formula_review','manual_review']
const fieldLabels={reception:'recepción',process:'proceso',production:'producción'} as const

export function CanonicalProductionReviewQueue(){
  const [payload,setPayload]=useState<ReviewPayload|null>(null)
  const [error,setError]=useState('')
  const [focusFilter,setFocusFilter]=useState<ReviewFocus|'all'>('all')
  useEffect(()=>{
    let active=true
    void fetch('/api/canonical-production-review',{cache:'no-store'}).then(async response=>{
      const body=await response.json() as ReviewPayload
      if(!active)return
      if(!response.ok)throw new Error(body.error??'No fue posible cargar la cola de revisión')
      setPayload(body);setError('')
    }).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'No fue posible cargar la cola de revisión')})
    return()=>{active=false}
  },[])
  const rows=payload?.rows??[]
  const visibleRows=useMemo(()=>focusFilter==='all'?rows:rows.filter(row=>row.triage.focus===focusFilter),[focusFilter,rows])
  const rowsBySource=useMemo(()=>visibleRows.reduce<Record<string,ReviewRow[]>>((acc,row)=>{(acc[row.source_file]??=[]).push(row);return acc},{}),[visibleRows])
  const sourceNames=useMemo(()=>Object.keys(rowsBySource).sort((a,b)=>b.localeCompare(a)),[rowsBySource])
  const summary=payload?.summary
  const lotEvidence=summary?.lotEvidence
  const availableFocuses=useMemo(()=>focusOrder.filter(focus=>(summary?.focusCounts?.[focus]??0)>0),[summary?.focusCounts])

  return <section className="panel import-history" data-testid="canonical-production-review-queue">
    <header className="panel-header"><div><span className="overline teal">Revisión canónica</span><h2>Cola de producción</h2></div><span>{summary?`${nf.format(summary.rows)} pendientes`:'Cargando…'}</span></header>
    {error?<div className="system-banner error" role="alert"><AlertTriangle size={16}/>{error}</div>:null}
    {summary?<>
      <div className="detail-alerts">
        <div><AlertTriangle size={17}/><span><b>{nf.format(summary.flaggedRows)} filas con flags</b><small>Fechas, fórmula, kilos o secuencias que requieren revisión humana.</small></span><em>REVISAR</em></div>
        <div><FileSpreadsheet size={17}/><span><b>{nf.format(summary.nonUniqueContextRows)} filas en {nf.format(summary.nonUniqueContexts)} contextos no únicos</b><small>Comparten clave base, pero no se asumen copias ni se deduplican automáticamente.</small></span><em>CONTEXTO</em></div>
        {lotEvidence?<div data-testid="lot-date-evidence"><FileSpreadsheet size={17}/><span><b>{nf.format(lotEvidence.parseableRows)} lotes con fecha interpretable</b><small>{nf.format(lotEvidence.processMatches)} coinciden con fecha de proceso ({pf.format(lotEvidence.processMatchRate)}). {nf.format(lotEvidence.flaggedProcessConflicts)} filas con flags muestran conflicto entre fecha de lote y proceso.</small></span><em>EVIDENCIA</em></div>:null}
      </div>
      <div className="governance-note"><ShieldCheck size={19}/><div><b>Evidencia intacta</b><p>{payload?.governance?.rule}</p></div></div>
      <div className="page-actions" role="group" aria-label="Filtrar cola por foco de revisión" style={{justifyContent:'flex-start',marginBottom:16}} data-testid="production-review-focus-filters">
        <button type="button" className={`button ${focusFilter==='all'?'primary':''}`} aria-pressed={focusFilter==='all'} onClick={()=>setFocusFilter('all')}>Todo · {nf.format(summary.rows)}</button>
        {availableFocuses.map(focus=><button key={focus} type="button" className={`button ${focusFilter===focus?'primary':''}`} aria-pressed={focusFilter===focus} onClick={()=>setFocusFilter(focus)}>{focusLabels[focus]} · {nf.format(summary.focusCounts[focus]??0)}</button>)}
      </div>
      <p data-testid="production-review-visible-count"><small>Mostrando {nf.format(visibleRows.length)} de {nf.format(summary.rows)} filas de revisión.</small></p>
      {sourceNames.map(sourceName=>{
        const sourceRows=rowsBySource[sourceName]??[]
        const sourceSummary=summary.bySource.find(item=>item.source_file===sourceName)
        return <details key={sourceName} className="review-queue-source" open={sourceName.includes('2026')}>
          <summary><b>{sourceName}</b> · {nf.format(sourceRows.length)} visibles · {nf.format(sourceSummary?.rows??sourceRows.length)} en cola fuente</summary>
          <div className="detail-alerts">{sourceRows.map(row=><div key={`${row.source_file_hash}:${row.source_row}`} data-testid="canonical-review-row">
            <FileSpreadsheet size={17}/><span><b>Fila {row.source_row} · {formatDate(row.event_date)} · {row.supplier_name??'Proveedor sin nombre'}</b><small>Lote {row.lot_code??'—'} · guía {row.guide_number??'—'} · guía kg {formatNumber(row.guide_kg)} · recibido {formatNumber(row.received_kg)} kg · {row.review_reasons.map(reason=>reasonLabels[reason]??reason).join(' · ')}{triageText(row.triage)} · hash {row.source_file_hash.slice(0,10)}…</small></span><em>{focusLabels[row.triage.focus]}</em>
          </div>)}</div>
        </details>
      })}
      {!visibleRows.length?<div className="empty-inline"><div><b>Sin filas para este foco</b><small>La evidencia permanece intacta; cambia el filtro para continuar la revisión.</small></div></div>:null}
    </>:!error?<div className="empty-inline"><div><b>Cargando evidencia</b><small>Se está preparando la cola sin modificar registros históricos.</small></div></div>:null}
  </section>
}

function triageText(triage:ReviewTriage){
  if(!triage.lotDate)return` · foco: ${focusLabels[triage.focus]}`
  const matches=triage.lotDateMatches.length?`coincide con ${triage.lotDateMatches.map(field=>fieldLabels[field]).join(' / ')}`:'no coincide con las fechas registradas'
  return` · fecha derivada del lote ${formatDate(triage.lotDate)} · ${matches} · foco: ${focusLabels[triage.focus]}`
}
function formatDate(value:string|null){if(!value)return'Fecha no informada';const date=new Date(value);return Number.isNaN(date.getTime())?value:df.format(date)}
function formatNumber(value:number|string|null){if(value===null||value==='')return'—';const parsed=Number(value);return Number.isFinite(parsed)?nf.format(parsed):String(value)}

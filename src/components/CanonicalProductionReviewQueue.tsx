import {AlertTriangle, FileSpreadsheet, ShieldCheck} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'

type ReviewRow={source_file_hash:string;source_file:string;source_row:number;event_date:string|null;supplier_name:string|null;lot_code:string|null;guide_number:string|null;guide_kg:number|string|null;received_kg:number|string|null;reception_date:string|null;process_date:string|null;production_date:string|null;data_quality_flags:string[];context_rows:number;review_reasons:string[]}
type ReviewSourceSummary={source_file:string;rows:number;flagged_rows:number;non_unique_context_rows:number}
type ReviewPayload={ok?:boolean;rows?:ReviewRow[];summary?:{rows:number;flaggedRows:number;nonUniqueContextRows:number;nonUniqueContexts:number;firstDate:string|null;lastDate:string|null;bySource:ReviewSourceSummary[]};governance?:{mode:string;writesHistorical:boolean;writesLive:boolean;rule:string};error?:string}

const nf=new Intl.NumberFormat('es-CL',{maximumFractionDigits:1})
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

export function CanonicalProductionReviewQueue(){
  const [payload,setPayload]=useState<ReviewPayload|null>(null)
  const [error,setError]=useState('')
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
  const rowsBySource=useMemo(()=>rows.reduce<Record<string,ReviewRow[]>>((acc,row)=>{(acc[row.source_file]??=[]).push(row);return acc},{}),[rows])
  const sourceNames=useMemo(()=>Object.keys(rowsBySource).sort((a,b)=>b.localeCompare(a)),[rowsBySource])
  const summary=payload?.summary

  return <section className="panel import-history" data-testid="canonical-production-review-queue">
    <header className="panel-header"><div><span className="overline teal">Revisión canónica</span><h2>Cola de producción</h2></div><span>{summary?`${nf.format(summary.rows)} pendientes`:'Cargando…'}</span></header>
    {error?<div className="system-banner error" role="alert"><AlertTriangle size={16}/>{error}</div>:null}
    {summary?<>
      <div className="detail-alerts">
        <div><AlertTriangle size={17}/><span><b>{nf.format(summary.flaggedRows)} filas con flags</b><small>Fechas, fórmula, kilos o secuencias que requieren revisión humana.</small></span><em>REVISAR</em></div>
        <div><FileSpreadsheet size={17}/><span><b>{nf.format(summary.nonUniqueContextRows)} filas en {nf.format(summary.nonUniqueContexts)} contextos no únicos</b><small>Comparten clave base, pero no se asumen copias ni se deduplican automáticamente.</small></span><em>CONTEXTO</em></div>
      </div>
      <div className="governance-note"><ShieldCheck size={19}/><div><b>Evidencia intacta</b><p>{payload?.governance?.rule}</p></div></div>
      {sourceNames.map(sourceName=>{
        const sourceRows=rowsBySource[sourceName]??[]
        const sourceSummary=summary.bySource.find(item=>item.source_file===sourceName)
        return <details key={sourceName} className="review-queue-source" open={sourceName.includes('2026')}>
          <summary><b>{sourceName}</b> · {nf.format(sourceSummary?.rows??sourceRows.length)} filas · {nf.format(sourceSummary?.flagged_rows??0)} con flags · {nf.format(sourceSummary?.non_unique_context_rows??0)} en contexto no único</summary>
          <div className="detail-alerts">{sourceRows.map(row=><div key={`${row.source_file_hash}:${row.source_row}`} data-testid="canonical-review-row">
            <FileSpreadsheet size={17}/><span><b>Fila {row.source_row} · {formatDate(row.event_date)} · {row.supplier_name??'Proveedor sin nombre'}</b><small>Lote {row.lot_code??'—'} · guía {row.guide_number??'—'} · guía kg {formatNumber(row.guide_kg)} · recibido {formatNumber(row.received_kg)} kg · {row.review_reasons.map(reason=>reasonLabels[reason]??reason).join(' · ')} · hash {row.source_file_hash.slice(0,10)}…</small></span><em>{row.context_rows>1?'CONTEXTO':'FLAG'}</em>
          </div>)}</div>
        </details>
      })}
    </>:!error?<div className="empty-inline"><div><b>Cargando evidencia</b><small>Se está preparando la cola sin modificar registros históricos.</small></div></div>:null}
  </section>
}

function formatDate(value:string|null){if(!value)return'Fecha no informada';const date=new Date(value);return Number.isNaN(date.getTime())?value:df.format(date)}
function formatNumber(value:number|string|null){if(value===null||value==='')return'—';const parsed=Number(value);return Number.isFinite(parsed)?nf.format(parsed):String(value)}

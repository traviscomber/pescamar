import {AlertTriangle,CheckCircle2,Database,FileSpreadsheet,ShieldCheck} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'
import {useAuth} from '../auth'

type Integrity='complete'|'partial'|'over'|'empty'|'reference'
type HealthSource={fileHash:string;fileName:string;sourceKind:string;measurable:boolean;integrity:Integrity;expectedRows:number;observedRows:number|null;flaggedRows:number|null;futureRows:number|null;registeredPeriod:{start:string|null;end:string|null};observedPeriod:{start:string|null;end:string|null};importedAt:string|null;datasets:{name:string;rows:number;flaggedRows:number;futureRows:number;firstDate:string|null;lastDate:string|null}[]}
type LegacyEvidence={fileHash:string;fileName:string|null;rows:number;flaggedRows:number;observedPeriod:{start:string|null;end:string|null};governance:string}
type HealthPayload={ok?:boolean;checkedAt?:string;summary?:{registeredSources:number;measurableSources:number;completeSources:number;incompleteSources:number;qualityReviewSources:number;referenceSources:number;legacyEvidenceSources:number};sources?:HealthSource[];legacyEvidence?:LegacyEvidence[];governance?:{writes:boolean;rule:string};error?:string}

const nf=new Intl.NumberFormat('es-CL')
const df=new Intl.DateTimeFormat('es-CL',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'})
const integrityLabel:Record<Integrity,string>={complete:'COMPLETO',partial:'PARCIAL',over:'EXCESO',empty:'VACÍO',reference:'REFERENCIA'}

function date(value:string|null){if(!value)return'—';const parsed=new Date(value);return Number.isNaN(parsed.getTime())?value:df.format(parsed)}

export function CanonicalSourceHealth(){
  const {operator}=useAuth()
  const allowed=operator?.role==='admin'||operator?.role==='operations'
  const [payload,setPayload]=useState<HealthPayload|null>(null),[error,setError]=useState('')
  useEffect(()=>{
    if(!allowed)return
    let active=true
    void fetch('/api/canonical-source-health',{cache:'no-store'}).then(async response=>{const body=await response.json() as HealthPayload;if(!active)return;if(!response.ok||!body.ok)throw new Error(body.error??'No fue posible cargar salud de fuentes');setPayload(body);setError('')}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'No fue posible cargar salud de fuentes')})
    return()=>{active=false}
  },[allowed])
  const measured=useMemo(()=>payload?.sources?.filter(source=>source.measurable)??[],[payload]),references=useMemo(()=>payload?.sources?.filter(source=>!source.measurable)??[],[payload])
  if(!allowed)return null
  return <section className="panel import-history" data-testid="canonical-source-health">
    <header className="panel-header"><div><span className="overline teal">Integridad canónica</span><h2>Salud de fuentes</h2></div><span>{payload?.summary?`${payload.summary.completeSources}/${payload.summary.measurableSources} completas`:'Verificando…'}</span></header>
    {error?<div className="system-banner error" role="alert"><AlertTriangle size={16}/>{error}</div>:null}
    {payload?.summary?<div className="signal-grid">
      <article className="signal-card"><span><Database size={16}/>Fuentes registradas</span><b>{nf.format(payload.summary.registeredSources)}</b><small>{nf.format(payload.summary.referenceSources)} documentales/referencia</small></article>
      <article className="signal-card"><span><CheckCircle2 size={16}/>Integridad de filas</span><b>{nf.format(payload.summary.completeSources)}/{nf.format(payload.summary.measurableSources)}</b><small>{payload.summary.incompleteSources?'hay diferencias de conteo':'conteos reconciliados'}</small></article>
      <article className="signal-card"><span><AlertTriangle size={16}/>Revisión de calidad</span><b>{nf.format(payload.summary.qualityReviewSources)}</b><small>fuentes con flags o fechas futuras observadas</small></article>
      <article className="signal-card"><span><FileSpreadsheet size={16}/>Linaje legacy</span><b>{nf.format(payload.summary.legacyEvidenceSources)}</b><small>fuentes replay-only fuera del registro actual</small></article>
    </div>:null}
    {measured.length?<div className="detail-alerts">{measured.map(source=>{const quality=(source.flaggedRows??0)>0||(source.futureRows??0)>0;return <div key={source.fileHash}>
      {source.integrity==='complete'?<CheckCircle2 size={17}/>:<AlertTriangle size={17}/>}<span><b>{source.fileName}</b><small>{source.sourceKind} · {nf.format(source.observedRows??0)}/{nf.format(source.expectedRows)} filas · {nf.format(source.flaggedRows??0)} con flags · {nf.format(source.futureRows??0)} futuras · observado {date(source.observedPeriod.start)} → {date(source.observedPeriod.end)}</small></span><em>{source.integrity==='complete'&&quality?'REVISAR':integrityLabel[source.integrity]}</em>
    </div>})}</div>:!error?<div className="empty-inline"><div><b>Calculando integridad</b><small>Se están reconciliando registros de autoridad con staging canónico.</small></div></div>:null}
    {references.length?<div className="governance-note"><FileSpreadsheet size={19}/><div><b>{references.length} fuentes de referencia</b><p>{references.map(source=>source.fileName).join(' · ')}. No se declaran incompletas porque su contrato no exige filas en los datasets medidos.</p></div></div>:null}
    {(payload?.legacyEvidence?.length??0)>0?<div className="governance-note"><ShieldCheck size={19}/><div><b>Evidencia legacy preservada</b><p>{payload?.legacyEvidence?.map(source=>`${source.fileName??source.fileHash.slice(0,10)}: ${nf.format(source.rows)} filas`).join(' · ')}. Permanece separada del registro canónico actual y en modo replay-only.</p></div></div>:null}
    {payload?.governance?<div className="governance-note"><ShieldCheck size={19}/><div><b>Lectura segura</b><p>{payload.governance.rule}</p></div></div>:null}
  </section>
}

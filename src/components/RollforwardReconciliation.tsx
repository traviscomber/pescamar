import {AlertTriangle,GitBranch,MapPin,Route,ShieldCheck} from 'lucide-react'
import {useCallback,useEffect,useMemo,useState} from 'react'

type Grade={grade:string;kg:number|null;boxes:number|null}
type Observation={sourceRow:number;eventDate:string|null;guide:string|null;supplier:string;extractionZone:string|null;site:string;lot:string;guideKg:number|null;receivedKg:number|null;grades:Grade[];destination:string|null;notes:string|null;familyKey:string;familyLabel:string}
type Chain={key:string;familyKey:string;familyLabel:string;supplier:string;site:string;rows:number;lots:number;guides:number;receivedKg:number;destinationCoveragePct:number|null;guideCoveragePct:number|null;gradeCoveragePct:number|null;destinations:string[];grades:string[];gradeObservationCount:number;status:'ready_for_reconciliation'|'needs_destination'|'needs_evidence';observations:Observation[]}
type Payload={ok?:boolean;method?:{version:string;rule:string};summary?:{rows:number;chains:number;uniqueLots:number;uniqueGuides:number;receivedKg:number;destinationRows:number;destinationCoveragePct:number|null;gradeRows:number;gradeCoveragePct:number|null;gradeObservationCount:number;unresolvedDestinationRows:number};chains?:Chain[];error?:string}
const nf=new Intl.NumberFormat('es-CL',{maximumFractionDigits:1})
const kg=(value:number)=>`${nf.format(value)} kg`
const pct=(value:number|null|undefined)=>value==null?'—':`${nf.format(value)}%`
const statusLabel=(status:Chain['status'])=>status==='ready_for_reconciliation'?'Lista para conciliar':status==='needs_destination'?'Falta destino':'Falta evidencia'
const statusClass=(status:Chain['status'])=>status==='ready_for_reconciliation'?'info':'warning'
const gradeText=(grades:Grade[])=>grades.length?grades.map(item=>`${item.grade}${item.kg==null?'':` ${nf.format(item.kg)} kg`}`).join(' · '):'Sin grado explícito'

export function RollforwardReconciliation(){
 const [data,setData]=useState<Payload|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true)
 const load=useCallback(async(silent=false)=>{if(!silent)setLoading(true);try{const response=await fetch('/api/rollforward-reconciliation',{cache:'no-store'}),payload=await response.json() as Payload;if(!response.ok)throw new Error(payload.error??'No fue posible cargar conciliación roll-forward');setData(payload);setError('')}catch(cause){setError(cause instanceof Error?cause.message:'No fue posible cargar conciliación roll-forward')}finally{if(!silent)setLoading(false)}},[])
 useEffect(()=>{void load();const refresh=()=>void load(true),timer=window.setInterval(()=>{if(document.visibilityState==='visible')refresh()},60_000);window.addEventListener('pescamar:data-updated',refresh);return()=>{window.clearInterval(timer);window.removeEventListener('pescamar:data-updated',refresh)}},[load])
 const chains=useMemo(()=>data?.chains??[],[data?.chains]),summary=data?.summary
 if(loading&&!data)return <section className="panel"><div className="empty-inline"><GitBranch size={20}/><div><b>Reconstruyendo roll-forward</b><small>Enlazando lote, grado y destino sin convertir arrastres en rendimiento.</small></div></div></section>
 if(error&&!data)return <section className="panel"><div className="notice error">{error}</div></section>
 if(!data)return null
 return <section className="panel" aria-label="Conciliación roll-forward" aria-live="polite">
  <div className="section-heading"><div><span className="overline">Producción canónica · trazabilidad roll-forward</span><h2>Lote → grado → destino</h2><p className="source-note">Reconstrucción auditable de los registros con arrastre entre lotes. Los kg recibidos siguen siendo volumen de recepción; los kg por grado no se convierten en rendimiento hasta cerrar la conciliación entre lotes.</p></div><span>{data.method?.version??'rollforward-linkage-v1'}</span></div>
  <div className="signal-grid">
   <article className="signal-card"><span><GitBranch size={16}/>Filas roll-forward</span><b>{summary?.rows??0}</b><small>{summary?.chains??0} cadenas de conciliación</small></article>
   <article className="signal-card"><span><Route size={16}/>Lotes / guías</span><b>{summary?.uniqueLots??0}</b><small>{summary?.uniqueGuides??0} guías identificadas</small></article>
   <article className="signal-card"><span><MapPin size={16}/>Destino explícito</span><b>{pct(summary?.destinationCoveragePct)}</b><small>{summary?.destinationRows??0} filas con cliente/destino</small></article>
   <article className={`signal-card ${(summary?.unresolvedDestinationRows??0)>0?'attention':''}`}><span><AlertTriangle size={16}/>Destino pendiente</span><b>{summary?.unresolvedDestinationRows??0}</b><small>No se infiere: requiere evidencia explícita</small></article>
  </div>
  {chains.length?<div className="table-scroll"><table className="data-table"><thead><tr><th>Cadena</th><th>Proveedor</th><th>Planta</th><th className="numeric">Filas</th><th className="numeric">Lotes</th><th className="numeric">Recibido</th><th className="numeric">Guía</th><th className="numeric">Destino</th><th>Grados observados</th><th>Estado</th></tr></thead><tbody>{chains.map(chain=><tr key={chain.key}><td><b>{chain.familyLabel}</b></td><td>{chain.supplier}</td><td>{chain.site}</td><td className="numeric">{chain.rows}</td><td className="numeric">{chain.lots}</td><td className="numeric">{kg(chain.receivedKg)}</td><td className="numeric">{pct(chain.guideCoveragePct)}</td><td className="numeric">{pct(chain.destinationCoveragePct)}</td><td>{chain.grades.join(' · ')||'—'}</td><td><span className={`status-badge ${statusClass(chain.status)}`}>{statusLabel(chain.status)}</span></td></tr>)}</tbody></table></div>:<div className="empty-inline"><ShieldCheck size={20}/><div><b>Sin filas roll-forward</b><small>No hay cadenas pendientes en la fuente canónica activa.</small></div></div>}
  {chains.map(chain=><details className="supplier-score-row" key={`detail-${chain.key}`}><summary><span className={`alert-icon ${statusClass(chain.status)}`}>{chain.status==='ready_for_reconciliation'?<ShieldCheck size={16}/>:<AlertTriangle size={16}/>}</span><div className="supplier-score-main"><b>{chain.familyLabel} · {chain.supplier}</b><small>{chain.rows} filas · {chain.lots} lotes · destino {pct(chain.destinationCoveragePct)}</small></div><div className="supplier-score-volume"><b>{kg(chain.receivedKg)}</b><small>{chain.gradeObservationCount} observaciones de grado</small></div></summary><div className="supplier-score-detail"><div className="table-scroll"><table className="data-table"><thead><tr><th>Fila</th><th>Fecha</th><th>Lote</th><th>Guía</th><th>Grado</th><th>Destino</th><th>Observación</th></tr></thead><tbody>{chain.observations.map(row=><tr key={`${chain.key}-${row.sourceRow}`}><td>{row.sourceRow}</td><td>{row.eventDate??'—'}</td><td><b>{row.lot}</b></td><td>{row.guide??'—'}</td><td>{gradeText(row.grades)}</td><td>{row.destination??'Pendiente'}</td><td>{row.notes??'—'}</td></tr>)}</tbody></table></div></div></details>)}
  <p className="source-note">{data.method?.rule}</p>
  {error?<div className="notice error">{error}</div>:null}
 </section>
}

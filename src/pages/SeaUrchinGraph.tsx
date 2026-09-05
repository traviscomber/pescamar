import {AlertTriangle,ArrowRight,CheckCircle2,CircleDashed,GitBranch,ShieldCheck} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'
import {Link,useSearchParams} from 'react-router-dom'
import {PageHeader} from '../components/PageHeader'
import {useLots} from '../store'

type NodeStatus='pass'|'attention'|'pending'|'info'
type GraphNode={id:string;group:string;label:string;status:NodeStatus;detail:string;at:string|null;metrics?:Record<string,unknown>}
type GraphEdge={from:string;to:string;kind:'flow'|'trace'}
type Payload={schemaVersion?:string;reception?:{id:string;receptionNumber:string|number;plantId:string;supplier:string;species:string};nodes?:GraphNode[];edges?:GraphEdge[];summary?:{nodes:number;attention:number;pending:number;japanReleasable:boolean|null};permissions?:{canSeeMoney:boolean};error?:string}
const statusLabel:Record<NodeStatus,string>={pass:'OK',attention:'REVISAR',pending:'PENDIENTE',info:'INFO'}
const tone=(status:NodeStatus)=>status==='pass'?'success':status==='attention'?'danger':status==='pending'?'info':'info'
const icon=(status:NodeStatus)=>status==='pass'?<CheckCircle2 size={15}/>:status==='attention'?<AlertTriangle size={15}/>:<CircleDashed size={15}/>
const order=['Origen','Recepción','Proceso','EdgeVision','Packing','Logística','Frío','Regulatorio','Exportación','Despacho','Economía']

export function SeaUrchinGraph(){
 const {lots,loading:lotsLoading}=useLots(),[params,setParams]=useSearchParams(),requested=params.get('receptionId')??''
 const urchinLots=useMemo(()=>lots.filter(lot=>/erizo|urchin/i.test(String(lot.species??''))),[lots])
 const receptionId=requested||urchinLots[0]?.receptionId||''
 const [data,setData]=useState<Payload|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('')
 useEffect(()=>{if(!receptionId){setData(null);return}let active=true;setLoading(true);void fetch(`/api/sea-urchin-graph?receptionId=${encodeURIComponent(receptionId)}`,{cache:'no-store'}).then(async response=>{const payload=await response.json() as Payload;if(!response.ok)throw new Error(payload.error??'No fue posible cargar el grafo');if(active){setData(payload);setError('')}}).catch(cause=>{if(active){setData(null);setError(cause instanceof Error?cause.message:'No fue posible cargar el grafo')}}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[receptionId])
 const nodes=data?.nodes??[],groups=order.map(group=>({group,nodes:nodes.filter(node=>node.group===group)})).filter(item=>item.nodes.length)
 const summary=data?.summary
 const actions=<div className="row-actions"><label>Lote <select value={receptionId} onChange={event=>setParams({receptionId:event.target.value})} disabled={lotsLoading||!urchinLots.length}><option value="">Seleccionar</option>{urchinLots.map(lot=><option key={lot.receptionId} value={lot.receptionId}>{lot.id} · {lot.supplier}</option>)}</select></label><Link className="button secondary" to={`/proceso-erizo/detalle${receptionId?`?receptionId=${encodeURIComponent(receptionId)}`:''}`}>Abrir proceso</Link></div>
 return <><PageHeader eyebrow="Seafood Event Graph" title="Grafo completo del erizo" description="Un solo lote desde origen y proceso hasta frío, exportación, despacho y resultado económico." actions={actions}/>
 {error?<div className="system-banner error" role="alert">{error}</div>:null}{loading?<div className="system-banner">Construyendo digital twin del lote…</div>:null}
 {!loading&&!receptionId?<section className="panel"><GitBranch size={26}/><h2>Sin lote de erizo seleccionado</h2><p>El grafo aparece cuando existe una recepción de erizo accesible.</p></section>:null}
 {!loading&&data?<><section className={`daily-cockpit ${summary?.attention?'has-attention':'is-clear'}`}><div className="daily-cockpit-copy"><span className="overline">Digital twin</span><h2>{summary?.attention?`${summary.attention} nodo${summary.attention===1?'':'s'} requieren atención`:'Cadena sin bloqueos visibles'}</h2><p>REC-{data.reception?.receptionNumber} · {data.reception?.supplier} · {data.reception?.plantId}. {summary?.pending?`${summary.pending} nodo${summary.pending===1?'':'s'} todavía pendientes.`:'Sin pendientes detectados.'}</p></div><div className="daily-status-mark" aria-hidden="true"><span>{summary?.attention||'✓'}</span><small>{summary?.attention?'revisar':'trazable'}</small></div></section>
 <section className="signal-grid"><article className="signal-card"><span><GitBranch size={16}/>Nodos</span><b>{summary?.nodes??nodes.length}</b><small>evidencia conectada</small></article><article className="signal-card"><span><AlertTriangle size={16}/>Atención</span><b>{summary?.attention??0}</b><small>bloqueos o desvíos</small></article><article className="signal-card"><span><ShieldCheck size={16}/>Japón</span><b>{summary?.japanReleasable===true?'PASS':summary?.japanReleasable===false?'HOLD':'—'}</b><small>release gate</small></article></section>
 <section className="panel"><div className="section-heading"><div><span className="overline teal">Flujo físico + inteligencia</span><h2>Origen → Japón → economía</h2></div><span>{data.schemaVersion}</span></div><div style={{display:'grid',gap:12}}>{groups.map((group,index)=><div key={group.group} style={{display:'grid',gridTemplateColumns:'120px 1fr auto',gap:12,alignItems:'start'}}><div><b>{group.group}</b></div><div style={{display:'grid',gap:8}}>{group.nodes.map(node=><article key={node.id} className="alert-row static"><span>{icon(node.status)}</span><div><b>{node.label}</b><small>{node.detail||'Sin detalle adicional'}</small>{node.at?<small>{new Date(node.at).toLocaleString('es-CL')}</small>:null}</div><span className={`status ${tone(node.status)}`}>{statusLabel[node.status]}</span></article>)}</div><div>{index<groups.length-1?<ArrowRight size={18}/>:null}</div></div>)}</div></section>
 <div className="notice"><ShieldCheck size={16}/><div><b>Fail closed para Japón</b><small>El grafo puede mostrar evidencia parcial, pero un despacho Japón sólo debe liberarse cuando proceso, etiquetas, regulación y los requisitos manuales de exportación estén completos.</small></div></div></>:null}</>
}

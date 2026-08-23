import {AlertTriangle,Database,Link2Off,RefreshCw} from 'lucide-react'
import {useEffect,useState} from 'react'
import {PageHeader} from '../components/PageHeader'

type Identity={sourceSystem:string;sourceLabel:string;normalizedLabel:string;plantId:string|null;status:'unlinked'|'candidate'|'confirmed'|'rejected';evidence:Record<string,unknown>;confirmedBy:string|null;confirmedAt:string|null;updatedAt:string}
type Payload={summary?:Record<string,number>;identities?:Identity[];error?:string}
const labels={unlinked:'Sin vincular',candidate:'Candidato',confirmed:'Confirmado',rejected:'Descartado'} as const

export function PlantIdentities(){
  const [payload,setPayload]=useState<Payload>({}),[loading,setLoading]=useState(true),[error,setError]=useState('')
  const load=async()=>{setLoading(true);setError('');try{const response=await fetch('/api/plant-identities',{cache:'no-store'});const body=await response.json() as Payload;if(!response.ok)throw new Error(body.error??'No fue posible cargar identidades');setPayload(body)}catch(cause){setError(cause instanceof Error?cause.message:'No fue posible cargar identidades')}finally{setLoading(false)}}
  useEffect(()=>{void load()},[])
  const identities=payload.identities??[],summary=payload.summary??{}
  return <>
    <PageHeader eyebrow="Trazabilidad histórica" title="Identidades de planta" description="Los nombres 2025 se conservan exactamente como fuente. Esta vista controla el puente hacia las seis plantas actuales sin modificar los registros originales." actions={<button className="button secondary" onClick={()=>void load()} disabled={loading}><RefreshCw size={15}/>{loading?'Actualizando…':'Actualizar'}</button>}/>
    {error?<div className="notice error" role="alert"><AlertTriangle size={15}/>{error}</div>:null}
    <section className="metric-grid"><Metric label="Alias históricos" value={Number(summary.total??0)}/><Metric label="Registros cubiertos" value={Number(summary.records??0)}/><Metric label="Sin vincular" value={Number(summary.unlinked??0)}/><Metric label="Confirmados" value={Number(summary.confirmed??0)}/></section>
    <section className="panel"><header className="panel-header"><div><span className="overline">Puente histórico</span><h2>Fuente intacta, vínculo explícito</h2></div><span>{identities.length} identidades</span></header>{loading&&!identities.length?<div className="empty-state"><Database size={24}/><span>Cargando identidades desde Neon…</span></div>:<div className="table-scroll"><table className="data-table"><thead><tr><th>Nombre histórico</th><th>Variantes</th><th className="numeric">Registros</th><th>Estado</th><th>Planta actual</th></tr></thead><tbody>{identities.map(item=>{const variants=Array.isArray(item.evidence?.variants)?item.evidence.variants.map(String):[item.sourceLabel];return <tr key={`${item.sourceSystem}-${item.normalizedLabel}`}><td><b>{item.sourceLabel}</b><small>{item.normalizedLabel}</small></td><td>{variants.join(' · ')}</td><td className="numeric">{Number(item.evidence?.record_count??0).toLocaleString('es-CL')}</td><td><span className={`status-pill ${item.status}`}><Link2Off size={12}/>{labels[item.status]}</span></td><td>{item.plantId??'Sin asignación confirmada'}</td></tr>})}</tbody></table></div>}</section>
    <div className="notice"><Link2Off size={15}/>Ninguna similitud de nombre crea una asignación automática. El vínculo sólo cambia cuando exista evidencia operacional confirmada.</div>
  </>
}
function Metric({label,value}:{label:string;value:number}){return <article className="metric"><span>{label}</span><strong>{value.toLocaleString('es-CL')}</strong><small>Neon · estado actual</small></article>}

import {AlertTriangle,CheckCircle2,Database,ShieldCheck} from 'lucide-react'
import {useEffect,useState} from 'react'

type Landmark={name:string;present:boolean}
type Payload={ok?:boolean;expected?:{count:number;first:string;latest:string;migrations:string[]};runtimeCompatibility?:{status:'compatible'|'incomplete';present:number;total:number;landmarks:Landmark[]};executionEvidence?:{status:'missing'|'tracker_present_unverified';tracked:boolean;trackerTables:string[]};pilotGate?:{status:'hold';reason:string};governance?:{writesDatabase:boolean;rule:string};error?:string}

export function SchemaPreflight(){
  const [data,setData]=useState<Payload|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
  useEffect(()=>{let active=true;void fetch('/api/schema-preflight',{cache:'no-store'}).then(async response=>{const payload=await response.json() as Payload;if(!response.ok)throw new Error(payload.error??'No fue posible verificar el esquema');if(active)setData(payload)}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'No fue posible verificar el esquema')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[])
  const runtime=data?.runtimeCompatibility,expected=data?.expected,execution=data?.executionEvidence
  return <section className="panel" data-testid="schema-preflight">
    <div className="section-heading"><div><span className="overline">Preflight de piloto</span><h2>Esquema productivo</h2></div><span className={`status ${runtime?.status==='compatible'?'success':'warning'}`}>{runtime?.status==='compatible'?'COMPATIBLE':'VERIFICANDO'}</span></div>
    {loading?<div className="system-banner">Contrastando Neon con el contrato versionado…</div>:null}
    {error?<div className="system-banner error" role="alert"><AlertTriangle size={16}/>{error}</div>:null}
    {runtime&&expected?<div className="detail-alerts">
      <div><Database size={17}/><span><b>Compatibilidad estructural</b><small>{runtime.present}/{runtime.total} objetos críticos presentes · inventario repo: {expected.count} migraciones · última {expected.latest}</small></span><em>{runtime.status==='compatible'?'PASS':'REVISAR'}</em></div>
      <div><AlertTriangle size={17}/><span><b>Evidencia de ejecución de migraciones</b><small>{execution?.status==='missing'?'Neon no contiene una bitácora de migraciones aplicada.':`Tracker candidato detectado: ${(execution?.trackerTables??[]).join(', ')}; todavía no está reconciliado contra el inventario canónico.`}</small></span><em>HOLD</em></div>
    </div>:null}
    {data?.pilotGate?<div className="governance-note"><ShieldCheck size={19}/><div><b>Gate formal del piloto · HOLD</b><p>{data.pilotGate.reason}</p><p>{data.governance?.rule}</p></div></div>:null}
    {runtime?.landmarks.some(item=>!item.present)?<div className="system-banner error"><AlertTriangle size={16}/>Faltan objetos estructurales: {runtime.landmarks.filter(item=>!item.present).map(item=>item.name).join(', ')}</div>:runtime?<div className="system-banner"><CheckCircle2 size={16}/>Los objetos estructurales muestreados están presentes. Esto demuestra compatibilidad, no el historial de ejecución de migraciones.</div>:null}
  </section>
}

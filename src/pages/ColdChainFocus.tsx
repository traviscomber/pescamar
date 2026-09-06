import {Activity,AlertTriangle,ArrowRight,Thermometer} from 'lucide-react'
import {useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import {PageHeader} from '../components/PageHeader'

type Run={id:string;run_code:string;status:string;last_observed_c:number|string|null;deviation_count:number|string;asset_name:string}
type Asset={id:string;active:boolean}
type Payload={assets?:Asset[];runs?:Run[];error?:string}

export function ColdChainFocus(){
 const [data,setData]=useState<Payload|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
 useEffect(()=>{let active=true;fetch('/api/cold-chain',{cache:'no-store'}).then(async r=>({r,p:await r.json() as Payload})).then(({r,p})=>{if(!active)return;if(!r.ok)throw new Error(p.error??'No fue posible cargar cadena de frío');setData(p);setError('')}).catch(e=>{if(active)setError(e instanceof Error?e.message:'No fue posible cargar cadena de frío')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[])
 const assets=data?.assets??[],runs=data?.runs??[],open=runs.filter(r=>r.status==='open'),deviated=runs.filter(r=>r.status==='deviation'||Number(r.deviation_count)>0),priority=deviated[0]??open[0]
 return <>
  <PageHeader eyebrow="Plant Execution" title="Cadena de frío" description="Estado, excepción y siguiente acción. Las lecturas de sensor no requieren una tarea humana cuando exista telemetría configurada."/>
  {error?<div className="system-banner error" role="alert">{error}</div>:null}
  {loading?<div className="system-banner">Actualizando cadena de frío…</div>:null}
  {!loading&&!error?<>
   <section className={`daily-cockpit ${deviated.length?'has-attention':'is-clear'}`}>
    <div className="daily-cockpit-copy"><span className="overline">Estado</span><h2>{deviated.length?`${deviated.length} desviación${deviated.length===1?'':'es'} térmica${deviated.length===1?'':'s'}`:open.length?'Ciclos en operación':'Frío en orden'}</h2><p>{deviated.length?`${priority?.asset_name??'Un activo'} requiere revisión antes de liberar producto.`:open.length?`${open.length} ciclo${open.length===1?'':'s'} abierto${open.length===1?'':'s'} sin desviación registrada. Entra al detalle sólo para fallback manual, carga física o cierre.`:'No hay ciclos abiertos ni desviaciones visibles.'}</p><div className="daily-cockpit-actions"><Link className="button primary" to="/frio/detalle">{deviated.length?'Revisar desviación':open.length?'Abrir control de frío':'Abrir detalle'}<ArrowRight size={15}/></Link></div></div>
    <div className="daily-status-mark" aria-hidden="true"><span>{deviated.length||'✓'}</span><small>{deviated.length?'revisar':'sin alertas'}</small></div>
   </section>
   <section className="signal-grid"><article className="signal-card"><span><Activity size={16}/>Activos</span><b>{assets.filter(a=>a.active).length}</b><small>equipos</small></article><article className="signal-card"><span><Thermometer size={16}/>Ciclos</span><b>{open.length}</b><small>abiertos</small></article><article className="signal-card"><span><AlertTriangle size={16}/>Desviaciones</span><b>{deviated.length}</b><small>requieren revisión</small></article></section>
   <nav className="daily-footer-actions"><Link className="text-action inline-link" to="/frio/detalle">Ver detalle<ArrowRight size={14}/></Link></nav>
  </>:null}
 </>
}
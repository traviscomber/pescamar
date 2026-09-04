import {ArrowRight,Boxes,CheckCircle2} from 'lucide-react'
import {useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import {PageHeader} from '../components/PageHeader'

type Pallet={id:string;pallet_code:string;status:string;box_count:number|string;net_kg:number|string;destination:string|null}
type Payload={pallets?:Pallet[];error?:string}

export function PalletsFocus(){
 const [data,setData]=useState<Payload|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
 useEffect(()=>{let active=true;fetch('/api/pallets',{cache:'no-store'}).then(async r=>({r,p:await r.json() as Payload})).then(({r,p})=>{if(!active)return;if(!r.ok)throw new Error(p.error??'No fue posible cargar pallets');setData(p);setError('')}).catch(e=>{if(active)setError(e instanceof Error?e.message:'No fue posible cargar pallets')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[])
 const pallets=data?.pallets??[],building=pallets.filter(p=>p.status==='building'),closed=pallets.filter(p=>p.status==='closed'),priority=building[0]
 return <>
  <PageHeader eyebrow="Plant Execution" title="Pallets" description="Estado, prioridad y siguiente acción."/>
  {error?<div className="system-banner error" role="alert">{error}</div>:null}
  {loading?<div className="system-banner">Actualizando pallets…</div>:null}
  {!loading&&!error?<>
   <section className={`daily-cockpit ${priority?'has-attention':'is-clear'}`}>
    <div className="daily-cockpit-copy"><span className="overline">Estado</span><h2>{priority?'Hay un pallet por completar':'Palletización en orden'}</h2><p>{priority?`${priority.pallet_code} sigue abierto${priority.destination?` para ${priority.destination}`:''}. Completa su composición y ciérralo cuando esté listo.`:'No hay pallets abiertos que requieran intervención.'}</p><div className="daily-cockpit-actions"><Link className="button primary" to="/pallets/detalle">{priority?'Continuar pallet':'Abrir detalle'}<ArrowRight size={15}/></Link></div></div>
    <div className="daily-status-mark" aria-hidden="true"><span>{priority?building.length:'✓'}</span><small>{priority?'abiertos':'sin pendientes'}</small></div>
   </section>
   <section className="signal-grid"><article className="signal-card"><span><Boxes size={16}/>Abiertos</span><b>{building.length}</b><small>en construcción</small></article><article className="signal-card"><span><CheckCircle2 size={16}/>Cerrados</span><b>{closed.length}</b><small>composición fijada</small></article><article className="signal-card"><span><Boxes size={16}/>Total</span><b>{pallets.length}</b><small>registrados</small></article></section>
   <nav className="daily-footer-actions"><Link className="text-action inline-link" to="/pallets/detalle">Ver detalle<ArrowRight size={14}/></Link></nav>
  </>:null}
 </>
}

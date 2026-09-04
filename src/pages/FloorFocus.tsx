import {ArrowRight,PackagePlus,ShieldCheck,WifiOff} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'
import {Link} from 'react-router-dom'
import {useAuth} from '../auth'
import {PageHeader} from '../components/PageHeader'
import {useLots} from '../store'

type Exec={writesEnabled?:boolean;error?:string}
type Station={id:string;plant_id:string;station_type:string;active:boolean}
type Stations={stations?:Station[];error?:string}

export function FloorFocus(){
 const {operator}=useAuth();const {lots}=useLots();
 const [writes,setWrites]=useState<boolean|null>(null),[stations,setStations]=useState<Station[]>([]),[error,setError]=useState('')
 useEffect(()=>{let live=true;(async()=>{try{const r=await fetch('/api/plant-execution',{cache:'no-store'}),p=await r.json() as Exec;if(!r.ok)throw new Error(p.error??'No fue posible verificar ejecución');if(!live)return;setWrites(p.writesEnabled===true);if(p.writesEnabled===true){const sr=await fetch('/api/plant-stations',{cache:'no-store'}),sp=await sr.json() as Stations;if(!sr.ok)throw new Error(sp.error??'No fue posible cargar estaciones');if(live)setStations(sp.stations??[])}}catch(e){if(live){setWrites(false);setError(e instanceof Error?e.message:'No fue posible verificar ejecución')}}})();return()=>{live=false}},[])
 const allowedLots=useMemo(()=>operator?.role==='admin'?lots:lots.filter(l=>operator?.plantIds.includes(l.plantId)),[lots,operator])
 const floorStations=stations.filter(s=>s.active&&(s.station_type==='floor'||s.station_type==='packing'))
 const ready=writes===true&&floorStations.length>0&&allowedLots.length>0
 const state=writes===null?'Verificando':writes!==true?'Modo seguro':floorStations.length===0?'Falta estación':allowedLots.length===0?'Sin lotes disponibles':'Lista para operar'
 const next=writes!==true?'Habilitar Plant Execution en entorno verificado':floorStations.length===0?'Configurar estación de piso':allowedLots.length===0?'Esperar o registrar recepción':'Capturar siguiente packing unit'
 return <>
  <PageHeader eyebrow="Piso / packing" title="Siguiente acción" description="La operación diaria muestra sólo disponibilidad y la acción inmediata. Scanner, peso, cola offline y configuración quedan en detalle."/>
  <section className="panel decision-focus">
   <div className="section-heading"><div><span className="overline">Estado</span><h2>{state}</h2></div>{writes===false?<WifiOff size={22}/>:<ShieldCheck size={22}/>}</div>
   <div className="decision-copy"><b>{next}</b><p>{ready?'La estación tiene lote, permiso de escritura y hardware lógico suficiente para continuar.':'No se crearán eventos persistentes hasta cumplir el gate correspondiente.'}</p></div>
   <div className="signal-grid compact-signals"><article className="signal-card"><span>Lotes disponibles</span><b>{allowedLots.length}</b></article><article className="signal-card"><span>Estaciones activas</span><b>{floorStations.length}</b></article><article className="signal-card"><span>Escritura</span><b>{writes?'ON':'OFF'}</b></article></div>
   <div className="page-actions"><Link className="button primary" to="/floor/detalle">{ready?'Operar estación':'Resolver configuración'}<ArrowRight size={15}/></Link><Link className="button" to="/estaciones">Ver hardware</Link></div>
   {error?<small className="source-note">{error}</small>:null}
  </section>
 </>
}

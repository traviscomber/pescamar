import {Activity,ArrowRight,CheckCircle2,Printer,ScanLine,Settings2,TriangleAlert} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'
import {Link} from 'react-router-dom'
import {PageHeader} from '../components/PageHeader'

type Device={id:string;deviceType:string;manufacturer:string|null;model:string|null;protocol:string|null;stableIdentifier:string;active:boolean;config:Record<string,unknown>}
type Station={id:string;plant_id:string;code:string;name:string;station_type:string;active:boolean;config:Record<string,unknown>;devices:Device[]}
type Payload={ok?:boolean;writesEnabled?:boolean;stations?:Station[];error?:string}

async function loadStations():Promise<Payload>{
 const response=await fetch('/api/plant-stations',{credentials:'same-origin',cache:'no-store'})
 const payload=await response.json().catch(()=>({})) as Payload
 if(!response.ok)throw new Error(payload.error??'No fue posible cargar hardware')
 return payload
}

export function PlantStationsFocus(){
 const [data,setData]=useState<Payload|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
 useEffect(()=>{void (async()=>{try{setData(await loadStations());setError('')}catch(cause){setError(cause instanceof Error?cause.message:'No fue posible cargar hardware')}finally{setLoading(false)}})()},[])
 const stations=useMemo(()=>data?.stations??[],[data?.stations])
 const devices=useMemo(()=>stations.flatMap(station=>station.devices??[]),[stations])
 const activeStations=stations.filter(station=>station.active)
 const activeDevices=devices.filter(device=>device.active)
 const printers=activeDevices.filter(device=>device.deviceType==='printer')
 const scanners=activeDevices.filter(device=>device.deviceType==='scanner')
 const needsStation=activeStations.length===0
 const needsPrinter=!needsStation&&printers.length===0
 const needsScanner=!needsStation&&scanners.length===0
 const title=needsStation?'Configurar primera estación':needsPrinter?'Conectar impresora':needsScanner?'Conectar scanner':'Hardware listo para operar'
 const meaning=needsStation?'Todavía no existe un punto físico registrado para packing o piso.':needsPrinter?'La estación existe, pero aún no hay una impresora activa para cerrar el flujo de etiquetado.':needsScanner?'La impresión puede operar, pero falta un scanner para reducir ingreso manual y errores de identificación.':'Las estaciones y los dispositivos mínimos están registrados. El detalle técnico puede permanecer fuera del flujo diario.'
 const actionPath=needsStation||needsPrinter||needsScanner?'/estaciones/detalle':'/impresion-etiquetas'
 const actionLabel=needsStation?'Crear estación':needsPrinter?'Registrar impresora':needsScanner?'Registrar scanner':'Ir a etiquetado'
 const Icon=needsStation?Settings2:needsPrinter?Printer:needsScanner?ScanLine:CheckCircle2
 return <>
  <PageHeader eyebrow="Hardware de planta" title="Estaciones y dispositivos" description="Estado físico primero. Configuración técnica sólo cuando hace falta." actions={<Link className="button secondary" to="/estaciones/detalle">Ver detalle</Link>}/>
  {error?<div className="system-banner error" role="alert">{error}</div>:null}
  {loading?<div className="system-banner">Comprobando hardware…</div>:null}
  {!loading&&!error?<section className="panel focus-panel"><div className="decision-hero"><span className={`status ${needsStation||needsPrinter?'danger':needsScanner?'info':'success'}`}><Icon size={14}/>{needsStation||needsPrinter?'Requiere acción':needsScanner?'Mejora recomendada':'Operativo'}</span><h2>{title}</h2><p>{meaning}</p><div className="row-actions"><Link className="button primary" to={actionPath}>{actionLabel}<ArrowRight size={15}/></Link><Link className="source-link" to="/estaciones/detalle">Ver configuración</Link></div></div></section>:null}
  <section className="signal-grid"><article className="signal-card"><span><Activity size={16}/>Estaciones activas</span><b>{activeStations.length}</b><small>{stations.length} registradas</small></article><article className="signal-card"><span><Printer size={16}/>Impresoras</span><b>{printers.length}</b><small>activas</small></article><article className="signal-card"><span><ScanLine size={16}/>Scanners</span><b>{scanners.length}</b><small>activos</small></article></section>
  {!loading&&!error&&devices.some(device=>!device.active)?<div className="notice"><TriangleAlert size={16}/><div><b>{devices.filter(device=>!device.active).length} dispositivo(s) inactivo(s)</b><small>No bloquean la operación mientras exista un dispositivo activo equivalente.</small></div></div>:null}
 </>
}

import {AlertTriangle,CheckCircle2,Printer,Tag} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'
import {Link} from 'react-router-dom'
import {PageHeader} from '../components/PageHeader'

type Template={id:string;active:boolean}
type Job={id:string;status:string}
type EnginePayload={writesEnabled?:boolean;templates?:Template[];jobs?:Job[];error?:string}
type PackingUnit={id:string}
type Label={id:string;status:string}
type PrinterDevice={id:string;manufacturer:string|null;model:string|null;protocol:string|null}
type OptionsPayload={packingUnits?:PackingUnit[];labels?:Label[];printers?:PrinterDevice[];error?:string}

async function read<T extends {error?:string}>(url:string):Promise<T>{const r=await fetch(url,{credentials:'same-origin',cache:'no-store'}),p=await r.json() as T;if(!r.ok)throw new Error(p.error??'No fue posible cargar impresión');return p}

export function LabelPrintFocus(){
 const[engine,setEngine]=useState<EnginePayload|null>(null),[options,setOptions]=useState<OptionsPayload|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
 useEffect(()=>{void Promise.all([read<EnginePayload>('/api/label-engine'),read<OptionsPayload>('/api/label-engine-options')]).then(([e,o])=>{setEngine(e);setOptions(o)}).catch(e=>setError(e instanceof Error?e.message:'No fue posible cargar impresión')).finally(()=>setLoading(false))},[])
 const jobs=useMemo(()=>engine?.jobs??[],[engine?.jobs]),templates=(engine?.templates??[]).filter(t=>t.active),units=options?.packingUnits??[],labels=(options?.labels??[]).filter(l=>l.status==='validated'),printers=options?.printers??[]
 const counts=useMemo(()=>({queued:jobs.filter(j=>['queued','sent'].includes(j.status)).length,failed:jobs.filter(j=>j.status==='failed').length,printed:jobs.filter(j=>['printed','reprinted'].includes(j.status)).length}),[jobs])
 const hardwareReady=printers.length>0,documentReady=labels.length>0,templateReady=templates.length>0,writesEnabled=Boolean(engine?.writesEnabled)
 const state=!hardwareReady?'hardware':!documentReady?'label':!templateReady?'template':counts.failed>0?'failed':counts.queued>0?'queue':units.length>0&&writesEnabled?'ready':'waiting'
 const title=state==='hardware'?'Falta conectar la impresora':state==='label'?'Falta validar la etiqueta':state==='template'?'Falta plantilla de impresión':state==='failed'?'Hay una impresión que revisar':state==='queue'?'Hay trabajos en impresión':state==='ready'?'Listo para imprimir':'Sin cajas listas para imprimir'
 const detail=state==='hardware'?'Para Chile, la ruta más simple es impresora industrial Zebra por Ethernet/ZPL. ZT411 para producción continua; ZT231 para una estación de menor volumen.':state==='label'?'La caja existe, pero no se imprime hasta que su etiqueta esté validada contra el lote.':state==='template'?'Define una plantilla versionada una vez y reutilízala por producto/planta.':state==='failed'?`${counts.failed} trabajo(s) fallaron. Revísalos antes de reimprimir.`:state==='queue'?`${counts.queued} trabajo(s) están en cola o enviados al hardware.`:state==='ready'?`${units.length} caja(s) disponibles · ${printers.length} impresora(s) registrada(s).`:'La impresión aparecerá cuando exista una caja trazada y validada.'
 const href=state==='hardware'?'/estaciones':state==='label'?'/etiquetas':'/impresion-etiquetas/detalle'
 const action=state==='hardware'?'Conectar impresora':state==='label'?'Validar etiqueta':state==='template'?'Configurar plantilla':state==='failed'?'Revisar impresión':state==='queue'?'Ver cola':state==='ready'?'Imprimir caja':'Ver detalle'
 return <>
  <PageHeader eyebrow="Plant Execution" title="Etiquetado" description="Caja correcta, etiqueta correcta, impresora correcta. Todo lo demás queda detrás del detalle."/>
  {error?<div className="system-banner error" role="alert">{error}</div>:null}{loading?<div className="system-banner">Comprobando preparación de impresión…</div>:null}
  <section className="panel"><div className="section-heading"><div><span className="overline">Siguiente acción</span><h2>{title}</h2></div>{state==='ready'?<span className="status success"><CheckCircle2 size={13}/>Preparado</span>:state==='failed'?<span className="status danger"><AlertTriangle size={13}/>Revisar</span>:<span className="status info">Pendiente</span>}</div><p className="source-note">{detail}</p><div className="row-actions"><Link className="button primary" to={href}>{action}</Link><Link className="button secondary" to="/impresion-etiquetas/detalle">Ver detalle</Link></div></section>
  <section className="signal-grid"><article className="signal-card"><span><Printer size={16}/>Hardware</span><b>{hardwareReady?'Listo':'Pendiente'}</b><small>{printers.length?`${printers.length} impresora(s) registrada(s)`:'Ethernet/ZPL recomendado en planta'}</small></article><article className="signal-card"><span><Tag size={16}/>Etiquetas validadas</span><b>{labels.length}</b><small>{units.length} caja(s) disponibles</small></article><article className="signal-card"><span><CheckCircle2 size={16}/>Impresas</span><b>{counts.printed}</b><small>{counts.queued} en curso · {counts.failed} fallidas</small></article></section>
  {!hardwareReady?<section className="panel"><div className="section-heading"><div><span className="overline">Hardware viable en Chile</span><h2>Una impresora industrial por Ethernet</h2></div></div><div className="compact-ledger"><div className="alert-row static"><span>01</span><div><b>Zebra ZT411</b><small>Opción preferida para packing continuo. Industrial, 4 pulgadas, Ethernet y ZPL.</small></div></div><div className="alert-row static"><span>02</span><div><b>Zebra ZT231</b><small>Alternativa más económica para menor volumen manteniendo el mismo enfoque de integración.</small></div></div><div className="alert-row static"><span>03</span><div><b>Adapter local</b><small>Pescamar encola; un pequeño servicio en la planta envía ZPL por la LAN y sólo después confirma printed. La web nunca asume que el papel salió.</small></div></div></div></section>:null}
 </>
}

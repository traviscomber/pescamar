import {Camera,ChevronLeft,ShieldCheck} from 'lucide-react'
import {useEffect,useState} from 'react'
import {Link,useSearchParams} from 'react-router-dom'
import {PageHeader} from '../components/PageHeader'
import {UniVisionStation} from '../components/UniVisionStation'

type MobilePayload={ok?:boolean;run?:{runId:string;receptionId:string;receptionNumber:string|number;plantId:string|null;species:string;supplier:string;grade:string|null;colorStatus:string;status:string};permissions?:{canCapture:boolean};error?:string}

export function SeaUrchinMobileCapture(){
 const [params]=useSearchParams(),runId=params.get('runId')??''
 const [data,setData]=useState<MobilePayload|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
 async function load(){if(!runId){setError('Falta identificar el proceso de erizo');setLoading(false);return}setLoading(true);try{const response=await fetch(`/api/sea-urchin-mobile?runId=${encodeURIComponent(runId)}`,{cache:'no-store'}),payload=await response.json() as MobilePayload;if(!response.ok)throw new Error(payload.error??'No fue posible abrir estación móvil');setData(payload);setError('')}catch(cause){setError(cause instanceof Error?cause.message:'No fue posible abrir estación móvil')}finally{setLoading(false)}}
 useEffect(()=>{void load()},[runId])
 const run=data?.run??null
 return <>
  <PageHeader eyebrow="Estación móvil" title="Erizo · Cámara o foto" description="Toma una foto con el celular o sube una imagen existente para medir color CIELAB y homogeneidad antes de confirmar Grade." actions={<div className="page-actions"><Link className="button secondary" to={run?`/proceso-erizo?receptionId=${encodeURIComponent(run.receptionId)}${run.plantId?`&plantId=${encodeURIComponent(run.plantId)}`:''}`:'/proceso-erizo'}><ChevronLeft size={15}/>Volver al proceso</Link></div>}/>
  <div className="notice"><Camera size={16}/><div><b>Dos modos, mismo análisis</b><small>Cámara: usa trasera 1×, soporte fijo, luz blanca difusa y fondo neutro. Foto existente: sube JPG, PNG o WebP sin filtros ni edición de color.</small></div></div>
  {loading?<div className="system-banner">Abriendo estación móvil…</div>:null}
  {error?<div className="system-banner error" role="alert">{error}</div>:null}
  {run?<div className="notice"><ShieldCheck size={16}/><div><b>REC-{run.receptionNumber} · {run.supplier}</b><small>{run.plantId?`Planta ${run.plantId} · `:''}{run.grade?`Grade actual ${run.grade} · `:''}Color {run.colorStatus} · {run.status}</small></div></div>:null}
  {run&&data?.permissions?.canCapture?<UniVisionStation runId={run.runId} plantId={run.plantId} currentGrade={run.grade} onChanged={load}/>:run&&!data?.permissions?.canCapture?<div className="system-banner error">Tu rol puede consultar este proceso, pero no capturar muestras.</div>:null}
 </>
}

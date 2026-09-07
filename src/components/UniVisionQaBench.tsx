import {AlertTriangle,CheckCircle2,ImagePlus,ScanLine,ShieldCheck,Target} from 'lucide-react'
import {useRef,useState,type ChangeEvent} from 'react'
import {analyzeSegmentedCanvas,type UniVisionSegmentation} from '../lib/uniVisionSegmentation'

const qaBand={usable:[0.10,0.25],l:[55,72],a:[10,27],b:[35,58]} as const
const fmt=(value:number,digits=1)=>value.toLocaleString('es-CL',{maximumFractionDigits:digits})
const within=(value:number,[min,max]:readonly[number,number])=>value>=min&&value<=max

export function UniVisionQaBench(){
 const inputRef=useRef<HTMLInputElement|null>(null)
 const [preview,setPreview]=useState('')
 const [result,setResult]=useState<UniVisionSegmentation|null>(null)
 const [fileName,setFileName]=useState('')
 const [error,setError]=useState('')

 async function chooseFile(event:ChangeEvent<HTMLInputElement>){
  const file=event.target.files?.[0]
  if(!file)return
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setError('Usa JPG, PNG o WebP');return}
  try{
   const image=await readImage(file),canvas=drawToCanvas(image,image.naturalWidth,image.naturalHeight),segmentation=analyzeSegmentedCanvas(canvas)
   setPreview(segmentation.previewDataUrl)
   setResult(segmentation)
   setFileName(file.name)
   setError('')
  }catch(cause){setPreview('');setResult(null);setFileName(file.name);setError(cause instanceof Error?cause.message:'No fue posible analizar la imagen')}
  finally{if(inputRef.current)inputRef.current.value=''}
 }

 const referencePass=result?within(result.usableRatio,qaBand.usable)&&within(result.metrics.lMean,qaBand.l)&&within(result.metrics.aMean,qaBand.a)&&within(result.metrics.labBMean,qaBand.b)&&result.confidence==='good':false
 return <section className="panel" aria-label="Banco QA Uni Vision">
  <div className="section-heading"><div><span className="overline teal">Validación visual asistida</span><h2>Revisar producto con una foto</h2></div><ScanLine size={20}/></div>
  <div className="notice"><ShieldCheck size={16}/><div><b>La IA ayuda. Calidad decide.</b><small>Sube una foto del producto. Uni Vision mide color y consistencia visual y recomienda si la muestra está lista para revisión humana. La imagen de prueba no crea datos operacionales ni aprueba producto.</small></div></div>
  {error?<div className="notice error"><AlertTriangle size={16}/><div><b>No fue posible revisar la muestra</b><small>{error}</small></div></div>:null}
  <div className="row-actions"><input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>void chooseFile(event)}/><button type="button" className="button primary" onClick={()=>inputRef.current?.click()}><ImagePlus size={15}/>Revisar foto</button>{fileName?<span className="source-note">{fileName}</span>:null}</div>
  {preview?<img src={preview} alt="Producto aislado por Uni Vision" style={{width:'100%',maxHeight:420,objectFit:'contain',background:'#111',marginTop:16}}/>:null}
  {result?<><div className={`notice ${referencePass?'':'warning'}`}>{referencePass?<CheckCircle2 size={16}/>:<AlertTriangle size={16}/>}<div><b>{referencePass?'Muestra visualmente consistente':'Muestra requiere revisión'}</b><small>{referencePass?'El color y la consistencia visual son compatibles con la referencia de prueba. Puede pasar a validación de Calidad.':'La medición visual no es suficientemente consistente con la referencia de prueba. Calidad debe revisar la muestra o repetir la foto antes de decidir.'}</small></div></div><div className="signal-grid" style={{marginTop:16}}><article className="signal-card"><span><Target size={16}/>Resultado</span><b>{referencePass?'Revisar y aprobar':'Revisar'}</b><small>decisión final humana</small></article><article className="signal-card"><span><Target size={16}/>Producto visible</span><b>{Math.round(result.usableRatio*100)}%</b><small>área útil analizada</small></article><article className="signal-card"><span><Target size={16}/>Luminosidad</span><b>{fmt(result.metrics.lMean,1)}</b><small>medición visual</small></article><article className="signal-card"><span><Target size={16}/>Tono</span><b>{fmt(result.metrics.labBMean,1)}</b><small>componente amarillo</small></article></div><p className="source-note">Decisión final: pendiente de Calidad. La medición visual es evidencia de apoyo; no define Grade, origen, inocuidad ni liberación del producto.</p></>:null}
 </section>
}

function drawToCanvas(source:CanvasImageSource,width:number,height:number){const maxWidth=1280,maxHeight=960,scale=Math.min(1,maxWidth/width,maxHeight/height),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw new Error('Canvas no disponible');context.drawImage(source,0,0,canvas.width,canvas.height);return canvas}
function readImage(file:File){return new Promise<HTMLImageElement>((resolve,reject)=>{const url=URL.createObjectURL(file),image=new Image();image.onload=()=>{URL.revokeObjectURL(url);resolve(image)};image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('No fue posible leer la imagen'))};image.src=url})}

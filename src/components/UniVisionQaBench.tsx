import {AlertTriangle,CheckCircle2,ImagePlus,ScanLine,ShieldCheck,Target} from 'lucide-react'
import {useRef,useState,type ChangeEvent} from 'react'
import {analyzeSegmentedCanvas,type UniVisionSegmentation} from '../lib/uniVisionSegmentationV2'

const fmt=(value:number,digits=1)=>value.toLocaleString('es-CL',{maximumFractionDigits:digits})

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

 const scanReady=result?.confidence==='good'
 const reviewReasons=result?[result.roi.source==='default'?'No se detectó una cavidad de bandeja con suficiente confianza':null,result.borderCandidateRatio>0.16?'La máscara todavía toca demasiado el perímetro del área útil':null,result.usableRatio<0.015?'Hay muy poco producto aislado':null,result.usableRatio>0.92?'La máscara cubre casi toda el área útil y puede estar incluyendo contenedor':null].filter(Boolean) as string[]:[]
 return <section className="panel" aria-label="Banco QA Uni Vision">
  <div className="section-heading"><div><span className="overline teal">Validación visual asistida · scan v2</span><h2>Revisar producto con una foto</h2></div><ScanLine size={20}/></div>
  <div className="notice"><ShieldCheck size={16}/><div><b>Vision mide. Calidad decide.</b><small>Uni aísla visualmente el producto y calcula color, cobertura y consistencia. Esta pantalla evalúa la calidad del scan, no decide Grade ni conformidad del producto.</small></div></div>
  {error?<div className="notice error"><AlertTriangle size={16}/><div><b>No fue posible revisar la muestra</b><small>{error}</small></div></div>:null}
  <div className="row-actions"><input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>void chooseFile(event)}/><button type="button" className="button primary" onClick={()=>inputRef.current?.click()}><ImagePlus size={15}/>Revisar foto</button>{fileName?<span className="source-note">{fileName}</span>:null}</div>
  {preview?<img src={preview} alt="Producto aislado por Uni Vision" style={{width:'100%',maxHeight:520,objectFit:'contain',background:'#111',marginTop:16}}/>:null}
  {result?<><div className={`notice ${scanReady?'':'warning'}`}>{scanReady?<CheckCircle2 size={16}/>:<AlertTriangle size={16}/>}<div><b>{scanReady?'Scan listo para revisión de Calidad':'Scan requiere revisión visual'}</b><small>{scanReady?'La separación producto/contenedor es suficientemente estable para usar estas mediciones como evidencia derivada. Calidad conserva la decisión final.':reviewReasons.length?reviewReasons.join(' · '):'La segmentación necesita revisión humana antes de usar estas mediciones como apoyo.'}</small></div></div><div className="signal-grid" style={{marginTop:16}}><article className="signal-card"><span><Target size={16}/>Área útil</span><b>{result.roi.source==='tray'?'Bandeja detectada':'Encuadre general'}</b><small>{Math.round(result.roi.width)} × {Math.round(result.roi.height)} px</small></article><article className="signal-card"><span><Target size={16}/>Producto visible</span><b>{Math.round(result.usableRatio*100)}%</b><small>del área útil analizada</small></article><article className="signal-card"><span><Target size={16}/>Componentes</span><b>{result.retainedComponents}</b><small>masas de producto retenidas</small></article><article className="signal-card"><span><Target size={16}/>Geometría suprimida</span><b>{result.suppressedFramePixels}</b><small>celdas descartadas como marco/divisor</small></article><article className="signal-card"><span><Target size={16}/>Luminosidad L*</span><b>{fmt(result.metrics.lMean,1)}</b><small>medición visual derivada</small></article><article className="signal-card"><span><Target size={16}/>a*</span><b>{fmt(result.metrics.aMean,1)}</b><small>verde ↔ rojo</small></article><article className="signal-card"><span><Target size={16}/>b*</span><b>{fmt(result.metrics.labBMean,1)}</b><small>azul ↔ amarillo</small></article><article className="signal-card"><span><Target size={16}/>Borde residual</span><b>{Math.round(result.borderCandidateRatio*100)}%</b><small>producto/marco tocando perímetro</small></article></div><p className="source-note">Scan v2: ROI de bandeja más conservador, semilla de roe más estricta, supresión de rieles internos y cierre morfológico reforzado. Sigue siendo evidencia derivada; Grade, aceptación e inocuidad corresponden a Calidad.</p></>:null}
 </section>
}

function drawToCanvas(source:CanvasImageSource,width:number,height:number){const maxWidth=1280,maxHeight=960,scale=Math.min(1,maxWidth/width,maxHeight/height),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw new Error('Canvas no disponible');context.drawImage(source,0,0,canvas.width,canvas.height);return canvas}
function readImage(file:File){return new Promise<HTMLImageElement>((resolve,reject)=>{const url=URL.createObjectURL(file),image=new Image();image.onload=()=>{URL.revokeObjectURL(url);resolve(image)};image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('No fue posible leer la imagen'))};image.src=url})}

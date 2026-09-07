import {AlertTriangle,Camera,CheckCircle2,ImagePlus,ScanLine,ShieldCheck,Target,VideoOff} from 'lucide-react'
import {useEffect,useRef,useState,type ChangeEvent} from 'react'
import {analyzeSegmentedCanvas,type UniVisionSegmentation} from '../lib/uniVisionSegmentationV41'

const fmt=(value:number,digits=1)=>value.toLocaleString('es-CL',{maximumFractionDigits:digits})

export function UniVisionQaBench(){
 const inputRef=useRef<HTMLInputElement|null>(null)
 const videoRef=useRef<HTMLVideoElement|null>(null)
 const streamRef=useRef<MediaStream|null>(null)
 const [preview,setPreview]=useState('')
 const [result,setResult]=useState<UniVisionSegmentation|null>(null)
 const [fileName,setFileName]=useState('')
 const [error,setError]=useState('')
 const [cameraOn,setCameraOn]=useState(false)
 const [cameraBusy,setCameraBusy]=useState(false)
 const [cameraCycleOk,setCameraCycleOk]=useState(false)
 const [analysisNotice,setAnalysisNotice]=useState('')

 useEffect(()=>()=>stopCamera(),[])

 async function chooseFile(event:ChangeEvent<HTMLInputElement>){
  const file=event.target.files?.[0]
  if(!file)return
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setError('Usa JPG, PNG o WebP');return}
  setCameraCycleOk(false);setAnalysisNotice('')
  try{
   const image=await readImage(file),canvas=drawToCanvas(image,image.naturalWidth,image.naturalHeight)
   analyzeCanvas(canvas,file.name)
  }catch(cause){clearResult();setFileName(file.name);setError(cause instanceof Error?cause.message:'No fue posible analizar la imagen')}
  finally{if(inputRef.current)inputRef.current.value=''}
 }

 function analyzeCanvas(canvas:HTMLCanvasElement,sourceName:string){
  const segmentation=analyzeSegmentedCanvas(canvas)
  setPreview(segmentation.previewDataUrl)
  setResult(segmentation)
  setFileName(sourceName)
  setError('')
  setAnalysisNotice('')
 }

 async function startCamera(){
  if(!navigator.mediaDevices?.getUserMedia){setError('Este navegador no permite acceso directo a la cámara.');return}
  setCameraBusy(true);setError('');setCameraCycleOk(false);setAnalysisNotice('')
  try{
   stopCamera()
   let stream:MediaStream
   try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false})}
   catch{stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false})}
   streamRef.current=stream
   setCameraOn(true)
   requestAnimationFrame(()=>{if(videoRef.current){videoRef.current.srcObject=stream;void videoRef.current.play()}})
  }catch(cause){setCameraOn(false);setError(cause instanceof Error?`No fue posible abrir la cámara: ${cause.message}`:'No fue posible abrir la cámara')}
  finally{setCameraBusy(false)}
 }

 function stopCamera(){
  streamRef.current?.getTracks().forEach(track=>track.stop())
  streamRef.current=null
  if(videoRef.current)videoRef.current.srcObject=null
  setCameraOn(false)
 }

 function captureCamera(){
  const video=videoRef.current
  if(!video||video.readyState<2||!video.videoWidth||!video.videoHeight){setError('La cámara todavía no está lista para capturar.');return}
  try{
   const canvas=drawToCanvas(video,video.videoWidth,video.videoHeight)
   setCameraCycleOk(true)
   setFileName(`captura-camara-${new Date().toISOString()}`)
   setError('')
   try{analyzeCanvas(canvas,`captura-camara-${new Date().toISOString()}`)}
   catch(cause){clearResult();setAnalysisNotice(cause instanceof Error?cause.message:'Uni no pudo aislar producto en esta captura')}
  }catch(cause){clearResult();setCameraCycleOk(false);setError(cause instanceof Error?cause.message:'No fue posible capturar el frame de cámara')}
 }

 function clearResult(){setPreview('');setResult(null)}

 const scanReady=result?.confidence==='good'
 const reviewReasons=result?[result.roi.source==='default'?'No se detectó una cavidad de bandeja con suficiente confianza':null,result.borderCandidateRatio>0.14?'La máscara todavía toca demasiado el perímetro del área útil':null,result.usableRatio<0.02?'Hay muy poco producto aislado':null,result.usableRatio>0.90?'La máscara cubre demasiado del área útil y puede estar incluyendo contenedor':null].filter(Boolean) as string[]:[]
 return <section className="panel" aria-label="Banco QA Uni Vision">
  <div className="section-heading"><div><span className="overline teal">Validación visual asistida · scan v4.1</span><h2>Revisar producto con cámara o foto</h2></div><ScanLine size={20}/></div>
  <div className="notice"><ShieldCheck size={16}/><div><b>Vision mide. Calidad decide.</b><small>Esta prueba valida el ciclo cámara → captura → scan Uni. No crea evidencia operacional, Grade ni conformidad del producto.</small></div></div>
  {cameraCycleOk?<div className="notice"><CheckCircle2 size={16}/><div><b>Ciclo de cámara OK</b><small>La cámara abrió y el navegador capturó un frame correctamente. La detección de uni se evalúa por separado.</small></div></div>:null}
  {analysisNotice?<div className="notice warning"><AlertTriangle size={16}/><div><b>Captura OK · no se detectó suficiente uni</b><small>{analysisNotice}</small></div></div>:null}
  {error?<div className="notice error"><AlertTriangle size={16}/><div><b>No fue posible completar la captura</b><small>{error}</small></div></div>:null}
  <div className="row-actions">
   <button type="button" className="button primary" disabled={cameraBusy} onClick={()=>void startCamera()}><Camera size={15}/>{cameraBusy?'Abriendo cámara…':cameraOn?'Reiniciar cámara':'Abrir cámara'}</button>
   {cameraOn?<><button type="button" className="button primary" onClick={captureCamera}><ScanLine size={15}/>Capturar y analizar</button><button type="button" className="button" onClick={stopCamera}><VideoOff size={15}/>Cerrar cámara</button></>:null}
   <input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>void chooseFile(event)}/>
   <button type="button" className="button" onClick={()=>inputRef.current?.click()}><ImagePlus size={15}/>Usar foto</button>
   {fileName?<span className="source-note">{fileName}</span>:null}
  </div>
  {cameraOn?<div style={{marginTop:16,background:'#111',display:'flex',justifyContent:'center'}}><video ref={videoRef} autoPlay playsInline muted style={{width:'100%',maxHeight:520,objectFit:'contain'}}/></div>:null}
  {preview?<img src={preview} alt="Producto aislado por Uni Vision" style={{width:'100%',maxHeight:520,objectFit:'contain',background:'#111',marginTop:16}}/>:null}
  {result?<><div className={`notice ${scanReady?'':'warning'}`}>{scanReady?<CheckCircle2 size={16}/>:<AlertTriangle size={16}/>}<div><b>{scanReady?'Scan listo para revisión de Calidad':'Scan requiere revisión visual'}</b><small>{scanReady?'La captura completó el ciclo cámara → frame → segmentación → métricas. Calidad conserva la decisión final.':reviewReasons.length?reviewReasons.join(' · '):'La segmentación necesita revisión humana antes de usar estas mediciones como apoyo.'}</small></div></div><div className="signal-grid" style={{marginTop:16}}><article className="signal-card"><span><Target size={16}/>Área útil</span><b>{result.roi.source==='tray'?'Bandeja detectada':'Encuadre general'}</b><small>{Math.round(result.roi.width)} × {Math.round(result.roi.height)} px</small></article><article className="signal-card"><span><Target size={16}/>Producto visible</span><b>{Math.round(result.usableRatio*100)}%</b><small>del área útil analizada</small></article><article className="signal-card"><span><Target size={16}/>Componentes</span><b>{result.retainedComponents}</b><small>masas de producto retenidas</small></article><article className="signal-card"><span><Target size={16}/>Huecos internos</span><b>{result.filledHolePixels}</b><small>celdas pequeñas reincorporadas</small></article><article className="signal-card"><span><Target size={16}/>Borde recuperado</span><b>{result.recoveredEdgePixels}</b><small>celdas compatibles recuperadas cerca del borde inferior</small></article><article className="signal-card"><span><Target size={16}/>Luminosidad L*</span><b>{fmt(result.metrics.lMean,1)}</b><small>medición visual derivada</small></article><article className="signal-card"><span><Target size={16}/>a*</span><b>{fmt(result.metrics.aMean,1)}</b><small>verde ↔ rojo</small></article><article className="signal-card"><span><Target size={16}/>b*</span><b>{fmt(result.metrics.labBMean,1)}</b><small>azul ↔ amarillo</small></article><article className="signal-card"><span><Target size={16}/>Borde residual</span><b>{Math.round(result.borderCandidateRatio*100)}%</b><small>producto tocando perímetro</small></article></div><p className="source-note">Scan v4.1. La cámara se procesa localmente en el navegador; esta prueba no persiste decisiones ni datos operacionales.</p></>:null}
 </section>
}

function drawToCanvas(source:CanvasImageSource,width:number,height:number){const maxWidth=1280,maxHeight=960,scale=Math.min(1,maxWidth/width,maxHeight/height),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw new Error('Canvas no disponible');context.drawImage(source,0,0,canvas.width,canvas.height);return canvas}
function readImage(file:File){return new Promise<HTMLImageElement>((resolve,reject)=>{const url=URL.createObjectURL(file),image=new Image();image.onload=()=>{URL.revokeObjectURL(url);resolve(image)};image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('No fue posible leer la imagen'))};image.src=url})}

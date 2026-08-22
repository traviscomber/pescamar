import {ImageUp,LoaderCircle,ScanLine} from "lucide-react";
import {useRef,useState,type ChangeEvent} from "react";
import type {ReceptionEvidence} from "../types";

type VisionFields={supplier:string|null;guideReference:string|null;zone:string|null;species:string|null;guide:number|null;gross:number|null;tare:number|null;drained:number|null;temperature:number|null;occurredAt:string|null;documentType:string|null;ocrText:string;confidence:number};
type Payload={ok?:boolean;evidence?:ReceptionEvidence;vision?:VisionFields|null;warning?:string;error?:string};

function readBase64(file:File){return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>{const result=String(reader.result??"");resolve(result.includes(",")?result.split(",",2)[1]:result)};reader.onerror=()=>reject(new Error("No fue posible leer la fotografía"));reader.readAsDataURL(file)})}

export function ReceptionVisionUpload({disabled,onEvidence,onExtract}:{disabled:boolean;onEvidence:(evidence:ReceptionEvidence)=>void;onExtract:(fields:VisionFields)=>void}){
  const inputRef=useRef<HTMLInputElement>(null);
  const [reading,setReading]=useState(false),[message,setMessage]=useState("");
  async function select(event:ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];event.target.value="";if(!file)return;
    setMessage("");
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)){setMessage("Usa una foto JPG, PNG o WebP");return}
    if(file.size>8*1024*1024){setMessage("La foto no puede superar 8 MB");return}
    setReading(true);
    try{
      const dataBase64=await readBase64(file);
      const response=await fetch("/api/reception-vision",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fileName:file.name,mimeType:file.type,dataBase64})});
      const payload=await response.json() as Payload;
      if(!response.ok||!payload.ok||!payload.evidence)throw new Error(payload.error??"No fue posible procesar la fotografía");
      onEvidence(payload.evidence);
      if(payload.vision){onExtract(payload.vision);const confidence=Math.round(Math.max(0,Math.min(1,payload.vision.confidence))*100);setMessage(`IA completó los datos visibles · confianza ${confidence}%`)}
      else setMessage(payload.warning??"Foto guardada como evidencia");
    }catch(cause){setMessage(cause instanceof Error?cause.message:"No fue posible procesar la fotografía")}
    finally{setReading(false)}
  }
  return <div className="vision-upload">
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={select} hidden/>
    <button type="button" className="vision-upload-button" onClick={()=>inputRef.current?.click()} disabled={disabled||reading}>
      <span className="vision-upload-icon">{reading?<LoaderCircle className="spin" size={20}/>:<ImageUp size={20}/>}</span>
      <span><b>{reading?"Leyendo documento…":"Subir foto y leer con IA"}</b><small>{reading?"Vision está extrayendo sólo los datos visibles":"Guía, comprobante o documento de recepción · JPG, PNG o WebP"}</small></span>
      <ScanLine size={18}/>
    </button>
    {message?<p className="vision-upload-status" aria-live="polite">{message}</p>:null}
  </div>
}

import {CheckCircle2,ImageUp,LoaderCircle,ScanLine} from "lucide-react";
import {useMemo,useRef,useState,type ChangeEvent} from "react";
import type {ReceptionEvidence} from "../types";

type VisionFields={supplier:string|null;guideReference:string|null;zone:string|null;species:string|null;guide:number|null;gross:number|null;tare:number|null;drained:number|null;temperature:number|null;occurredAt:string|null;documentType:string|null;ocrText:string;confidence:number};
type Payload={ok?:boolean;evidence?:ReceptionEvidence;vision?:VisionFields|null;warning?:string;error?:string};

function readBase64(file:Blob){return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>{const result=String(reader.result??"");resolve(result.includes(",")?result.split(",",2)[1]:result)};reader.onerror=()=>reject(new Error("No fue posible leer la fotografía"));reader.readAsDataURL(file)})}
async function optimize(file:File){
  const bitmap=await createImageBitmap(file);const maxSide=1800,scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height));
  if(scale===1&&file.size<=3*1024*1024){bitmap.close();return {blob:file,fileName:file.name,mimeType:file.type}}
  const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const context=canvas.getContext("2d");if(!context){bitmap.close();throw new Error("No fue posible preparar la fotografía")}
  context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const blob=await new Promise<Blob|null>((resolve)=>canvas.toBlob(resolve,"image/jpeg",.84));if(!blob)throw new Error("No fue posible optimizar la fotografía");
  const base=file.name.replace(/\.[^.]+$/,"");return {blob,fileName:`${base || "evidencia"}.jpg`,mimeType:"image/jpeg"}
}

const fieldSummary=(vision:VisionFields)=>[
  vision.supplier?`Proveedor: ${vision.supplier}`:null,
  vision.guideReference?`Guía: ${vision.guideReference}`:null,
  vision.zone?`Zona: ${vision.zone}`:null,
  vision.species?`Especie: ${vision.species}`:null,
  vision.guide!=null?`Peso guía: ${vision.guide} kg`:null,
  vision.gross!=null?`Bruto: ${vision.gross} kg`:null,
  vision.tare!=null?`Tara: ${vision.tare} kg`:null,
  vision.drained!=null?`Escurrido: ${vision.drained} kg`:null,
  vision.temperature!=null?`Temperatura: ${vision.temperature} °C`:null,
].filter((value):value is string=>Boolean(value));

export function ReceptionVisionUpload({disabled,onEvidence,onExtract}:{disabled:boolean;onEvidence:(evidence:ReceptionEvidence)=>void;onExtract:(fields:VisionFields)=>void}){
  const inputRef=useRef<HTMLInputElement>(null);
  const [reading,setReading]=useState(false),[message,setMessage]=useState("");
  const [proposal,setProposal]=useState<VisionFields|null>(null);
  const proposalFields=useMemo(()=>proposal?fieldSummary(proposal):[],[proposal]);
  async function select(event:ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];event.target.value="";if(!file)return;
    setMessage("");setProposal(null);
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)){setMessage("Usa una foto JPG, PNG o WebP");return}
    setReading(true);
    try{
      const prepared=await optimize(file);if(prepared.blob.size>3*1024*1024)throw new Error("La foto sigue siendo demasiado grande; prueba acercando el documento");
      const dataBase64=await readBase64(prepared.blob);
      const response=await fetch("/api/reception-vision",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fileName:prepared.fileName,mimeType:prepared.mimeType,dataBase64})});
      const payload=await response.json() as Payload;
      if(!response.ok||!payload.ok||!payload.evidence)throw new Error(payload.error??"No fue posible procesar la fotografía");
      onEvidence(payload.evidence);
      if(payload.vision){const confidence=Math.round(Math.max(0,Math.min(1,payload.vision.confidence))*100);setProposal(payload.vision);setMessage(`Datos visibles propuestos por IA · confianza ${confidence}% · confirma antes de aplicar`)}
      else setMessage(payload.warning??"Foto guardada como evidencia");
    }catch(cause){setMessage(cause instanceof Error?cause.message:"No fue posible procesar la fotografía")}
    finally{setReading(false)}
  }
  function applyProposal(){if(!proposal)return;onExtract(proposal);setMessage("Datos visibles aplicados. Revisa cualquier diferencia antes de registrar la recepción.");setProposal(null)}
  return <div className="vision-upload">
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={select} hidden/>
    <button type="button" className="vision-upload-button" onClick={()=>inputRef.current?.click()} disabled={disabled||reading}>
      <span className="vision-upload-icon">{reading?<LoaderCircle className="spin" size={20}/>:<ImageUp size={20}/>}</span>
      <span><b>{reading?"Leyendo documento…":"Subir foto y leer con IA"}</b><small>{reading?"Vision está extrayendo sólo los datos visibles":"Guía, comprobante o documento de recepción · la IA propone, una persona confirma"}</small></span>
      <ScanLine size={18}/>
    </button>
    {message?<p className="vision-upload-status" aria-live="polite">{message}</p>:null}
    {proposal?<section className="vision-proposal" aria-label="Datos propuestos por evidencia">
      <header><div><span className="overline teal">Propuesta desde evidencia</span><b>{proposal.documentType??"Documento de recepción"}</b></div><span>{Math.round(Math.max(0,Math.min(1,proposal.confidence))*100)}%</span></header>
      {proposalFields.length?<ul>{proposalFields.map(item=><li key={item}>{item}</li>)}</ul>:<p>No se detectaron campos operacionales confiables para aplicar.</p>}
      <div className="vision-proposal-actions"><button type="button" className="button primary" onClick={applyProposal} disabled={!proposalFields.length}><CheckCircle2 size={16}/>Aplicar datos visibles</button><button type="button" className="button secondary" onClick={()=>{setProposal(null);setMessage("Evidencia conservada. Los datos propuestos no se aplicaron.")}}>No aplicar</button></div>
      <small>La evidencia queda guardada en ambos casos. La propuesta no modifica el registro hasta que una persona la confirme.</small>
    </section>:null}
  </div>
}

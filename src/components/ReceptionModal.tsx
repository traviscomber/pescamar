import { FileCheck2, Link2, Scale, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useAuth } from "../auth";
import { plants } from "../plants";
import type { Lot, ReceptionEvidence, Species } from "../types";
import {useLot360} from "./Lot360Context";
import {ReceptionVisionUpload} from "./ReceptionVisionUpload";
import "./reception-evidence.css";

const speciesOptions:Species[]=["Erizo","Loco","Jaiba","Centolla","Pulpo","Pescado","Algas"];
const localDateTime=()=>{const now=new Date();now.setMinutes(now.getMinutes()-now.getTimezoneOffset());return now.toISOString().slice(0,16)};
const toLocalInput=(value:string)=>{const date=new Date(value);if(Number.isNaN(date.getTime()))return "";date.setMinutes(date.getMinutes()-date.getTimezoneOffset());return date.toISOString().slice(0,16)};
const clean=(value:string)=>value.trim().replace(/\s+/g," ");
const numeric=(value:string)=>{if(!value.trim())return null;const number=Number(value);return Number.isFinite(number)?number:null};
const displayKg=(value:number|null)=>value==null?"—":`${value.toFixed(1)} kg`;
const displayPct=(value:number|null)=>value==null?"—":`${value.toFixed(1)}%`;

export function ReceptionModal({open,onClose,onSave}:{open:boolean;onClose:()=>void;onSave:(lot:Lot)=>Promise<string>}) {
  const { operator } = useAuth();
  const {openLive}=useLot360();
  const accessiblePlants = useMemo(() => operator?.role === "admin" ? plants : plants.filter((plant) => operator?.plantIds.includes(plant.id)), [operator]);
  const [plantId,setPlantId]=useState("");
  const selectedPlantId=accessiblePlants.some((plant)=>plant.id===plantId)?plantId:(accessiblePlants[0]?.id??"");
  const [supplier,setSupplier]=useState(""),[zone,setZone]=useState(""),[guideReference,setGuideReference]=useState("");
  const [species,setSpecies]=useState<Species>("Erizo"),[occurredAt,setOccurredAt]=useState(localDateTime);
  const [guide,setGuide]=useState(""),[gross,setGross]=useState(""),[tare,setTare]=useState(""),[drained,setDrained]=useState(""),[temperature,setTemperature]=useState(""),[saving,setSaving]=useState(false),[error,setError]=useState("");
  const [evidence,setEvidence]=useState<ReceptionEvidence[]>([]);
  const [evidenceKind,setEvidenceKind]=useState<ReceptionEvidence["kind"]>("document");
  const [evidenceLabel,setEvidenceLabel]=useState(""),[evidenceUrl,setEvidenceUrl]=useState(""),[evidenceNote,setEvidenceNote]=useState("");
  const formRef=useRef<HTMLFormElement|null>(null),closeRef=useRef<HTMLButtonElement|null>(null),supplierRef=useRef<HTMLInputElement|null>(null),previousFocus=useRef<HTMLElement|null>(null),savingRef=useRef(false);
  const guideValue=numeric(guide),grossValue=numeric(gross),tareValue=numeric(tare),drainedValue=numeric(drained),temperatureValue=numeric(temperature);
  const accepted=drainedValue!=null&&tareValue!=null?Math.max(0,drainedValue-tareValue):null;
  const loss=useMemo(()=>grossValue!=null&&grossValue>0&&accepted!=null?((grossValue-accepted)/grossValue)*100:null,[grossValue,accepted]);
  const guideDifference=accepted!=null&&guideValue!=null?accepted-guideValue:null;

  useEffect(()=>{savingRef.current=saving},[saving]);
  useEffect(()=>{if(!open)return;setPlantId("");setSupplier("");setZone("");setGuideReference("");setSpecies("Erizo");setOccurredAt(localDateTime());setGuide("");setGross("");setTare("");setDrained("");setTemperature("");setEvidence([]);setEvidenceKind("document");setEvidenceLabel("");setEvidenceUrl("");setEvidenceNote("");setError("");setSaving(false)},[open]);
  useEffect(()=>{if(!open)return;previousFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;const previousOverflow=document.body.style.overflow;document.body.style.overflow="hidden";const frame=window.requestAnimationFrame(()=>supplierRef.current?.focus());const onKeyDown=(event:KeyboardEvent)=>{if(event.key==="Escape"&&!savingRef.current){event.preventDefault();onClose();return}if(event.key!=="Tab")return;const focusable=Array.from(formRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])')??[]).filter((element)=>element.offsetParent!==null);if(!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}};document.addEventListener("keydown",onKeyDown);return()=>{window.cancelAnimationFrame(frame);document.removeEventListener("keydown",onKeyDown);document.body.style.overflow=previousOverflow;const target=previousFocus.current;if(target&&document.contains(target))target.focus()}},[open,onClose]);

  if(!open)return null;
  function addEvidence(){setError("");if(evidence.length>=6){setError("Puedes registrar hasta seis evidencias por recepción");return}try{const parsed=new URL(evidenceUrl.trim());if(parsed.protocol!=="https:"||evidenceLabel.trim().length<2)throw new Error("invalid");setEvidence((current)=>[...current,{kind:evidenceKind,label:clean(evidenceLabel),url:parsed.toString(),note:clean(evidenceNote)}]);setEvidenceLabel("");setEvidenceUrl("");setEvidenceNote("")}catch{setError("La evidencia necesita un nombre y un enlace HTTPS válido")}}
  function applyVision(fields:{supplier:string|null;guideReference:string|null;zone:string|null;species:string|null;guide:number|null;gross:number|null;tare:number|null;drained:number|null;temperature:number|null;occurredAt:string|null}){
    if(fields.supplier)setSupplier(clean(fields.supplier));
    if(fields.guideReference)setGuideReference(clean(fields.guideReference));
    if(fields.zone)setZone(clean(fields.zone));
    if(fields.species&&speciesOptions.includes(fields.species as Species))setSpecies(fields.species as Species);
    if(Number.isFinite(fields.guide)&&Number(fields.guide)>0)setGuide(String(Number(fields.guide)));
    if(Number.isFinite(fields.gross)&&Number(fields.gross)>0)setGross(String(Number(fields.gross)));
    if(Number.isFinite(fields.tare)&&Number(fields.tare)>=0)setTare(String(Number(fields.tare)));
    if(Number.isFinite(fields.drained)&&Number(fields.drained)>=0)setDrained(String(Number(fields.drained)));
    if(Number.isFinite(fields.temperature)&&Number(fields.temperature)>=-5&&Number(fields.temperature)<=30)setTemperature(String(Number(fields.temperature)));
    if(fields.occurredAt){const local=toLocalInput(fields.occurredAt);if(local)setOccurredAt(local)}
  }
  function validate(){if(!selectedPlantId)return "Tu identidad no tiene una planta habilitada";if(clean(supplier).length<2)return "Ingresa un proveedor válido";if(clean(zone).length<2)return "Ingresa la zona de extracción";if(clean(guideReference).length<2)return "Ingresa el folio o referencia de la guía";const occurred=new Date(occurredAt);if(Number.isNaN(occurred.getTime())||occurred.getTime()>Date.now()+15*60*1000)return "La fecha/hora de recepción no es válida";if(guideValue==null||grossValue==null||tareValue==null||drainedValue==null||temperatureValue==null)return "Completa los pesos y la temperatura con valores reales";if(guideValue<=0||grossValue<=0)return "Los pesos de guía y bruto deben ser mayores a cero";if(tareValue<0||tareValue>grossValue)return "La tara no puede superar el peso bruto";if(drainedValue<0||drainedValue>grossValue)return "El peso escurrido debe estar entre 0 y el peso bruto";if(tareValue>drainedValue)return "La tara no puede superar el peso escurrido";if(temperatureValue< -5||temperatureValue>30)return "La temperatura está fuera del rango operativo admitido (-5 a 30 °C)";return ""}
  async function submit(event:FormEvent){event.preventDefault();setError("");const issue=validate();if(issue){setError(issue);return}const finalGuide=guideValue!,finalGross=grossValue!,finalTare=tareValue!,finalDrained=drainedValue!,finalTemperature=temperatureValue!,finalAccepted=accepted!,finalLoss=loss??0;setSaving(true);const normalizedSupplier=clean(supplier),initials=normalizedSupplier.split(" ").map((x)=>x[0]).slice(0,2).join("");const id=`ER-${Date.now()}`;try{const receptionId=await onSave({id,plantId:selectedPlantId,species,supplier:normalizedSupplier,initials,zone:clean(zone),guide:finalGuide,guideReference:clean(guideReference),gross:finalGross,tare:finalTare,drained:finalDrained,accepted:finalAccepted,loss:finalLoss,gonadYield:null,premiumYield:null,temperature:finalTemperature,status:"Muestreo",receivedAt:new Date(occurredAt).toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"}),occurredAt:new Date(occurredAt).toISOString(),evidenceCount:evidence.length,evidence});onClose();openLive(receptionId)}catch(cause){setError(cause instanceof Error?cause.message:"No fue posible crear la recepción")}finally{setSaving(false)}}
  return <div className="modal-backdrop" onMouseDown={(event)=>{if(event.target===event.currentTarget&&!saving)onClose()}}><form ref={formRef} className="modal-panel" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="reception-modal-title">
    <header><div><span className="overline teal">Inicio de operación viva</span><h2 id="reception-modal-title">Nueva recepción</h2><p>Este registro continúa la base canónica 2025 y crea la identidad 360 del lote.</p></div><button ref={closeRef} type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar" disabled={saving}><X size={19}/></button></header>
    <div className="step-indicator"><span className="active">1 <b>Recepción</b></span><i/><span>2 <b>Calidad</b></span><i/><span>3 <b>Producción</b></span></div>
    <div className="form-grid">
      <label>Planta<select value={selectedPlantId} onChange={(event)=>setPlantId(event.target.value)} required disabled={!accessiblePlants.length}>{!accessiblePlants.length?<option value="">Sin plantas asignadas</option>:null}{accessiblePlants.map((plant)=><option value={plant.id} key={plant.id}>{plant.name}</option>)}</select></label>
      <label>Fecha y hora de recepción<input type="datetime-local" value={occurredAt} max={localDateTime()} onChange={(event)=>setOccurredAt(event.target.value)} required/></label>
      <label>Proveedor<input ref={supplierRef} required value={supplier} onChange={(event)=>setSupplier(event.target.value)} placeholder="Nombre o razón social" maxLength={180}/></label>
      <label>Folio / referencia guía<input required value={guideReference} onChange={(event)=>setGuideReference(event.target.value)} placeholder="Ej. GD-10482" maxLength={120}/></label>
      <label>Zona de extracción<input required value={zone} onChange={(event)=>setZone(event.target.value)} placeholder="Zona declarada" maxLength={180}/></label>
      <label>Especie<select value={species} onChange={(event)=>setSpecies(event.target.value as Species)}>{speciesOptions.map((item)=><option value={item} key={item}>{item}</option>)}</select></label>
      <label>Peso guía (kg)<div className="input-icon"><Scale size={16}/><input type="number" inputMode="decimal" min="0.1" step=".1" value={guide} onChange={(event)=>setGuide(event.target.value)} placeholder="0,0" required/></div></label>
      <label>Peso bruto (kg)<div className="input-icon"><Scale size={16}/><input type="number" inputMode="decimal" min="0.1" step=".1" value={gross} onChange={(event)=>setGross(event.target.value)} placeholder="0,0" required/></div></label>
      <label>Tara (kg)<input type="number" inputMode="decimal" min="0" step=".1" value={tare} onChange={(event)=>setTare(event.target.value)} placeholder="0,0" required/></label>
      <label>Peso después de escurrido (kg)<input type="number" inputMode="decimal" min="0" step=".1" value={drained} onChange={(event)=>setDrained(event.target.value)} placeholder="0,0" required/></label>
      <label>Temperatura (°C)<input type="number" inputMode="decimal" min="-5" max="30" step=".1" value={temperature} onChange={(event)=>setTemperature(event.target.value)} placeholder="0,0" required/></label>
    </div>
    <section className="reception-evidence-panel"><header><div><span className="overline teal">Respaldo documental</span><h3>Evidencia de recepción</h3></div><span>{evidence.length}/6</span></header>
      <ReceptionVisionUpload disabled={saving||evidence.length>=6} onEvidence={(item)=>setEvidence((current)=>current.length>=6?current:[...current,item])} onExtract={applyVision}/>
      <details className="manual-evidence"><summary>Agregar enlace manual</summary><div className="evidence-input-grid">
        <label>Tipo<select value={evidenceKind} onChange={(event)=>setEvidenceKind(event.target.value as ReceptionEvidence["kind"])}><option value="document">Documento</option><option value="photo">Fotografía</option><option value="certificate">Certificado</option><option value="other">Otro</option></select></label>
        <label>Nombre<input value={evidenceLabel} onChange={(event)=>setEvidenceLabel(event.target.value)} placeholder="Ej. guía de despacho"/></label>
        <label className="evidence-url-field">Enlace HTTPS<div className="input-icon"><Link2 size={16}/><input type="url" value={evidenceUrl} onChange={(event)=>setEvidenceUrl(event.target.value)} placeholder="https://…"/></div></label>
        <label className="evidence-note-field">Nota opcional<input value={evidenceNote} onChange={(event)=>setEvidenceNote(event.target.value)} placeholder="Referencia, folio o contexto" maxLength={500}/></label>
        <button type="button" className="button secondary evidence-add" onClick={addEvidence} disabled={!evidenceLabel.trim()||!evidenceUrl.trim()}><FileCheck2 size={16}/>Agregar evidencia</button>
      </div></details>
      {evidence.length?<div className="evidence-list">{evidence.map((item,index)=><article key={`${item.url}-${index}`}><FileCheck2 size={17}/><div><b>{item.label}</b><small>{item.note||item.url}</small></div><button type="button" className="icon-btn" aria-label={`Quitar ${item.label}`} onClick={()=>setEvidence((current)=>current.filter((_,itemIndex)=>itemIndex!==index))}><Trash2 size={15}/></button></article>)}</div>:<p className="evidence-empty">Sube una foto para que Vision lea la guía y complete los datos visibles. También puedes seguir sin evidencia.</p>}</section>
    <div className="calculation-strip"><div><small>Peso neto aceptado inicial</small><b>{displayKg(accepted)}</b></div><div><small>Merma inicial calculada</small><b className={loss!=null&&loss>18?"negative":""}>{displayPct(loss)}</b></div><div><small>Diferencia sobre guía</small><b className={guideDifference!=null&&guideDifference<0?"negative":""}>{displayKg(guideDifference)}</b></div><div><small>Siguiente paso</small><b>Control de calidad</b></div></div>
    {error?<p className="form-error" role="alert">{error}</p>:null}<footer><button type="button" className="button secondary" onClick={onClose} disabled={saving}>Cancelar</button><button className="button primary" type="submit" disabled={saving||!selectedPlantId}>{saving?"Guardando recepción…":"Crear recepción y abrir Ficha 360"}</button></footer>
  </form></div>
}

import { FileCheck2, Link2, Scale, Trash2, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../auth";
import { plants } from "../plants";
import type { Lot, ReceptionEvidence, Species } from "../types";
import {useLot360} from "./Lot360Context";
import "./reception-evidence.css";

const localDateTime=()=>{const now=new Date();now.setMinutes(now.getMinutes()-now.getTimezoneOffset());return now.toISOString().slice(0,16)};
const clean=(value:string)=>value.trim().replace(/\s+/g," ");

export function ReceptionModal({open,onClose,onSave}:{open:boolean;onClose:()=>void;onSave:(lot:Lot)=>Promise<string>}) {
  const { operator } = useAuth();
  const {openLive}=useLot360();
  const accessiblePlants = useMemo(() => operator?.role === "admin" ? plants : plants.filter((plant) => operator?.plantIds.includes(plant.id)), [operator]);
  const [plantId,setPlantId]=useState("");
  const selectedPlantId=accessiblePlants.some((plant)=>plant.id===plantId)?plantId:(accessiblePlants[0]?.id??"");
  const [supplier,setSupplier]=useState(""),[zone,setZone]=useState(""),[guideReference,setGuideReference]=useState("");
  const [species,setSpecies]=useState<Species>("Erizo"),[occurredAt,setOccurredAt]=useState(localDateTime);
  const [guide,setGuide]=useState(100),[gross,setGross]=useState(100),[tare,setTare]=useState(6),[drained,setDrained]=useState(87),[temperature,setTemperature]=useState(4.2),[saving,setSaving]=useState(false),[error,setError]=useState("");
  const [evidence,setEvidence]=useState<ReceptionEvidence[]>([]);
  const [evidenceKind,setEvidenceKind]=useState<ReceptionEvidence["kind"]>("document");
  const [evidenceLabel,setEvidenceLabel]=useState(""),[evidenceUrl,setEvidenceUrl]=useState(""),[evidenceNote,setEvidenceNote]=useState("");
  const accepted=Math.max(0,drained-tare),loss=useMemo(()=>(gross?((gross-accepted)/gross)*100:0),[gross,accepted]);
  if(!open)return null;
  function addEvidence(){setError("");if(evidence.length>=6){setError("Puedes registrar hasta seis evidencias por recepción");return}try{const parsed=new URL(evidenceUrl.trim());if(parsed.protocol!=="https:"||evidenceLabel.trim().length<2)throw new Error("invalid");setEvidence((current)=>[...current,{kind:evidenceKind,label:clean(evidenceLabel),url:parsed.toString(),note:clean(evidenceNote)}]);setEvidenceLabel("");setEvidenceUrl("");setEvidenceNote("")}catch{setError("La evidencia necesita un nombre y un enlace HTTPS válido")}}
  function validate(){if(!selectedPlantId)return "Tu identidad no tiene una planta habilitada";if(clean(supplier).length<2)return "Ingresa un proveedor válido";if(clean(zone).length<2)return "Ingresa la zona de extracción";if(clean(guideReference).length<2)return "Ingresa el folio o referencia de la guía";const occurred=new Date(occurredAt);if(Number.isNaN(occurred.getTime())||occurred.getTime()>Date.now()+15*60*1000)return "La fecha/hora de recepción no es válida";if(guide<=0||gross<=0)return "Los pesos de guía y bruto deben ser mayores a cero";if(tare<0||tare>gross)return "La tara no puede superar el peso bruto";if(drained<0||drained>gross)return "El peso escurrido debe estar entre 0 y el peso bruto";if(tare>drained)return "La tara no puede superar el peso escurrido";if(temperature< -5||temperature>30)return "La temperatura está fuera del rango operativo admitido (-5 a 30 °C)";return ""}
  async function submit(event:FormEvent){event.preventDefault();setError("");const issue=validate();if(issue){setError(issue);return}setSaving(true);const normalizedSupplier=clean(supplier),initials=normalizedSupplier.split(" ").map((x)=>x[0]).slice(0,2).join("");const id=`ER-${Date.now()}`;try{const receptionId=await onSave({id,plantId:selectedPlantId,species,supplier:normalizedSupplier,initials,zone:clean(zone),guide,guideReference:clean(guideReference),gross,tare,drained,accepted,loss,gonadYield:null,premiumYield:null,temperature,status:"Muestreo",receivedAt:new Date(occurredAt).toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"}),occurredAt:new Date(occurredAt).toISOString(),evidenceCount:evidence.length,evidence});onClose();openLive(receptionId)}catch(cause){setError(cause instanceof Error?cause.message:"No fue posible crear la recepción")}finally{setSaving(false)}}
  return <div className="modal-backdrop" onMouseDown={(event)=>{if(event.target===event.currentTarget&&!saving)onClose()}}><form className="modal-panel" onSubmit={submit}>
    <header><div><span className="overline teal">Inicio de operación viva</span><h2>Nueva recepción</h2><p>Este registro continúa la base canónica 2025 y crea la identidad 360 del lote.</p></div><button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar" disabled={saving}><X size={19}/></button></header>
    <div className="step-indicator"><span className="active">1 <b>Recepción</b></span><i/><span>2 <b>Calidad</b></span><i/><span>3 <b>Producción</b></span></div>
    <div className="form-grid">
      <label>Planta<select value={selectedPlantId} onChange={(event)=>setPlantId(event.target.value)} required disabled={!accessiblePlants.length}>{!accessiblePlants.length?<option value="">Sin plantas asignadas</option>:null}{accessiblePlants.map((plant)=><option value={plant.id} key={plant.id}>{plant.name}</option>)}</select></label>
      <label>Fecha y hora de recepción<input type="datetime-local" value={occurredAt} max={localDateTime()} onChange={(event)=>setOccurredAt(event.target.value)} required/></label>
      <label>Proveedor<input required value={supplier} onChange={(event)=>setSupplier(event.target.value)} placeholder="Nombre o razón social" maxLength={180}/></label>
      <label>Folio / referencia guía<input required value={guideReference} onChange={(event)=>setGuideReference(event.target.value)} placeholder="Ej. GD-10482" maxLength={120}/></label>
      <label>Zona de extracción<input required value={zone} onChange={(event)=>setZone(event.target.value)} placeholder="Zona declarada" maxLength={180}/></label>
      <label>Especie<select value={species} onChange={(event)=>setSpecies(event.target.value as Species)}>{(["Erizo","Loco","Jaiba","Centolla","Pulpo","Pescado","Algas"] as Species[]).map((item)=><option value={item} key={item}>{item}</option>)}</select></label>
      <label>Peso guía (kg)<div className="input-icon"><Scale size={16}/><input type="number" min="0.1" step=".1" value={guide} onChange={(event)=>setGuide(+event.target.value)} required/></div></label>
      <label>Peso bruto (kg)<div className="input-icon"><Scale size={16}/><input type="number" min="0.1" step=".1" value={gross} onChange={(event)=>setGross(+event.target.value)} required/></div></label>
      <label>Tara (kg)<input type="number" min="0" step=".1" value={tare} onChange={(event)=>setTare(+event.target.value)} required/></label>
      <label>Peso después de escurrido (kg)<input type="number" min="0" step=".1" value={drained} onChange={(event)=>setDrained(+event.target.value)} required/></label>
      <label>Temperatura (°C)<input type="number" min="-5" max="30" step=".1" value={temperature} onChange={(event)=>setTemperature(+event.target.value)} required/></label>
    </div>
    <section className="reception-evidence-panel"><header><div><span className="overline teal">Respaldo documental</span><h3>Evidencia de recepción</h3></div><span>{evidence.length}/6</span></header><div className="evidence-input-grid">
      <label>Tipo<select value={evidenceKind} onChange={(event)=>setEvidenceKind(event.target.value as ReceptionEvidence["kind"])}><option value="document">Documento</option><option value="photo">Fotografía</option><option value="certificate">Certificado</option><option value="other">Otro</option></select></label>
      <label>Nombre<input value={evidenceLabel} onChange={(event)=>setEvidenceLabel(event.target.value)} placeholder="Ej. guía de despacho"/></label>
      <label className="evidence-url-field">Enlace HTTPS<div className="input-icon"><Link2 size={16}/><input type="url" value={evidenceUrl} onChange={(event)=>setEvidenceUrl(event.target.value)} placeholder="https://…"/></div></label>
      <label className="evidence-note-field">Nota opcional<input value={evidenceNote} onChange={(event)=>setEvidenceNote(event.target.value)} placeholder="Referencia, folio o contexto" maxLength={500}/></label>
      <button type="button" className="button secondary evidence-add" onClick={addEvidence} disabled={!evidenceLabel.trim()||!evidenceUrl.trim()}><FileCheck2 size={16}/>Agregar evidencia</button>
    </div>{evidence.length?<div className="evidence-list">{evidence.map((item,index)=><article key={`${item.url}-${index}`}><FileCheck2 size={17}/><div><b>{item.label}</b><small>{item.url}</small></div><button type="button" className="icon-btn" aria-label={`Quitar ${item.label}`} onClick={()=>setEvidence((current)=>current.filter((_,itemIndex)=>itemIndex!==index))}><Trash2 size={15}/></button></article>)}</div>:<p className="evidence-empty">La referencia de guía queda registrada aunque no adjuntes evidencia externa. Los enlaces son respaldo adicional.</p>}</section>
    <div className="calculation-strip"><div><small>Peso neto aceptado inicial</small><b>{accepted.toFixed(1)} kg</b></div><div><small>Merma inicial calculada</small><b className={loss>18?"negative":""}>{loss.toFixed(1)}%</b></div><div><small>Diferencia sobre guía</small><b className={accepted<guide?"negative":""}>{(accepted-guide).toFixed(1)} kg</b></div><div><small>Siguiente paso</small><b>Control de calidad</b></div></div>
    {error?<p className="form-error" role="alert">{error}</p>:null}<footer><button type="button" className="button secondary" onClick={onClose} disabled={saving}>Cancelar</button><button className="button primary" type="submit" disabled={saving||!selectedPlantId}>{saving?"Guardando recepción…":"Crear recepción y abrir Ficha 360"}</button></footer>
  </form></div>
}

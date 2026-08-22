import { ArrowRight, CheckCircle2, Factory, Plus, Settings2, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { PageHeader } from "../components/PageHeader";
import type { ProductionLine } from "../types";

type ApiResponse = { ok?: boolean; lines?: ProductionLine[]; line?: ProductionLine; error?: string };
const emptyLine: ProductionLine = { id:"", name:"", family:"", formats:[], route:[], yieldTarget:"", destination:"", status:"Configurar" };

export function ProductionLines() {
  const [lines,setLines]=useState<ProductionLine[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
  const [editing,setEditing]=useState<ProductionLine|null>(null);
  useEffect(()=>{fetch("/api/production-lines",{cache:"no-store"}).then(async response=>{const payload=await response.json() as ApiResponse;if(!response.ok)throw new Error(payload.error??"No fue posible cargar las líneas");setLines(payload.lines??[])}).catch(cause=>setError(cause instanceof Error?cause.message:"No fue posible cargar las líneas")).finally(()=>setLoading(false))},[]);
  const saved=(line:ProductionLine)=>{setLines(current=>[...current.filter(item=>item.id!==line.id),line].sort((a,b)=>a.name.localeCompare(b.name,"es")));setEditing(null);setError("")};
  return <>
    <PageHeader eyebrow="Motor productivo" title="Líneas de producción" description="Una vista ejecutiva de las rutas vigentes. Abre una línea para revisar o modificar su configuración." actions={<button className="button primary" onClick={()=>setEditing(emptyLine)}><Plus size={16}/>Nueva línea</button>}/>
    {loading?<div className="system-banner">Cargando configuración productiva…</div>:null}
    {error?<div className="system-banner error" role="alert">{error}</div>:null}
    {!loading&&!lines.length&&!error?<section className="panel empty-state"><Factory size={32}/><h2>Sin líneas configuradas</h2><p>Crea la primera ruta productiva para comenzar.</p><button className="button primary" onClick={()=>setEditing(emptyLine)}><Plus size={16}/>Nueva línea</button></section>:null}
    <section className="production-line-list">{lines.map(line=><LineCard line={line} key={line.id} onEdit={()=>setEditing(line)}/>)}</section>
    {editing?<LineEditor line={editing} onClose={()=>setEditing(null)} onSaved={saved}/>:null}
  </>;
}

function LineCard({line,onEdit}:{line:ProductionLine;onEdit:()=>void}) {
  const [open,setOpen]=useState(false);
  return <article className={`panel production-line-card ${open?"is-open":""}`}>
    <button className="line-summary" type="button" onClick={()=>setOpen(value=>!value)} aria-expanded={open}>
      <span className="line-icon"><Factory size={20}/></span>
      <span className="line-identity"><small>{line.id} · {line.family}</small><b>{line.name}</b></span>
      <span className="line-market"><small>Mercado</small><b>{line.destination}</b></span>
      <span className="line-count"><small>Etapas</small><b>{line.route.length}</b></span>
      <span className={`status ${line.status==="Activa"?"success":"info"}`}>{line.status}</span>
      <ArrowRight className="line-chevron" size={18}/>
    </button>
    {open?<div className="line-detail">
      <ol className="line-route">{line.route.map((step,index)=><li key={`${step}-${index}`}><span>{String(index+1).padStart(2,"0")}</span><b>{step}</b></li>)}</ol>
      <dl className="line-specs readable"><div><dt>Formatos</dt><dd>{line.formats.join(" · ")}</dd></div><div><dt>Rendimiento</dt><dd>{line.yieldTarget}</dd></div><div><dt>Mercado</dt><dd>{line.destination}</dd></div></dl>
      <footer><span><CheckCircle2 size={16}/>Trazabilidad y balance de masa incluidos</span><button className="button secondary" onClick={onEdit}><Settings2 size={15}/>Configurar</button></footer>
    </div>:null}
  </article>;
}

function LineEditor({line,onClose,onSaved}:{line:ProductionLine;onClose:()=>void;onSaved:(line:ProductionLine)=>void}) {
  const [name,setName]=useState(line.name),[family,setFamily]=useState(line.family),[destination,setDestination]=useState(line.destination),[yieldTarget,setYieldTarget]=useState(line.yieldTarget),[formats,setFormats]=useState(line.formats.join(", ")),[route,setRoute]=useState(line.route.join(", ")),[status,setStatus]=useState<ProductionLine["status"]>(line.status),[token,setToken]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const submit=async(event:FormEvent)=>{event.preventDefault();setBusy(true);setError("");try{const response=await fetch("/api/production-lines",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({id:line.id,name,family,destination,yieldTarget,formats:split(formats),route:split(route),status})});const payload=await response.json() as ApiResponse;if(!response.ok||!payload.line)throw new Error(payload.error??"No fue posible guardar la línea");onSaved(payload.line)}catch(cause){setError(cause instanceof Error?cause.message:"No fue posible guardar la línea")}finally{setBusy(false)}};
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="line-editor-title"><form className="modal-panel line-editor" onSubmit={submit}><header><div><span className="overline teal">Configuración compartida</span><h2 id="line-editor-title">{line.id?`Configurar ${line.name}`:"Nueva línea productiva"}</h2><p>Los cambios quedarán disponibles para toda la operación.</p></div><button className="icon-btn" type="button" onClick={onClose} aria-label="Cerrar"><X size={19}/></button></header><div className="line-editor-grid"><label>Nombre<input value={name} onChange={e=>setName(e.target.value)} required maxLength={80}/></label><label>Familia o especies<input value={family} onChange={e=>setFamily(e.target.value)} required maxLength={140}/></label><label>Mercado de destino<input value={destination} onChange={e=>setDestination(e.target.value)} required maxLength={100}/></label><label>Control de rendimiento<input value={yieldTarget} onChange={e=>setYieldTarget(e.target.value)} required maxLength={120}/></label><label className="wide">Formatos <small>Separados por coma</small><input value={formats} onChange={e=>setFormats(e.target.value)} required/></label><label className="wide">Etapas del proceso <small>En orden, separadas por coma</small><textarea value={route} onChange={e=>setRoute(e.target.value)} required rows={3}/></label><label>Estado<select value={status} onChange={e=>setStatus(e.target.value as ProductionLine["status"])}><option>Activa</option><option>Configurar</option></select></label><label>Clave administrativa<input type="password" value={token} onChange={e=>setToken(e.target.value)} required autoComplete="off"/></label></div>{error?<p className="form-error" role="alert">{error}</p>:null}<footer><button className="button secondary" type="button" onClick={onClose}>Cancelar</button><button className="button primary" disabled={busy}>{busy?"Guardando…":"Guardar línea"}</button></footer></form></div>;
}

const split=(value:string)=>value.split(",").map(item=>item.trim()).filter(Boolean);

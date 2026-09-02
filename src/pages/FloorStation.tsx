import {useMemo,useState} from "react";
import {PackagePlus,Scale,ScanLine,ShieldCheck,Wifi} from "lucide-react";
import {PageHeader} from "../components/PageHeader";
import {useAuth} from "../auth";
import {useLots} from "../store";
import "../floor.css";

export function FloorStation(){
 const {operator}=useAuth();
 const {lots,loading,error}=useLots();
 const scopedLots=useMemo(()=>operator?.role==="admin"?lots:lots.filter(lot=>operator?.plantIds.includes(lot.plantId)),[lots,operator]);
 const plantIds=useMemo(()=>[...new Set(scopedLots.map(lot=>lot.plantId))],[scopedLots]);
 const [plantId,setPlantId]=useState("");
 const [lotId,setLotId]=useState("");
 const [weight,setWeight]=useState("");
 const [scanCode,setScanCode]=useState("");
 const [scanFeedback,setScanFeedback]=useState<{kind:"ok"|"error";message:string}|null>(null);
 const effectivePlant=plantId||plantIds[0]||"";
 const plantLots=scopedLots.filter(lot=>lot.plantId===effectivePlant);
 const selected=plantLots.find(lot=>lot.receptionId===lotId)||plantLots[0];
 const normalizedWeight=Number(weight.replace(",","."));
 const validWeight=Number.isFinite(normalizedWeight)&&normalizedWeight>0;
 const applyScan=()=>{
  const code=scanCode.trim().toLowerCase();
  if(!code)return;
  const match=scopedLots.find(lot=>[lot.id,lot.receptionId].some(value=>String(value).trim().toLowerCase()===code));
  if(!match?.plantId||!match.receptionId){setScanFeedback({kind:"error",message:"Código no corresponde a un lote autorizado"});return;}
  setPlantId(match.plantId);setLotId(match.receptionId);setWeight("");setScanCode("");setScanFeedback({kind:"ok",message:`Lote ${match.id} seleccionado`});
 };
 return <>
  <PageHeader eyebrow="Plant Execution · Fundación" title="Estación de planta" description="Superficie operacional táctil conectada al lote real. Este primer incremento es deliberadamente read-only hasta recuperar aislamiento seguro de previews Neon."/>
  {loading?<div className="system-banner">Sincronizando lotes autorizados…</div>:null}
  {error?<div className="system-banner error" role="alert">{error}</div>:null}
  <section className="floor-status-strip" aria-label="Estado de estación">
   <div><Wifi size={18}/><span><b>Aplicación conectada</b><small>Lectura del core activa</small></span></div>
   <div><ScanLine size={18}/><span><b>Scanner</b><small>USB HID / teclado listo</small></span></div>
   <div><Scale size={18}/><span><b>Balanza</b><small>Adapter pendiente</small></span></div>
   <div><ShieldCheck size={18}/><span><b>Modo seguro</b><small>Sin escrituras DB</small></span></div>
  </section>
  <section className="floor-console" aria-label="Consola de operación">
   <div className="floor-controls">
    <label>Scanner HID<input aria-label="Scanner HID" autoFocus autoComplete="off" spellCheck={false} placeholder="Escanee lote + Enter" value={scanCode} onChange={event=>{setScanCode(event.target.value);setScanFeedback(null)}} onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();applyScan()}}}/></label>
    {scanFeedback?<p className={`floor-scan-feedback ${scanFeedback.kind}`} role={scanFeedback.kind==="error"?"alert":"status"}>{scanFeedback.message}</p>:null}
    <label>Planta<select value={effectivePlant} onChange={event=>{setPlantId(event.target.value);setLotId("");setScanFeedback(null)}} disabled={!plantIds.length}>{plantIds.map(id=><option key={id} value={id}>{id}</option>)}</select></label>
    <label>Lote<select value={selected?.receptionId??""} onChange={event=>{setLotId(event.target.value);setScanFeedback(null)}} disabled={!plantLots.length}>{plantLots.map(lot=><option key={lot.receptionId} value={lot.receptionId}>{lot.id} · {lot.species} · {lot.supplier}</option>)}</select></label>
   </div>
   {selected?<div className="floor-active-lot">
    <div className="floor-lot-heading"><span>Lote activo</span><strong>{selected.id}</strong><small>{selected.species} · {selected.supplier}</small></div>
    <dl className="floor-lot-metrics"><div><dt>Planta</dt><dd>{selected.plantId}</dd></div><div><dt>Guía</dt><dd>{selected.guide.toLocaleString("es-CL")} kg</dd></div><div><dt>Aceptado</dt><dd>{selected.accepted.toLocaleString("es-CL")} kg</dd></div><div><dt>Calidad</dt><dd>{selected.status}</dd></div></dl>
    <div className="floor-weight-panel">
     <label htmlFor="floor-weight">Peso de estación</label>
     <div className="floor-weight-input"><input id="floor-weight" inputMode="decimal" placeholder="0,00" value={weight} onChange={event=>setWeight(event.target.value)} aria-describedby="floor-weight-note"/><span>kg</span></div>
     <p id="floor-weight-note">Entrada local para validar UX. No crea packing, movimiento ni evento persistente.</p>
     <button className="floor-confirm" type="button" disabled={!validWeight} title="Se habilitará al recuperar previews DB aislados"><PackagePlus size={22}/>Preparar packing unit<span>Persistencia bloqueada por gate #68</span></button>
    </div>
   </div>:<div className="floor-empty"><Scale size={30}/><h2>Sin lotes disponibles</h2><p>La estación sólo muestra recepciones reales dentro del alcance de planta del operador.</p></div>}
  </section>
  <section className="floor-next-gate panel"><div><span className="overline">Siguiente gate</span><h2>Activar escritura aislada</h2><p>Cuando Neon vuelva a crear previews independientes, el mismo flujo pasará de lectura a `device_event → packing_unit`, con idempotencia y auditoría.</p></div><span className="status-pill warning">Bloqueado por #68</span></section>
 </>;
}

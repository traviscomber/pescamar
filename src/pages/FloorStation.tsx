import {useCallback,useEffect,useMemo,useState} from "react";
import {CloudOff,PackagePlus,Scale,ScanLine,ShieldCheck,Wifi} from "lucide-react";
import {PageHeader} from "../components/PageHeader";
import {useAuth} from "../auth";
import {useLots} from "../store";
import {listFloorQueue,markFloorQueueAttempt,pendingFloorQueueCount,queueFloorPacking,removeFloorQueue,type FloorPackingRequest} from "../floorQueue";
import "../floor.css";

type PlantExecutionStatus={ok?:boolean;writesEnabled?:boolean;mode?:string;error?:string};
type PlantStation={id:string;plant_id:string;code:string;name:string;station_type:string;active:boolean};
type StationPayload={ok?:boolean;stations?:PlantStation[];error?:string};
type PackingPayload={ok?:boolean;idempotent?:boolean;packingUnit?:{id?:string;packing_unit_code?:string};code?:string;error?:string};
type Feedback={kind:"ok"|"error"|"pending";message:string};

const jsonHeaders={"Content-Type":"application/json"};
const floorStationType=(type:string)=>type==="floor"||type==="packing";
const newPackingRequest=(stationId:string,receptionId:string,plantId:string,netKg:number):FloorPackingRequest=>{
 const token=crypto.randomUUID();
 return {action:"createPackingUnit",stationId,receptionId,packingUnitCode:`PK-${plantId.toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${token.slice(0,8).toUpperCase()}`,idempotencyKey:`floor:${plantId}:${token}`,netKg,occurredAt:new Date().toISOString()};
};

export function FloorStation(){
 const {operator}=useAuth();
 const {lots,loading,error}=useLots();
 const scopedLots=useMemo(()=>operator?.role==="admin"?lots:lots.filter(lot=>operator?.plantIds.includes(lot.plantId)),[lots,operator]);
 const plantIds=useMemo(()=>[...new Set(scopedLots.map(lot=>lot.plantId).filter((id):id is string=>Boolean(id)))],[scopedLots]);
 const [plantId,setPlantId]=useState("");
 const [lotId,setLotId]=useState("");
 const [stationId,setStationId]=useState("");
 const [weight,setWeight]=useState("");
 const [scanCode,setScanCode]=useState("");
 const [scanFeedback,setScanFeedback]=useState<{kind:"ok"|"error";message:string}|null>(null);
 const [writesEnabled,setWritesEnabled]=useState<boolean|null>(null);
 const [stations,setStations]=useState<PlantStation[]>([]);
 const [stationError,setStationError]=useState("");
 const [feedback,setFeedback]=useState<Feedback|null>(null);
 const [saving,setSaving]=useState(false);
 const [pendingCount,setPendingCount]=useState(0);
 const [online,setOnline]=useState(()=>navigator.onLine);
 const effectivePlant=plantId||plantIds[0]||"";
 const plantLots=scopedLots.filter(lot=>lot.plantId===effectivePlant);
 const selected=plantLots.find(lot=>lot.receptionId===lotId)||plantLots[0];
 const plantStations=stations.filter(station=>station.active&&station.plant_id===effectivePlant&&floorStationType(station.station_type));
 const selectedStation=plantStations.find(station=>station.id===stationId)||plantStations[0];
 const normalizedWeight=Number(weight.replace(",","."));
 const validWeight=Number.isFinite(normalizedWeight)&&normalizedWeight>0;

 const refreshQueueCount=useCallback(async()=>{try{setPendingCount(await pendingFloorQueueCount())}catch{setPendingCount(0)}},[]);

 useEffect(()=>{
  let active=true;
  fetch("/api/plant-execution").then(async response=>({response,payload:await response.json() as PlantExecutionStatus})).then(({response,payload})=>{if(!active)return;if(!response.ok)throw new Error(payload.error??"No fue posible verificar Plant Execution");setWritesEnabled(payload.writesEnabled===true)}).catch(()=>{if(active)setWritesEnabled(false)});
  return()=>{active=false};
 },[]);

 useEffect(()=>{
  if(writesEnabled!==true){setStations([]);setStationError("");return}
  let active=true;
  fetch("/api/plant-stations").then(async response=>({response,payload:await response.json() as StationPayload})).then(({response,payload})=>{if(!active)return;if(!response.ok)throw new Error(payload.error??"No fue posible cargar estaciones");setStations(payload.stations??[]);setStationError("")}).catch(cause=>{if(active){setStations([]);setStationError(cause instanceof Error?cause.message:"No fue posible cargar estaciones")}});
  return()=>{active=false};
 },[writesEnabled]);

 const replayQueue=useCallback(async()=>{
  if(writesEnabled!==true||!navigator.onLine)return;
  let synced=0;
  try{
   const rows=await listFloorQueue();
   for(const row of rows){
    if(row.status!=="pending")continue;
    try{
     const response=await fetch("/api/plant-execution",{method:"POST",headers:jsonHeaders,body:JSON.stringify(row.request)});
     const payload=await response.json() as PackingPayload;
     if(response.ok){await removeFloorQueue(row.id);synced++;continue}
     if(response.status===503&&payload.code==="PLANT_EXECUTION_WRITES_DISABLED")break;
     await markFloorQueueAttempt(row.id,payload.error??`HTTP ${response.status}`,response.status>=400&&response.status<500);
     if(response.status>=400&&response.status<500)continue;
     break;
    }catch(cause){await markFloorQueueAttempt(row.id,cause instanceof Error?cause.message:"Sin conectividad");break}
   }
  }finally{
   await refreshQueueCount();
   if(synced>0)setFeedback({kind:"ok",message:`${synced} operación${synced===1?"":"es"} pendiente${synced===1?"":"s"} sincronizada${synced===1?"":"s"}`});
  }
 },[refreshQueueCount,writesEnabled]);

 useEffect(()=>{void refreshQueueCount()},[refreshQueueCount]);
 useEffect(()=>{
  const onOnline=()=>{setOnline(true);void replayQueue()};
  const onOffline=()=>setOnline(false);
  window.addEventListener("online",onOnline);window.addEventListener("offline",onOffline);
  return()=>{window.removeEventListener("online",onOnline);window.removeEventListener("offline",onOffline)};
 },[replayQueue]);
 useEffect(()=>{if(writesEnabled===true&&online)void replayQueue()},[online,replayQueue,writesEnabled]);

 const applyScan=()=>{
  const code=scanCode.trim().toLowerCase();
  if(!code)return;
  const match=scopedLots.find(lot=>[lot.id,lot.receptionId].some(value=>String(value).trim().toLowerCase()===code));
  if(!match?.plantId||!match.receptionId){setScanFeedback({kind:"error",message:"Código no corresponde a un lote autorizado"});return;}
  setPlantId(match.plantId);setLotId(match.receptionId);setStationId("");setWeight("");setScanCode("");setFeedback(null);setScanFeedback({kind:"ok",message:`Lote ${match.id} seleccionado`});
 };

 const submitPacking=async()=>{
  if(writesEnabled!==true||!selected?.receptionId||!selectedStation||!validWeight||saving)return;
  const request=newPackingRequest(selectedStation.id,selected.receptionId,effectivePlant,normalizedWeight);
  setSaving(true);setFeedback(null);
  try{
   if(!navigator.onLine){await queueFloorPacking(request);await refreshQueueCount();setFeedback({kind:"pending",message:`${request.packingUnitCode} quedó pendiente de sincronización`});setWeight("");return}
   try{
    const response=await fetch("/api/plant-execution",{method:"POST",headers:jsonHeaders,body:JSON.stringify(request)});
    const payload=await response.json() as PackingPayload;
    if(!response.ok){setFeedback({kind:"error",message:payload.error??"No fue posible crear packing unit"});return}
    setWeight("");setFeedback({kind:"ok",message:`${payload.packingUnit?.packing_unit_code??request.packingUnitCode} registrada${payload.idempotent?" · reintento idempotente":""}`});
   }catch{
    await queueFloorPacking(request);await refreshQueueCount();setWeight("");setFeedback({kind:"pending",message:`${request.packingUnitCode} quedó pendiente de sincronización`});
   }
  }finally{setSaving(false)}
 };

 const writeReady=writesEnabled===true&&Boolean(selectedStation);
 const modeLabel=writesEnabled===null?"Verificando gate":writesEnabled?selectedStation?"Escritura habilitada":"Sin estación configurada":"Modo seguro";
 return <>
  <PageHeader eyebrow="Plant Execution · Floor" title="Estación de planta" description={writesEnabled?"Captura operacional por lote con scanner HID, packing idempotente y recuperación offline.":"Superficie operacional táctil conectada al lote real. Las escrituras permanecen bloqueadas hasta habilitar Plant Execution en un entorno DB verificado."}/>
  {loading?<div className="system-banner">Sincronizando lotes autorizados…</div>:null}
  {error?<div className="system-banner error" role="alert">{error}</div>:null}
  {stationError?<div className="system-banner error" role="alert">{stationError}</div>:null}
  <section className="floor-status-strip" aria-label="Estado de estación">
   <div>{online?<Wifi size={18}/>:<CloudOff size={18}/>}<span><b>{online?"Aplicación conectada":"Sin conexión"}</b><small>{pendingCount?`${pendingCount} pendiente${pendingCount===1?"":"s"} de sync`:"Sin cola pendiente"}</small></span></div>
   <div><ScanLine size={18}/><span><b>Scanner</b><small>USB HID / teclado listo</small></span></div>
   <div><Scale size={18}/><span><b>Balanza</b><small>Entrada manual · adapter pendiente</small></span></div>
   <div><ShieldCheck size={18}/><span><b>{modeLabel}</b><small>{writesEnabled?selectedStation?.name??"Configure estación real":"Sin escrituras DB"}</small></span></div>
  </section>
  <section className="floor-console" aria-label="Consola de operación">
   <div className="floor-controls">
    <label>Scanner HID<input aria-label="Scanner HID" autoFocus autoComplete="off" spellCheck={false} placeholder="Escanee lote + Enter" value={scanCode} onChange={event=>{setScanCode(event.target.value);setScanFeedback(null)}} onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();applyScan()}}}/></label>
    {scanFeedback?<p className={`floor-scan-feedback ${scanFeedback.kind}`} role={scanFeedback.kind==="error"?"alert":"status"}>{scanFeedback.message}</p>:null}
    <label>Planta<select value={effectivePlant} onChange={event=>{setPlantId(event.target.value);setLotId("");setStationId("");setScanFeedback(null);setFeedback(null)}} disabled={!plantIds.length}>{plantIds.map(id=><option key={id} value={id}>{id}</option>)}</select></label>
    <label>Lote<select value={selected?.receptionId??""} onChange={event=>{setLotId(event.target.value);setScanFeedback(null);setFeedback(null)}} disabled={!plantLots.length}>{plantLots.map(lot=><option key={lot.receptionId} value={lot.receptionId}>{lot.id} · {lot.species} · {lot.supplier}</option>)}</select></label>
    {writesEnabled?<label>Estación<select aria-label="Estación de planta" value={selectedStation?.id??""} onChange={event=>setStationId(event.target.value)} disabled={!plantStations.length}><option value="" disabled>{plantStations.length?"Seleccione estación":"Sin estación configurada"}</option>{plantStations.map(station=><option key={station.id} value={station.id}>{station.name} · {station.code}</option>)}</select></label>:null}
   </div>
   {selected?<div className="floor-active-lot">
    <div className="floor-lot-heading"><span>Lote activo</span><strong>{selected.id}</strong><small>{selected.species} · {selected.supplier}</small></div>
    <dl className="floor-lot-metrics"><div><dt>Planta</dt><dd>{selected.plantId}</dd></div><div><dt>Guía</dt><dd>{selected.guide.toLocaleString("es-CL")} kg</dd></div><div><dt>Aceptado</dt><dd>{selected.accepted.toLocaleString("es-CL")} kg</dd></div><div><dt>Calidad</dt><dd>{selected.status}</dd></div></dl>
    <div className="floor-weight-panel">
     <label htmlFor="floor-weight">Peso de estación</label>
     <div className="floor-weight-input"><input id="floor-weight" inputMode="decimal" placeholder="0,00" value={weight} onChange={event=>{setWeight(event.target.value);setFeedback(null)}} aria-describedby="floor-weight-note"/><span>kg</span></div>
     <p id="floor-weight-note">{writesEnabled?"El mismo idempotency key se conserva en reintentos y sincronización offline.":"Entrada local disponible; el gate impide crear eventos o packing persistente."}</p>
     {feedback?<p className={`floor-operation-feedback ${feedback.kind}`} role={feedback.kind==="error"?"alert":"status"}>{feedback.message}</p>:null}
     <button className="floor-confirm" type="button" disabled={!writeReady||!validWeight||saving} onClick={()=>void submitPacking()} title={!writesEnabled?"Plant Execution writes deshabilitados":!selectedStation?"Configure una estación real":"Crear packing unit"}><PackagePlus size={22}/>{saving?"Registrando…":"Crear packing unit"}<span>{writesEnabled?selectedStation?online?"Evento idempotente":"Se guardará para sincronizar":"Sin estación real":"Persistencia bloqueada por gate #68"}</span></button>
    </div>
   </div>:<div className="floor-empty"><Scale size={30}/><h2>Sin lotes disponibles</h2><p>La estación sólo muestra recepciones reales dentro del alcance de planta del operador.</p></div>}
  </section>
  <section className="floor-next-gate panel"><div><span className="overline">Continuidad operacional</span><h2>{writesEnabled?"Floor listo para packing idempotente":"Escritura aislada pendiente"}</h2><p>{writesEnabled?"Los eventos sin red quedan en IndexedDB y se reintentan con la misma identidad al recuperar conectividad. Los errores de contrato requieren revisión humana y no entran en loop.":"El frontend ya conoce el gate real y no consulta estaciones ni intenta escrituras mientras Plant Execution permanezca deshabilitado."}</p></div><span className={`status-pill ${writesEnabled?"":"warning"}`}>{writesEnabled?`${pendingCount} pendientes`:"Bloqueado por #68"}</span></section>
 </>;
}

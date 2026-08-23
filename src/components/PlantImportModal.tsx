import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import {publishHistoricalProduction,readHistoricalProductionWorkbook,type HistoricalWorkbookPreview} from "../historicalImport";
import type { Plant } from "../plants";
import { readPlantWorkbook, type ValidatedImport } from "../plantImport";

type Props = {
  open: boolean;
  plants: Plant[];
  onClose: () => void;
  onPublish: (rows: ValidatedImport[]) => Promise<void>;
};
export function PlantImportModal({ open, plants, onClose, onPublish }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ValidatedImport[]>([]);
  const [historical,setHistorical]=useState<HistoricalWorkbookPreview|null>(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!open) return null;
  const valid = rows.filter((row) => !row.errors.length);
  const invalid = rows.length - valid.length;
  const reset = () => {
    setRows([]);
    setHistorical(null);
    setFileName("");
    setMessage("");
    if(input.current)input.current.value='';
  };
  const close = () => {
    reset();
    onClose();
  };
  const choose = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const native=await readHistoricalProductionWorkbook(file);
      if(native){
        setHistorical(native);
        setRows([]);
        setFileName(file.name);
        return;
      }
      const parsed = await readPlantWorkbook(file, plants);
      setHistorical(null);
      setRows(parsed);
      setFileName(file.name);
      if (!parsed.length) setMessage("La primera hoja no contiene filas de datos.");
    } catch (cause) {
      setRows([]);
      setHistorical(null);
      setMessage(cause instanceof Error?cause.message:"No fue posible leer el archivo. Verifica que sea XLSX o CSV.");
    } finally {
      setBusy(false);
    }
  };
  const publish = async () => {
    if (!valid.length || invalid) return;
    setBusy(true);
    setMessage("");
    try {
      await onPublish(valid);
      close();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "No fue posible publicar");
    } finally {
      setBusy(false);
    }
  };
  const publishHistorical=async()=>{
    if(!historical?.rows.length)return;
    setBusy(true);setMessage('');
    try{
      const result=await publishHistoricalProduction(historical);
      setMessage(`Publicación completa: ${result.inserted??0} nuevas · ${result.duplicates??0} ya existentes.`);
      window.setTimeout(close,900);
    }catch(cause){setMessage(cause instanceof Error?cause.message:'No fue posible publicar')}finally{setBusy(false)}
  };
  const sample =
    "planta,periodo,produccion_kg,meta_kg,inventario_kg,producto_terminado_kg,fecha_actualizacion,observacion\nancud,2026-08,18420,18000,6250,3120,2026-08-19T08:45:00,Operación normal\nquellon,2026-08,26880,28000,9340,4820,2026-08-19T09:10:00,Sin novedades";
  const hasData=rows.length>0||historical;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="modal-panel import-modal">
        <header>
          <div>
            <span className="overline teal">Importación operacional</span>
            <h2>{historical?'Producción Pescamar reconocida':'Actualizar desde planilla'}</h2>
            <p>{historical?'Detectamos el formato nativo por guía y lote. Se conserva cada fila y sus observaciones de calidad.':'Validamos los datos antes de modificar el centro de control.'}</p>
          </div>
          <button className="icon-btn" onClick={close} aria-label="Cerrar"><X /></button>
        </header>
        {!hasData ? (
          <>
            <button className="import-dropzone" onClick={() => input.current?.click()} disabled={busy}>
              <Upload />
              <span><b>{busy ? "Leyendo archivo…" : "Seleccionar Excel o CSV"}</b><small>Auto-detecta producción Pescamar o snapshot por planta · máximo 15 MB</small></span>
            </button>
            <input ref={input} hidden type="file" accept=".xlsx,.csv" onChange={(event) => void choose(event.target.files?.[0])}/>
            <div className="import-contract"><FileSpreadsheet /><div><b>Dos formatos nativos</b><p>Planilla detallada Pescamar por guía/lote, o snapshot resumido por planta. El sistema detecta cuál corresponde.</p></div></div>
            <a className="button secondary import-download" download="plantilla_pescamar.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(sample)}`}><Download size={15} />Descargar plantilla de snapshot</a>
            {message ? <p className="import-message"><AlertCircle />{message}</p> : null}
          </>
        ) : historical ? (
          <>
            <div className="import-file"><FileSpreadsheet/><span><b>{historical.fileName}</b><small>Formato nativo · hoja “{historical.sheetName}” · hash {historical.fileHash.slice(0,12)}…</small></span><button className="button secondary" onClick={reset}>Cambiar archivo</button></div>
            <div className="inspection-metrics">
              <span>Registros<b>{historical.rows.length}</b></span><span>Operacionales<b>{historical.operational}</b></span><span>Anulados<b>{historical.voids}</b></span><span>Con observaciones<b>{historical.flagged}</b></span>
            </div>
            <div className="import-table-wrap"><table className="import-table"><thead><tr><th>Fila</th><th>Guía</th><th>Proveedor</th><th>Lote</th><th>Kilos guía</th><th>Kilos recibidos</th><th>Resultado</th></tr></thead><tbody>{historical.rows.slice(0,120).map(row=><tr key={row.sourceRow} className={row.dataQualityFlags.length?'has-error':''}><td>{row.sourceRow}</td><td>{row.guideNumber??'—'}</td><td>{row.supplierName??'—'}</td><td>{row.lotCode}</td><td>{row.guideKg?.toLocaleString('es-CL')??'—'}</td><td>{row.receivedKg?.toLocaleString('es-CL')??'—'}</td><td>{row.recordStatus==='void'?<span className="import-errors"><AlertCircle/>Anulado</span>:row.dataQualityFlags.length?<span className="import-errors"><AlertCircle/>{row.dataQualityFlags.length} observación(es)</span>:<span className="import-ok"><CheckCircle2/>Lista</span>}</td></tr>)}</tbody></table></div>
            {historical.rows.length>120?<small className="disabled-note">Vista previa de 120 filas de {historical.rows.length}. Todas serán procesadas.</small>:null}
            {message?<p className="import-message" role="alert"><AlertCircle/>{message}</p>:null}
            <footer><button className="button secondary" onClick={close}>Cancelar</button><button className="button primary" disabled={busy||!historical.rows.length} onClick={()=>void publishHistorical()}>{busy?'Publicando…':`Publicar ${historical.rows.length} registros`}</button></footer>
          </>
        ) : (
          <>
            <div className="import-file"><FileSpreadsheet /><span><b>{fileName}</b><small>{rows.length} filas · {valid.length} válidas · {invalid} con error</small></span><button className="button secondary" onClick={reset}>Cambiar archivo</button></div>
            <div className="import-table-wrap"><table className="import-table"><thead><tr><th>Fila</th><th>Planta</th><th>Período</th><th>Producción</th><th>Meta</th><th>Inventario</th><th>Resultado</th></tr></thead><tbody>{rows.map((row) => <tr key={row.rowNumber} className={row.errors.length ? "has-error" : ""}><td>{row.rowNumber}</td><td>{row.plant?.name ?? row.plantId}</td><td>{row.period || "—"}</td><td>{Number.isFinite(row.productionKg)?row.productionKg.toLocaleString("es-CL"):"—"}</td><td>{Number.isFinite(row.targetKg)?row.targetKg.toLocaleString("es-CL"):"—"}</td><td>{Number.isFinite(row.inventoryKg)?row.inventoryKg.toLocaleString("es-CL"):"—"}</td><td>{row.errors.length?<span className="import-errors"><AlertCircle />{row.errors.join(" · ")}</span>:<span className="import-ok"><CheckCircle2 />Lista para publicar</span>}</td></tr>)}</tbody></table></div>
            {message ? <p className="import-message" role="alert"><AlertCircle />{message}</p> : null}
            <footer><button className="button secondary" onClick={close}>Cancelar</button><button className="button primary" disabled={busy || !valid.length || invalid > 0} onClick={() => void publish()}>{busy ? "Publicando…" : `Publicar ${valid.length} plantas`}</button></footer>
          </>
        )}
      </section>
    </div>
  );
}

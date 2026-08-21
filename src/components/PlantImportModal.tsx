import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
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
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!open) return null;
  const valid = rows.filter((row) => !row.errors.length);
  const invalid = rows.length - valid.length;
  const reset = () => {
    setRows([]);
    setFileName("");
    setMessage("");
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
      const parsed = await readPlantWorkbook(file, plants);
      setRows(parsed);
      setFileName(file.name);
      if (!parsed.length)
        setMessage("La primera hoja no contiene filas de datos.");
    } catch {
      setRows([]);
      setMessage(
        "No fue posible leer el archivo. Verifica que sea XLSX, XLS o CSV.",
      );
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
      setMessage(
        cause instanceof Error ? cause.message : "No fue posible publicar",
      );
    } finally {
      setBusy(false);
    }
  };
  const sample =
    "planta,periodo,produccion_kg,meta_kg,inventario_kg,producto_terminado_kg,fecha_actualizacion,observacion\nancud,2026-08,18420,18000,6250,3120,2026-08-19T08:45:00,Operación normal\nquellon,2026-08,26880,28000,9340,4820,2026-08-19T09:10:00,Sin novedades";
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="modal-panel import-modal">
        <header>
          <div>
            <span className="overline teal">Importación operacional</span>
            <h2>Actualizar plantas desde planilla</h2>
            <p>Validamos los datos antes de modificar el centro de control.</p>
          </div>
          <button className="icon-btn" onClick={close} aria-label="Cerrar">
            <X />
          </button>
        </header>
        {!rows.length ? (
          <>
            <button
              className="import-dropzone"
              onClick={() => input.current?.click()}
              disabled={busy}
            >
              <Upload />
              <span>
                <b>{busy ? "Leyendo archivo…" : "Seleccionar Excel o CSV"}</b>
                <small>Formatos aceptados: .xlsx y .csv · máximo 15 MB</small>
              </span>
            </button>
            <input
              ref={input}
              hidden
              type="file"
              accept=".xlsx,.csv"
              onChange={(event) => void choose(event.target.files?.[0])}
            />
            <div className="import-contract">
              <FileSpreadsheet />
              <div>
                <b>Columnas obligatorias</b>
                <p>
                  planta, periodo, produccion_kg, meta_kg, inventario_kg,
                  producto_terminado_kg y fecha_actualizacion.
                </p>
              </div>
            </div>
            <a
              className="button secondary import-download"
              download="plantilla_pescamar.csv"
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(sample)}`}
            >
              <Download size={15} />
              Descargar plantilla de ejemplo
            </a>
            {message ? (
              <p className="import-message">
                <AlertCircle />
                {message}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <div className="import-file">
              <FileSpreadsheet />
              <span>
                <b>{fileName}</b>
                <small>
                  {rows.length} filas · {valid.length} válidas · {invalid} con
                  error
                </small>
              </span>
              <button className="button secondary" onClick={reset}>
                Cambiar archivo
              </button>
            </div>
            <div className="import-table-wrap">
              <table className="import-table">
                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>Planta</th>
                    <th>Período</th>
                    <th>Producción</th>
                    <th>Meta</th>
                    <th>Inventario</th>
                    <th>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className={row.errors.length ? "has-error" : ""}
                    >
                      <td>{row.rowNumber}</td>
                      <td>{row.plant?.name ?? row.plantId}</td>
                      <td>{row.period || "—"}</td>
                      <td>
                        {Number.isFinite(row.productionKg)
                          ? row.productionKg.toLocaleString("es-CL")
                          : "—"}
                      </td>
                      <td>
                        {Number.isFinite(row.targetKg)
                          ? row.targetKg.toLocaleString("es-CL")
                          : "—"}
                      </td>
                      <td>
                        {Number.isFinite(row.inventoryKg)
                          ? row.inventoryKg.toLocaleString("es-CL")
                          : "—"}
                      </td>
                      <td>
                        {row.errors.length ? (
                          <span className="import-errors">
                            <AlertCircle />
                            {row.errors.join(" · ")}
                          </span>
                        ) : (
                          <span className="import-ok">
                            <CheckCircle2 />
                            Lista para publicar
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {message ? (
              <p className="import-message" role="alert">
                <AlertCircle />
                {message}
              </p>
            ) : null}
            <footer>
              <button className="button secondary" onClick={close}>
                Cancelar
              </button>
              <button
                className="button primary"
                disabled={busy || !valid.length || invalid > 0}
                onClick={() => void publish()}
              >
                {busy ? "Publicando…" : `Publicar ${valid.length} plantas`}
              </button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}

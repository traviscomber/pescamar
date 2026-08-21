import { Camera, CheckCircle2, Scale, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type { Lot, Species } from "../types";

export function ReceptionModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (lot: Lot) => Promise<void>;
}) {
  const [supplier, setSupplier] = useState(""),
    [zone, setZone] = useState("");
  const [species, setSpecies] = useState<Species>("Erizo");
  const [gross, setGross] = useState(100),
    [tare, setTare] = useState(6),
    [drained, setDrained] = useState(87),
    [temperature, setTemperature] = useState(4.2),
    [captured, setCaptured] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const accepted = Math.max(0, drained - tare),
    loss = useMemo(
      () => (gross ? ((gross - accepted) / gross) * 100 : 0),
      [gross, accepted],
    );
  if (!open) return null;
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const initials = supplier
      .split(" ")
      .map((x) => x[0])
      .slice(0, 2)
      .join("");
    const id = `ER-${Date.now()}`;
    try {
      await onSave({
        id,
        species,
        supplier,
        initials,
        zone,
        gross,
        tare,
        drained,
        accepted,
        loss,
        gonadYield: null,
        premiumYield: null,
        temperature,
        status: "Muestreo",
        receivedAt: new Date().toLocaleTimeString("es-CL", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        evidenceCount: captured ? 1 : 0,
      });
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible crear la recepción",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form className="modal-panel" onSubmit={submit}>
        <header>
          <div>
            <span className="overline teal">Recepción justa</span>
            <h2>Nueva entrega artesanal</h2>
            <p>
              Registra peso, procedencia y evidencia antes de crear el lote.
            </p>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={19} />
          </button>
        </header>
        <div className="step-indicator">
          <span className="active">
            1 <b>Datos</b>
          </span>
          <i />
          <span>
            2 <b>Muestreo</b>
          </span>
          <i />
          <span>
            3 <b>Comprobante</b>
          </span>
        </div>
        <div className="form-grid">
          <label>
            Proveedor
            <input
              required
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Nombre o razón social"
            />
          </label>
          <label>
            Zona de extracción
            <input
              required
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="Zona declarada"
            />
          </label>
          <label>
            Especie
            <select
              value={species}
              onChange={(event) => setSpecies(event.target.value as Species)}
            >
              {(
                [
                  "Erizo",
                  "Loco",
                  "Jaiba",
                  "Centolla",
                  "Pulpo",
                  "Pescado",
                  "Algas",
                ] as Species[]
              ).map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            Peso bruto (kg)
            <div className="input-icon">
              <Scale size={16} />
              <input
                type="number"
                min="0"
                step=".1"
                value={gross}
                onChange={(e) => setGross(+e.target.value)}
              />
            </div>
          </label>
          <label>
            Tara (kg)
            <input
              type="number"
              min="0"
              step=".1"
              value={tare}
              onChange={(e) => setTare(+e.target.value)}
            />
          </label>
          <label>
            Peso después de escurrido (kg)
            <input
              type="number"
              min="0"
              step=".1"
              value={drained}
              onChange={(e) => setDrained(+e.target.value)}
            />
          </label>
          <label>
            Temperatura (°C)
            <input
              type="number"
              step=".1"
              value={temperature}
              onChange={(e) => setTemperature(+e.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          className={`capture-zone ${captured ? "captured" : ""}`}
          onClick={() => setCaptured(true)}
        >
          {captured ? <CheckCircle2 size={25} /> : <Camera size={25} />}
          <span>
            <b>
              {captured ? "Evidencia registrada" : "Registrar evidencia visual"}
            </b>
            <small>
              {captured
                ? "Pendiente de validación"
                : "Adjuntar evidencia de la recepción"}
            </small>
          </span>
        </button>
        <div className="calculation-strip">
          <div>
            <small>Peso neto aceptado</small>
            <b>{accepted.toFixed(1)} kg</b>
          </div>
          <div>
            <small>Merma calculada</small>
            <b className={loss > 18 ? "negative" : ""}>{loss.toFixed(1)}%</b>
          </div>
          <div>
            <small>Validación</small>
            <b>Pendiente</b>
          </div>
        </div>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <footer>
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button className="button primary" type="submit" disabled={saving}>
            {saving ? "Guardando recepción…" : "Crear lote y comprobante"}
          </button>
        </footer>
      </form>
    </div>
  );
}

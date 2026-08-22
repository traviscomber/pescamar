import { FileCheck2, Link2, Scale, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../auth";
import { plants } from "../plants";
import type { Lot, ReceptionEvidence, Species } from "../types";
import "./reception-evidence.css";

export function ReceptionModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (lot: Lot) => Promise<void>;
}) {
  const { operator } = useAuth();
  const accessiblePlants = useMemo(
    () =>
      operator?.role === "admin"
        ? plants
        : plants.filter((plant) => operator?.plantIds.includes(plant.id)),
    [operator],
  );
  const [plantId, setPlantId] = useState("");
  const [supplier, setSupplier] = useState(""),
    [zone, setZone] = useState("");
  const [species, setSpecies] = useState<Species>("Erizo");
  const [guide, setGuide] = useState(100),
    [gross, setGross] = useState(100),
    [tare, setTare] = useState(6),
    [drained, setDrained] = useState(87),
    [temperature, setTemperature] = useState(4.2),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const [evidence, setEvidence] = useState<ReceptionEvidence[]>([]);
  const [evidenceKind, setEvidenceKind] = useState<ReceptionEvidence["kind"]>("document");
  const [evidenceLabel, setEvidenceLabel] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");

  useEffect(() => {
    if (!accessiblePlants.some((plant) => plant.id === plantId))
      setPlantId(accessiblePlants[0]?.id ?? "");
  }, [accessiblePlants, plantId]);

  const accepted = Math.max(0, drained - tare),
    loss = useMemo(
      () => (gross ? ((gross - accepted) / gross) * 100 : 0),
      [gross, accepted],
    );

  if (!open) return null;

  function addEvidence() {
    setError("");
    if (evidence.length >= 6) {
      setError("Puedes registrar hasta seis evidencias por recepción");
      return;
    }
    try {
      const parsed = new URL(evidenceUrl.trim());
      if (parsed.protocol !== "https:" || evidenceLabel.trim().length < 2)
        throw new Error("invalid");
      setEvidence((current) => [
        ...current,
        {
          kind: evidenceKind,
          label: evidenceLabel.trim(),
          url: parsed.toString(),
          note: evidenceNote.trim(),
        },
      ]);
      setEvidenceLabel("");
      setEvidenceUrl("");
      setEvidenceNote("");
    } catch {
      setError("La evidencia necesita un nombre y un enlace HTTPS válido");
    }
  }

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
      if (!plantId) throw new Error("Tu identidad no tiene una planta habilitada para registrar esta recepción");
      await onSave({
        id,
        plantId,
        species,
        supplier,
        initials,
        zone,
        guide,
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
        evidenceCount: evidence.length,
        evidence,
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
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form className="modal-panel" onSubmit={submit}>
        <header>
          <div>
            <span className="overline teal">Recepción trazable</span>
            <h2>Nueva entrega artesanal</h2>
            <p>Registra planta, peso, procedencia y evidencia antes de crear el lote.</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={19} />
          </button>
        </header>
        <div className="step-indicator">
          <span className="active">1 <b>Datos</b></span>
          <i />
          <span>2 <b>Muestreo</b></span>
          <i />
          <span>3 <b>Evidencia</b></span>
        </div>
        <div className="form-grid">
          <label>
            Planta
            <select value={plantId} onChange={(event) => setPlantId(event.target.value)} required disabled={!accessiblePlants.length}>
              {!accessiblePlants.length ? <option value="">Sin plantas asignadas</option> : null}
              {accessiblePlants.map((plant) => <option value={plant.id} key={plant.id}>{plant.name}</option>)}
            </select>
          </label>
          <label>
            Proveedor
            <input required value={supplier} onChange={(event) => setSupplier(event.target.value)} placeholder="Nombre o razón social" />
          </label>
          <label>
            Zona de extracción
            <input required value={zone} onChange={(event) => setZone(event.target.value)} placeholder="Zona declarada" />
          </label>
          <label>
            Especie
            <select value={species} onChange={(event) => setSpecies(event.target.value as Species)}>
              {(["Erizo", "Loco", "Jaiba", "Centolla", "Pulpo", "Pescado", "Algas"] as Species[]).map((item) => (
                <option value={item} key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Peso guía (kg)
            <div className="input-icon"><Scale size={16} /><input type="number" min="0" step=".1" value={guide} onChange={(event) => setGuide(+event.target.value)} /></div>
          </label>
          <label>
            Peso bruto (kg)
            <div className="input-icon"><Scale size={16} /><input type="number" min="0" step=".1" value={gross} onChange={(event) => setGross(+event.target.value)} /></div>
          </label>
          <label>
            Tara (kg)
            <input type="number" min="0" step=".1" value={tare} onChange={(event) => setTare(+event.target.value)} />
          </label>
          <label>
            Peso después de escurrido (kg)
            <input type="number" min="0" step=".1" value={drained} onChange={(event) => setDrained(+event.target.value)} />
          </label>
          <label>
            Temperatura (°C)
            <input type="number" step=".1" value={temperature} onChange={(event) => setTemperature(+event.target.value)} />
          </label>
        </div>

        <section className="reception-evidence-panel">
          <header>
            <div>
              <span className="overline teal">Respaldo documental</span>
              <h3>Evidencia de recepción</h3>
            </div>
            <span>{evidence.length}/6</span>
          </header>
          <div className="evidence-input-grid">
            <label>
              Tipo
              <select value={evidenceKind} onChange={(event) => setEvidenceKind(event.target.value as ReceptionEvidence["kind"])}>
                <option value="document">Documento</option>
                <option value="photo">Fotografía</option>
                <option value="certificate">Certificado</option>
                <option value="other">Otro</option>
              </select>
            </label>
            <label>
              Nombre
              <input value={evidenceLabel} onChange={(event) => setEvidenceLabel(event.target.value)} placeholder="Ej. guía de despacho" />
            </label>
            <label className="evidence-url-field">
              Enlace HTTPS
              <div className="input-icon"><Link2 size={16} /><input type="url" value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} placeholder="https://…" /></div>
            </label>
            <label className="evidence-note-field">
              Nota opcional
              <input value={evidenceNote} onChange={(event) => setEvidenceNote(event.target.value)} placeholder="Referencia, folio o contexto" maxLength={500} />
            </label>
            <button type="button" className="button secondary evidence-add" onClick={addEvidence} disabled={!evidenceLabel.trim() || !evidenceUrl.trim()}>
              <FileCheck2 size={16} />Agregar evidencia
            </button>
          </div>
          {evidence.length ? (
            <div className="evidence-list">
              {evidence.map((item, index) => (
                <article key={`${item.url}-${index}`}>
                  <FileCheck2 size={17} />
                  <div><b>{item.label}</b><small>{item.url}</small></div>
                  <button type="button" className="icon-btn" aria-label={`Quitar ${item.label}`} onClick={() => setEvidence((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                    <Trash2 size={15} />
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="evidence-empty">Sin evidencia adjunta. Puedes registrar enlaces a guías, fotos o certificados respaldados externamente.</p>
          )}
        </section>

        <div className="calculation-strip">
          <div><small>Peso neto aceptado</small><b>{accepted.toFixed(1)} kg</b></div>
          <div><small>Merma calculada</small><b className={loss > 18 ? "negative" : ""}>{loss.toFixed(1)}%</b></div>
          <div><small>Diferencia sobre guía</small><b className={accepted < guide ? "negative" : ""}>{(accepted - guide).toFixed(1)} kg</b></div>
          <div><small>Evidencia</small><b>{evidence.length ? `${evidence.length} adjunta${evidence.length === 1 ? "" : "s"}` : "Sin adjuntos"}</b></div>
        </div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <footer>
          <button type="button" className="button secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="button primary" type="submit" disabled={saving || !plantId}>
            {saving ? "Guardando recepción…" : "Crear lote y comprobante"}
          </button>
        </footer>
      </form>
    </div>
  );
}

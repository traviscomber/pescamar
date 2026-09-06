import { useCallback, useEffect, useState } from "react";
import type { Lot, LotStatus, ReceptionEvidence, Species } from "./types";

type ApiReception = {
  id: string;
  reception_number: string | number;
  plant_id: string;
  supplier: string;
  species: Species;
  extraction_zone: string;
  source_reference?: string | null;
  guide_kg: string | number;
  gross_kg: string | number;
  tare_kg: string | number;
  drained_kg: string | number | null;
  accepted_kg: string | number | null;
  temperature_c: string | number | null;
  quality_status: LotStatus;
  evidence_count: number;
  evidence?: ReceptionEvidence[];
  received_at: string;
};

function toLot(row: ApiReception): Lot {
  const gross = Number(row.gross_kg),
    tare = Number(row.tare_kg),
    drained = Number(row.drained_kg ?? 0),
    accepted = Number(row.accepted_kg ?? 0);
  return {
    receptionId: row.id,
    id: `REC-${row.reception_number}`,
    plantId: row.plant_id,
    species: row.species,
    supplier: row.supplier,
    initials: row.supplier.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase(),
    zone: row.extraction_zone,
    guide: Number(row.guide_kg),
    guideReference: row.source_reference ?? undefined,
    gross,
    tare,
    drained,
    accepted,
    loss: gross ? ((gross - accepted) / gross) * 100 : 0,
    gonadYield: null,
    premiumYield: null,
    temperature: Number(row.temperature_c ?? 0),
    status: row.quality_status,
    receivedAt: new Date(row.received_at).toLocaleTimeString("es-CL", {hour: "2-digit",minute: "2-digit"}),
    occurredAt: row.received_at,
    evidenceCount: row.evidence_count,
    evidence: row.evidence ?? [],
  };
}

async function loadReceptions() {const response = await fetch("/api/receptions");const payload = (await response.json()) as {receptions?: ApiReception[];error?: string};if (!response.ok) throw new Error(payload.error ?? "No fue posible cargar recepciones");return (payload.receptions ?? []).map(toLot);}

export function useLots(enabled = true) {
  const [lots, setLots] = useState<Lot[]>([]),[loading, setLoading] = useState(enabled),[error, setError] = useState("");
  const refresh = useCallback(async () => {setLoading(true);setError("");try {setLots(await loadReceptions());} catch (cause) {setLots([]);setError(cause instanceof Error ? cause.message : "No fue posible cargar recepciones");} finally {setLoading(false);}}, []);
  useEffect(() => {
    if (!enabled) {setLoading(false);return;}
    let active = true;
    setLoading(true);
    setError("");
    loadReceptions().then((receptions) => {if (active) setLots(receptions);}).catch((cause: unknown) => {if (active) setError(cause instanceof Error ? cause.message : "No fue posible cargar recepciones");}).finally(() => {if (active) setLoading(false);});
    return () => {active = false;};
  }, [enabled]);
  const addLot = useCallback(async (lot: Lot) => {const response = await fetch("/api/receptions", {method: "POST",headers: { "Content-Type": "application/json" },body: JSON.stringify(lot)});const payload = (await response.json()) as { reception?:{id?:string}; error?: string };if (!response.ok) throw new Error(payload.error ?? "No fue posible crear la recepción");const receptionId=String(payload.reception?.id??'');if(!receptionId)throw new Error('La recepción fue creada sin identidad navegable');if(enabled)await refresh();return receptionId;}, [enabled,refresh]);
  return { lots, loading, error, addLot, refresh };
}

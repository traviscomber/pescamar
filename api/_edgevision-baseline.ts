// EdgeVision baseline promotion seam — DISABLED BY DEFAULT, hard policy boundary.
//
// "Promoting a validated dataset to baseline" means: an admin acknowledges a
// QA-validated intake batch as the evidence foundation for ONE planned
// capability. It records provenance only. It never enables predictive output:
// the Grade A boundary (`predictiveBaselineAvailable: false` in
// api/_operational-intelligence.ts) stays pinned until Pescamar executes
// Gate 5 and Gate 7 of docs/SEAFOOD-GRADE-A.md with real sign-off.
//
// This module is the single code seam for that future step. The only caller
// is the admin-gated api/edgevision-baseline.ts endpoint, which stays inert
// (409 with the policy explanation) until a validated batch meeting the
// evidence thresholds below exists for the requested capability.

import { getSql } from "./_db.js";

export const EDGE_VISION_BASELINE_CAPABILITIES = ["count", "calibre", "size", "defects", "biomass", "anomaly"] as const;
export type EdgeVisionBaselineCapability = (typeof EDGE_VISION_BASELINE_CAPABILITIES)[number];

// Evidence thresholds grounded in the vision QA docs: real captures only,
// human-confirmed labels, multiple capture days. Numbers are minimum intake
// gates for CONSIDERING a baseline — never an accuracy claim.
export type BaselineEvidenceRequirement = {
  capability: EdgeVisionBaselineCapability;
  minimumImages: number;
  minimumOperatorConfirmedLabels: number;
  minimumCaptureDays: number;
  rationale: string;
};

export const baselineEvidenceRequirements: readonly BaselineEvidenceRequirement[] = [
  { capability: "count", minimumImages: 300, minimumOperatorConfirmedLabels: 100, minimumCaptureDays: 3, rationale: "Conteo requiere suficientes ventanas de proceso con conteo humano de referencia para estimar error por escena." },
  { capability: "calibre", minimumImages: 400, minimumOperatorConfirmedLabels: 150, minimumCaptureDays: 3, rationale: "Calibre exige cobertura por clase de calibre con etiqueta confirmada por operador, no sólo distribución agregada." },
  { capability: "size", minimumImages: 300, minimumOperatorConfirmedLabels: 100, minimumCaptureDays: 3, rationale: "Tamaño dimensional necesita referencias de escala en escena y confirmación humana de las medidas usadas." },
  { capability: "defects", minimumImages: 500, minimumOperatorConfirmedLabels: 200, minimumCaptureDays: 5, rationale: "Defectos necesita instancias positivas de cada taxonomía aprobada; la ausencia de defecto nunca se toma como aprobación." },
  { capability: "biomass", minimumImages: 200, minimumOperatorConfirmedLabels: 80, minimumCaptureDays: 3, rationale: "Biomasa sólo es estimable con peso de referencia observado en la misma ventana de captura." },
  { capability: "anomaly", minimumImages: 400, minimumOperatorConfirmedLabels: 120, minimumCaptureDays: 5, rationale: "Anomalías requiere tanto condición nominal como desviaciones reales documentadas antes de automatizar alertas." },
] as const;

export const POLICY_BOUNDARY_MESSAGE =
  "La frontera predictiva permanece cerrada: promover un dataset a línea de base sólo registra evidencia. Las capacidades predictivas se habilitan únicamente después de Gate 5 (baselines contrastados con muestra real acordada) y Gate 7 (sign-off PASS de Pescamar) documentados en docs/SEAFOOD-GRADE-A.md. Hasta entonces predictiveBaselineAvailable sigue siendo false.";

export type BaselinePromotionResult =
  | { promoted: false; code: "NO_VALIDATED_BATCH" | "INSUFFICIENT_EVIDENCE" | "ALREADY_PROMOTED"; reason: string }
  | { promoted: true; batchId: number; capability: EdgeVisionBaselineCapability; recordedAt: string };

type BatchRow = {
  id: number;
  plant_id: string;
  capability: EdgeVisionBaselineCapability;
  captured_from: string;
  captured_to: string;
  image_count: number;
  operator_confirmed_labels: number;
  qa_status: string;
  promoted_at: string | null;
};

function captureDays(row: BatchRow): number {
  const from = new Date(row.captured_from).getTime();
  const to = new Date(row.captured_to).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return 0;
  return Math.floor((to - from) / 86_400_000) + 1;
}

export function assessBaselineEvidence(row: BatchRow): { ok: boolean; gaps: string[] } {
  const requirement = baselineEvidenceRequirements.find((item) => item.capability === row.capability);
  if (!requirement) return { ok: false, gaps: ["capacidad sin requisito de línea de base definido"] };
  const gaps: string[] = [];
  if (row.qa_status !== "validated") gaps.push("el lote no está qa_status=validated");
  if (row.image_count < requirement.minimumImages) gaps.push(`image_count ${row.image_count} < ${requirement.minimumImages}`);
  if (row.operator_confirmed_labels < requirement.minimumOperatorConfirmedLabels) gaps.push(`operator_confirmed_labels ${row.operator_confirmed_labels} < ${requirement.minimumOperatorConfirmedLabels}`);
  const days = captureDays(row);
  if (days < requirement.minimumCaptureDays) gaps.push(`ventana de captura ${days} día(s) < ${requirement.minimumCaptureDays}`);
  return { ok: gaps.length === 0, gaps };
}

// Promotion is a provenance record on the batch row (promoted_at/promoted_by).
// It is the ONLY write this seam performs and it activates no model, no
// forecast and no automated decision.
export async function promoteCapabilityBaseline(capability: EdgeVisionBaselineCapability, requestedBy: string): Promise<BaselinePromotionResult> {
  const rows = await getSql()`
    select id, plant_id, capability, captured_from, captured_to, image_count, operator_confirmed_labels, qa_status, promoted_at
    from edgevision_dataset_batches
    where capability=${capability}
    order by id desc
    limit 20`;
  const batches = (Array.isArray(rows) ? rows : []) as BatchRow[];
  const candidates = batches.filter((row) => row.qa_status === "validated");
  if (!candidates.length)
    return { promoted: false, code: "NO_VALIDATED_BATCH", reason: `No existe ningún lote qa_status=validated para la capacidad '${capability}'. ${POLICY_BOUNDARY_MESSAGE}` };
  const eligible = candidates.filter((row) => assessBaselineEvidence(row).ok);
  if (!eligible.length) {
    const gaps = candidates.map((row) => `lote #${row.id}: ${assessBaselineEvidence(row).gaps.join("; ")}`).join(" | ");
    return { promoted: false, code: "INSUFFICIENT_EVIDENCE", reason: `Ningún lote validado cumple los umbrales de evidencia para '${capability}'. ${gaps}. ${POLICY_BOUNDARY_MESSAGE}` };
  }
  const target = eligible[0];
  if (target.promoted_at)
    return { promoted: false, code: "ALREADY_PROMOTED", reason: `El lote #${target.id} ya fue promovido como línea de base de '${capability}' el ${target.promoted_at}. ${POLICY_BOUNDARY_MESSAGE}` };
  const updated = await getSql()`
    update edgevision_dataset_batches
    set promoted_at=now(), promoted_by=${requestedBy}::uuid
    where id=${target.id} and promoted_at is null
    returning id, promoted_at`;
  const row = Array.isArray(updated) ? (updated[0] as { id: number; promoted_at: string } | undefined) : undefined;
  if (!row) return { promoted: false, code: "ALREADY_PROMOTED", reason: `El lote #${target.id} ya fue promovido por otra sesión. ${POLICY_BOUNDARY_MESSAGE}` };
  return { promoted: true, batchId: row.id, capability, recordedAt: row.promoted_at };
}

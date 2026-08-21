import type { ImportBatch, PlantState } from "./plantImport";

type PlantStateResponse = {
  ok: boolean;
  plants: PlantState[] | null;
  history: ImportBatch[];
  error?: string;
};

async function api<T>(method: string, body?: unknown): Promise<T> {
  const response = await fetch("/api/plant-state", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new Error(payload.error ?? "No fue posible sincronizar plantas");
  return payload;
}

export const fetchSharedPlantState = () => api<PlantStateResponse>("GET");
export const publishSharedPlantState = (batch: ImportBatch) =>
  api<{ ok: true; batchId: string }>("POST", { batch });
export const revertSharedPlantState = (batchId: string) =>
  api<{ ok: true; plants: PlantState[] }>("PATCH", { batchId });

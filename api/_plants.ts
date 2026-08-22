import type { SessionOperator } from "./_auth.js";

export const PLANT_IDS = [
  "ancud",
  "quellon",
  "iquique",
  "piedra-azul",
  "aqua-austral",
  "natales",
] as const;

const plantIdSet = new Set<string>(PLANT_IDS);

export function normalizePlantIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => String(item).trim())
        .filter((item) => plantIdSet.has(item)),
    ),
  );
}

export function hasPlantAccess(operator: SessionOperator, plantId: string) {
  return operator.role === "admin" || operator.plantIds.includes(plantId);
}

export function allowedPlantIds(operator: SessionOperator) {
  return operator.role === "admin" ? [...PLANT_IDS] : normalizePlantIds(operator.plantIds);
}

export function filterPlants<T extends { id?: unknown }>(plants: T[], operator: SessionOperator) {
  const allowed = new Set(allowedPlantIds(operator));
  return plants.filter((plant) => typeof plant.id === "string" && allowed.has(plant.id));
}

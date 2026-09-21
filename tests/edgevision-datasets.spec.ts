import { expect, test } from "@playwright/test";

// EdgeVision dataset intake (admin): registering a real plant dataset batch
// through the /uni surface and evaluating a baseline promotion, which must
// stay inert (409 with the policy explanation) while the predictive boundary
// holds (predictiveBaselineAvailable: false).

function adminOperator() {
  return { id: "op-admin", fullName: "Admin QA", email: "admin@example.test", role: "admin", plantIds: ["ancud", "quellon"], mustChangePassword: false };
}

const statusPayload = { ok: true, platform: "vercel-functions", environment: "test", persistence: { database: true, files: true }, metrics: { pendingDecisions: 0, pendingCredits: 0, activeOperators: 1, receptions: 0 }, commit: "qa12345", checkedAt: new Date().toISOString() };

type Batch = { id: number; plant_id: string; capability: string; source_label: string; captured_from: string; captured_to: string; image_count: number; operator_confirmed_labels: number; storage_ref: string; qa_status: string; qa_notes: string | null; promoted_at: string | null; created_by_name: string | null; created_at: string };

test("admin registers a plant dataset batch from /uni and sees it pending review", async ({ page }) => {
  let posted: Record<string, unknown> | null = null;
  let batches: Batch[] = [];
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/api/status") return json(statusPayload);
    if (path === "/api/auth") return json({ ok: true, operator: adminOperator() });
    if (path === "/api/edgevision-datasets" && route.request().method() === "POST") {
      posted = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
      const created: Batch = { id: batches.length + 1, plant_id: String(posted.plantId), capability: String(posted.capability), source_label: String(posted.sourceLabel), captured_from: String(posted.capturedFrom), captured_to: String(posted.capturedTo), image_count: Number(posted.imageCount), operator_confirmed_labels: Number(posted.operatorConfirmedLabels), storage_ref: String(posted.storageRef), qa_status: "pending_review", qa_notes: null, promoted_at: null, created_by_name: "Admin QA", created_at: new Date().toISOString() };
      batches = [created];
      return json({ ok: true, batch: created }, 201);
    }
    if (path === "/api/edgevision-datasets") return json({ ok: true, items: batches, plants: ["ancud", "quellon", "iquique", "piedra-azul", "aqua-austral", "natales"], capabilities: ["count", "calibre", "size", "defects", "biomass", "anomaly"], qaStatuses: ["pending_review", "validated", "rejected"] });
    if (path === "/api/edgevision-baseline") return json({ ok: false, promoted: false, code: "NO_VALIDATED_BATCH", reason: "No existe ningún lote qa_status=validated para la capacidad 'count'. La frontera predictiva permanece cerrada.", policyBoundary: "La frontera predictiva permanece cerrada." }, 409);
    return json({ ok: true });
  });
  await page.goto("/uni");
  await expect(page.getByRole("heading", { name: "Lotes de dataset EdgeVision" })).toBeVisible();
  await page.getByLabel("Planta del lote").selectOption("ancud");
  await page.getByLabel("Capacidad del lote").selectOption("count");
  await page.getByLabel("Etiqueta de fuente").fill("línea 2 · cámara A · calada 12-09");
  await page.getByLabel("Referencia de almacenamiento").fill("s3://pescamar-datasets/ancud/2026-09-12/");
  await page.getByLabel("Captura desde").fill("2026-09-10T08:00");
  await page.getByLabel("Captura hasta").fill("2026-09-12T18:00");
  await page.getByLabel("Número de imágenes").fill("350");
  await page.getByLabel("Etiquetas confirmadas por operador").fill("120");
  await page.getByRole("button", { name: /Registrar lote de dataset/ }).click();
  expect(posted).not.toBeNull();
  expect(posted?.plantId).toBe("ancud");
  expect(posted?.capability).toBe("count");
  expect(posted?.sourceLabel).toBe("línea 2 · cámara A · calada 12-09");
  expect(posted?.imageCount).toBe(350);
  expect(posted?.operatorConfirmedLabels).toBe(120);
  expect(String(posted?.storageRef)).toContain("s3://pescamar-datasets/ancud/2026-09-12/");
  await expect(page.getByText(/#1 · count · ancud/)).toBeVisible();
  await expect(page.locator(".status", { hasText: "Pendiente de revisión" })).toBeVisible();
});

test("baseline promotion evaluation answers 409 with the policy boundary and the UI shows it", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/api/status") return json(statusPayload);
    if (path === "/api/auth") return json({ ok: true, operator: adminOperator() });
    if (path === "/api/edgevision-datasets") return json({ ok: true, items: [], plants: ["ancud", "quellon", "iquique", "piedra-azul", "aqua-austral", "natales"], capabilities: ["count", "calibre", "size", "defects", "biomass", "anomaly"], qaStatuses: ["pending_review", "validated", "rejected"] });
    if (path === "/api/edgevision-baseline") return json({ ok: false, promoted: false, code: "NO_VALIDATED_BATCH", reason: "No existe ningún lote qa_status=validated para la capacidad 'count'. La frontera predictiva permanece cerrada: promover un dataset a línea de base sólo registra evidencia. Las capacidades predictivas se habilitan únicamente después de Gate 5 y Gate 7 de docs/SEAFOOD-GRADE-A.md.", policyBoundary: "La frontera predictiva permanece cerrada." }, 409);
    return json({ ok: true });
  });
  await page.goto("/uni");
  const countRow = page.locator(".os-stage-modules .alert-row", { hasText: "Conteo" });
  await countRow.getByRole("button", { name: /Evaluar promoción/ }).click();
  await expect(countRow.getByText(/No existe ningún lote qa_status=validated/)).toBeVisible();
  await expect(countRow.getByText(/Gate 5 y Gate 7/)).toBeVisible();
});

test("dataset intake section is hidden from non-admin operators", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/api/status") return json(statusPayload);
    if (path === "/api/auth") return json({ ok: true, operator: { id: "op-calidad", fullName: "Calidad QA", email: "calidad@example.test", role: "quality", plantIds: ["ancud"], mustChangePassword: false } });
    return json({ ok: true });
  });
  await page.goto("/uni");
  await expect(page.getByRole("heading", { name: "Lotes de dataset EdgeVision" })).toHaveCount(0);
});

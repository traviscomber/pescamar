import { expect, test } from "@playwright/test";

// Pilot onboarding: management creates an identity with a temporary password
// (always flagged must_change_password server-side) and the first login is
// forced through a self-chosen password before a role-based welcome.

function adminOperator() {
  return { id: "op-admin", fullName: "Admin QA", email: "admin@example.test", role: "admin", plantIds: ["ancud", "quellon"], mustChangePassword: false };
}

test("admin creates a pilot operator with temporary password and sees the pending badge", async ({ page }) => {
  let posted: Record<string, unknown> | null = null;
  let created: Record<string, unknown> | null = null;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/api/status") return json({ ok: true, platform: "vercel-functions", environment: "test", persistence: { database: true, files: true }, metrics: { pendingDecisions: 0, pendingCredits: 0, activeOperators: 1, receptions: 0 }, commit: "qa12345", checkedAt: new Date().toISOString() });
    if (path === "/api/auth") return json({ ok: true, operator: adminOperator() });
    if (path === "/api/operators" && route.request().method() === "POST") {
      posted = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
      created = { id: "op-nueva", full_name: String(posted.name), email: String(posted.email), role: String(posted.role), active: true, plant_ids: posted.plantIds, must_change_password: true, credentials_ready: true };
      return json({ ok: true, operator: created }, 201);
    }
    if (path === "/api/operators") return json({ ok: true, operators: created ? [created] : [] });
    return json({ ok: true });
  });
  await page.goto("/operadores");
  await expect(page.getByRole("heading", { name: "Agregar o restablecer operador" })).toBeVisible();
  await page.getByLabel(/Nombre completo/).fill("Operaria Piloto Ancud");
  await page.getByLabel(/Correo/).fill("piloto.ancud@example.test");
  await page.getByLabel(/Contraseña temporal/).fill("Temporal-2026-QA");
  await page.getByLabel(/Rol/).selectOption("operations");
  await page.getByRole("checkbox", { name: /Ancud/ }).check();
  await page.getByRole("button", { name: /Guardar identidad/ }).click();
  await expect(page.getByText("Cambio de contraseña pendiente")).toBeVisible();
  expect(posted).not.toBeNull();
  expect(posted?.name).toBe("Operaria Piloto Ancud");
  expect(posted?.email).toBe("piloto.ancud@example.test");
  expect(posted?.password).toBe("Temporal-2026-QA");
  expect(posted?.role).toBe("operations");
  expect(posted?.plantIds).toEqual(["ancud"]);
});

test("temporary password forces change at first login and welcomes by role", async ({ page }) => {
  let mustChange = true;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/api/status") return json({ ok: true, platform: "vercel-functions", environment: "test", persistence: { database: true, files: true }, metrics: { pendingDecisions: 0, pendingCredits: 0, activeOperators: 1, receptions: 0 }, commit: "qa12345", checkedAt: new Date().toISOString() });
    if (path === "/api/auth" && route.request().method() === "GET")
      return json({ ok: true, operator: { id: "op-piloto", fullName: "Operaria Piloto Ancud", email: "piloto.ancud@example.test", role: "operations", plantIds: ["ancud"], mustChangePassword: mustChange } });
    if (path === "/api/password") {
      const body = JSON.parse(route.request().postData() ?? "{}") as { currentPassword?: string; newPassword?: string };
      if (body.currentPassword !== "Temporal-2026-QA") return json({ ok: false, error: "La contraseña actual no es válida" }, 403);
      mustChange = false;
      return json({ ok: true });
    }
    return json({ ok: true });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Define tu contraseña" })).toBeVisible();
  await page.getByLabel(/Contraseña temporal/).fill("Temporal-2026-QA");
  await page.getByLabel(/^Nueva contraseña/).fill("Propia-2026-Larga");
  await page.getByLabel(/Confirmar nueva contraseña/).fill("Propia-2026-Larga");
  await page.getByRole("button", { name: /Guardar y continuar/ }).click();
  await expect(page.getByRole("heading", { name: "Operaria Piloto Ancud" })).toBeVisible();
  await expect(page.getByText("Coordinar la operación y mover primero lo que más impacta el día.")).toBeVisible();
  await expect(page.getByRole("link", { name: "/recepciones" })).toBeVisible();
  await page.getByRole("button", { name: /Ir a mi espacio de trabajo/ }).click();
  await expect(page.locator(".app-shell")).toBeVisible();
});

test("wrong temporary password is rejected on the change screen", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/api/status") return json({ ok: true, platform: "vercel-functions", environment: "test", persistence: { database: true, files: true }, metrics: { pendingDecisions: 0, pendingCredits: 0, activeOperators: 1, receptions: 0 }, commit: "qa12345", checkedAt: new Date().toISOString() });
    if (path === "/api/auth" && route.request().method() === "GET")
      return json({ ok: true, operator: { id: "op-piloto", fullName: "Operaria Piloto Ancud", email: "piloto.ancud@example.test", role: "operations", plantIds: ["ancud"], mustChangePassword: true } });
    if (path === "/api/password") return json({ ok: false, error: "La contraseña actual no es válida" }, 403);
    return json({ ok: true });
  });
  await page.goto("/");
  await page.getByLabel(/Contraseña temporal/).fill("Equivocada-9999");
  await page.getByLabel(/^Nueva contraseña/).fill("Propia-2026-Larga");
  await page.getByLabel(/Confirmar nueva contraseña/).fill("Propia-2026-Larga");
  await page.getByRole("button", { name: /Guardar y continuar/ }).click();
  await expect(page.getByText("La contraseña actual no es válida")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Define tu contraseña" })).toBeVisible();
});

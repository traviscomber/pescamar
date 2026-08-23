import { hashPassword } from "./_auth.js";
import { isAdminAuthorized, isAdminConfigured } from "./_admin.js";
import { getSql } from "./_db.js";

type Request = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};
type Response = {
  status: (code: number) => Response;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
};
type Input = { name?: unknown; email?: unknown; password?: unknown };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function assertBootstrapSchema() {
  const rows = await getSql()`
    select
      to_regclass('public.operator_sessions') is not null as operator_sessions_ready,
      exists(select 1 from information_schema.columns where table_schema='public' and table_name='operators' and column_name='password_hash') as password_hash_ready,
      exists(select 1 from information_schema.columns where table_schema='public' and table_name='operators' and column_name='plant_ids') as plant_ids_ready,
      exists(select 1 from information_schema.columns where table_schema='public' and table_name='settlements' and column_name='price_per_kg_clp') as settlement_ready
  `;
  const row=Array.isArray(rows)?rows[0] as Record<string,unknown>|undefined:undefined;
  if(!row||!row.operator_sessions_ready||!row.password_hash_ready||!row.plant_ids_ready||!row.settlement_ready)
    throw new Error('BOOTSTRAP_MIGRATIONS_REQUIRED');
}

export default async function handler(request: Request, response: Response) {
  response.setHeader("Cache-Control", "no-store");
  try {
    if (request.method !== "POST") {
      response.setHeader("Allow", "POST");
      return response.status(405).json({ ok: false, error: "Método no permitido" });
    }
    if (!isAdminConfigured())
      return response.status(503).json({ ok: false, error: "Bootstrap administrativo no configurado" });
    if (!isAdminAuthorized(request))
      return response.status(401).json({ ok: false, error: "Clave de activación inválida" });

    await assertBootstrapSchema();
    const sql = getSql();
    const existing = await sql`select id from operators where role='admin' and active=true and password_hash is not null limit 1`;
    if (Array.isArray(existing) && existing.length)
      return response.status(409).json({ ok: false, error: "La activación inicial ya fue completada" });

    const input = (request.body ?? {}) as Input;
    const name = String(input.name ?? "").trim();
    const email = String(input.email ?? "").trim().toLowerCase();
    const password = String(input.password ?? "");
    if (name.length < 2 || name.length > 120 || !emailPattern.test(email) || email.length > 254 || password.length < 12 || password.length > 256)
      return response.status(400).json({ ok: false, error: "Nombre, correo y contraseña de 12 a 256 caracteres son obligatorios" });

    const passwordHash = hashPassword(password);
    const rows = await sql`
      insert into operators (full_name,email,role,password_hash,active)
      values (${name},${email},'admin',${passwordHash},true)
      on conflict (lower(email)) do update
      set full_name=excluded.full_name,role='admin',password_hash=excluded.password_hash,active=true,updated_at=now()
      returning id,full_name,email,role
    `;
    return response.status(201).json({ ok: true, operator: Array.isArray(rows) ? rows[0] : null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const configuration = message.includes("DATABASE_URL");
    const migration = message.includes('BOOTSTRAP_MIGRATIONS_REQUIRED')||message.includes('operator_sessions')||message.includes('password_hash');
    return response.status(configuration || migration ? 503 : 500).json({
      ok: false,
      error: configuration
        ? "Base de datos no conectada"
        : migration
          ? "Faltan migraciones requeridas para activar el administrador"
          : "No fue posible completar la activación inicial",
    });
  }
}

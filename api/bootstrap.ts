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

async function ensureAuthSchema() {
  const sql = getSql();
  await sql`alter table operators add column if not exists password_hash text`;
  await sql`alter table operators add column if not exists plant_ids text[] not null default '{}'`;
  await sql`create table if not exists operator_sessions (
    token_hash text primary key,
    operator_id uuid not null references operators(id) on delete cascade,
    created_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now(),
    expires_at timestamptz not null
  )`;
  await sql`create index if not exists operator_sessions_operator_idx on operator_sessions (operator_id, expires_at desc)`;
  await sql`create index if not exists operator_sessions_expiry_idx on operator_sessions (expires_at)`;
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

    await ensureAuthSchema();
    const sql = getSql();
    const existing = await sql`select id from operators where role='admin' and active=true and password_hash is not null limit 1`;
    if (Array.isArray(existing) && existing.length)
      return response.status(409).json({ ok: false, error: "La activación inicial ya fue completada" });

    const input = (request.body ?? {}) as Input;
    const name = String(input.name ?? "").trim();
    const email = String(input.email ?? "").trim().toLowerCase();
    const password = String(input.password ?? "");
    if (name.length < 2 || name.length > 120 || !emailPattern.test(email) || email.length > 254 || password.length < 12)
      return response.status(400).json({ ok: false, error: "Nombre, correo y contraseña de al menos 12 caracteres son obligatorios" });

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
    const configuration = error instanceof Error && error.message.includes("DATABASE_URL");
    return response.status(configuration ? 503 : 500).json({
      ok: false,
      error: configuration ? "Base de datos no conectada" : "No fue posible completar la activación inicial",
    });
  }
}

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

async function ensureSettlementSchemaForEmptyDatabase() {
  const sql = getSql();
  const columns = await sql`
    select table_name,column_name
    from information_schema.columns
    where table_schema='public' and (
      (table_name='receptions' and column_name='guide_kg') or
      (table_name='settlements' and column_name in (
        'price_per_kg_clp','credit_recovery_clp','created_by','approved_by',
        'calculation_snapshot','updated_at'
      ))
    )
  `;
  const present = new Set(
    (columns as Array<{ table_name: string; column_name: string }>).map(
      (row) => `${row.table_name}.${row.column_name}`,
    ),
  );
  const required = [
    'receptions.guide_kg',
    'settlements.price_per_kg_clp',
    'settlements.credit_recovery_clp',
    'settlements.created_by',
    'settlements.approved_by',
    'settlements.calculation_snapshot',
    'settlements.updated_at',
  ];
  if (required.every((column) => present.has(column))) return;

  const counts = await sql`
    select
      (select count(*)::int from receptions) as receptions,
      (select count(*)::int from settlements) as settlements,
      (select count(*)::int from credit_requests) as credit_requests,
      (select count(*)::int from credit_movements) as credit_movements,
      (select count(*)::int from approval_actions) as approval_actions
  `;
  const row = Array.isArray(counts)
    ? (counts[0] as Record<string, number> | undefined)
    : undefined;
  const hasOperationalData = row
    ? Object.values(row).some((value) => Number(value) > 0)
    : true;
  if (hasOperationalData)
    throw new Error('MIGRATION_002_MANUAL_REQUIRED');

  await sql`alter table receptions add column if not exists guide_kg numeric(12,3)`;
  await sql`alter table receptions alter column guide_kg set not null`;
  await sql`alter table receptions drop constraint if exists receptions_guide_kg_check`;
  await sql`alter table receptions add constraint receptions_guide_kg_check check (guide_kg >= 0)`;

  await sql`alter table settlements add column if not exists price_per_kg_clp bigint`;
  await sql`alter table settlements add column if not exists credit_recovery_clp bigint not null default 0`;
  await sql`alter table settlements add column if not exists created_by text`;
  await sql`alter table settlements add column if not exists approved_by text`;
  await sql`alter table settlements add column if not exists calculation_snapshot jsonb not null default '{}'::jsonb`;
  await sql`alter table settlements add column if not exists updated_at timestamptz not null default now()`;
  await sql`alter table settlements alter column price_per_kg_clp set not null`;
  await sql`alter table settlements alter column created_by set not null`;
  await sql`alter table settlements drop constraint if exists settlements_price_check`;
  await sql`alter table settlements add constraint settlements_price_check check (price_per_kg_clp > 0)`;
  await sql`alter table settlements drop constraint if exists settlements_recovery_check`;
  await sql`alter table settlements add constraint settlements_recovery_check check (credit_recovery_clp >= 0)`;
  await sql`alter table settlements drop constraint if exists settlements_net_check`;
  await sql`alter table settlements add constraint settlements_net_check check (net_amount_clp is null or net_amount_clp >= 0)`;
  await sql`create unique index if not exists credit_movements_advance_request_unique on credit_movements (credit_request_id) where kind='advance'`;
  await sql`create unique index if not exists credit_movements_recovery_settlement_unique on credit_movements (settlement_id) where kind='recovery'`;
  await sql`create index if not exists settlements_status_created_idx on settlements (status, created_at desc)`;
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

    await ensureSettlementSchemaForEmptyDatabase();
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
    const manualMigration = message.includes('MIGRATION_002_MANUAL_REQUIRED');
    return response.status(configuration ? 503 : manualMigration ? 409 : 500).json({
      ok: false,
      error: configuration
        ? "Base de datos no conectada"
        : manualMigration
          ? "La base contiene datos operacionales y requiere aplicar 002_settlement_workflow.sql manualmente antes de activar el acceso"
          : "No fue posible completar la activación inicial",
    });
  }
}

import { getSql } from "./_db.js";

declare const process: { env: Record<string, string | undefined> };
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
type OperatorInput = { name?: unknown; email?: unknown; role?: unknown };
const roles = new Set(["admin", "operations", "finance", "quality", "viewer"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function authorized(request: Request) {
  const expected = process.env.ADMIN_SETUP_TOKEN;
  const header = request.headers?.authorization;
  const supplied =
    (Array.isArray(header) ? header[0] : header)?.replace(/^Bearer\s+/i, "") ??
    "";
  if (!expected || expected.length < 24 || !supplied) return false;
  let difference = expected.length ^ supplied.length;
  for (let index = 0; index < expected.length; index++)
    difference |= expected.charCodeAt(index) ^ (supplied.charCodeAt(index) || 0);
  return difference === 0;
}

export default async function handler(request: Request, response: Response) {
  response.setHeader("Cache-Control", "no-store");
  if (!process.env.ADMIN_SETUP_TOKEN || process.env.ADMIN_SETUP_TOKEN.length < 24)
    return response
      .status(503)
      .json({
        ok: false,
        error: "Panel de operadores pendiente de activación",
      });
  if (!authorized(request))
    return response
      .status(401)
      .json({ ok: false, error: "Autorización administrativa inválida" });
  try {
    if (request.method === "GET") {
      const rows =
        await getSql()`select id,full_name,email,role,active,created_at from operators order by active desc,full_name asc`;
      return response.status(200).json({ ok: true, operators: rows });
    }
    if (request.method === "POST") {
      const input = (request.body ?? {}) as OperatorInput;
      const name = String(input.name ?? "").trim(),
        email = String(input.email ?? "")
          .trim()
          .toLowerCase(),
        role = String(input.role ?? "");
      if (
        name.length < 2 ||
        name.length > 120 ||
        !emailPattern.test(email) ||
        email.length > 254 ||
        !roles.has(role)
      )
        return response
          .status(400)
          .json({ ok: false, error: "Nombre, correo o rol inválido" });
      const rows =
        await getSql()`insert into operators (full_name,email,role) values (${name},${email},${role}) on conflict (lower(email)) do update set full_name=excluded.full_name,role=excluded.role,active=true,updated_at=now() returning id,full_name,email,role,active,created_at`;
      return response
        .status(201)
        .json({ ok: true, operator: Array.isArray(rows) ? rows[0] : null });
    }
    response.setHeader("Allow", "GET, POST");
    return response
      .status(405)
      .json({ ok: false, error: "Método no permitido" });
  } catch (error) {
    const configuration =
      error instanceof Error && error.message.includes("DATABASE_URL");
    return response
      .status(configuration ? 503 : 500)
      .json({
        ok: false,
        error: configuration
          ? "Base de datos no conectada"
          : "No fue posible administrar operadores",
      });
  }
}

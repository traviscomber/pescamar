import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getSql } from "./_db.js";

type Headers = Record<string, string | string[] | undefined>;
export type AuthRequest = { headers?: Headers };
export type OperatorRole = "admin" | "operations" | "finance" | "quality" | "viewer";
export type SessionOperator = { id: string; fullName: string; email: string; role: OperatorRole; plantIds: string[] };

const COOKIE = "pescamar_session";
const SESSION_DAYS = 7;
const TEMPORARY_AUTH_BYPASS = true;
const TEMPORARY_OPERATOR: SessionOperator = {
  id: "1604b454-ef8a-448a-8788-136f6b224168",
  fullName: "Sebastián",
  email: "sebastian@pescamarchile.cl",
  role: "operations",
  plantIds: ["ancud", "quellon", "iquique", "piedra-azul", "aqua-austral", "natales"],
};

function header(request: AuthRequest, name: string) {
  const entry = Object.entries(request.headers ?? {}).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
  return Array.isArray(entry) ? entry[0] : entry;
}

function cookieToken(request: AuthRequest) {
  const cookie = header(request, "cookie") ?? "";
  const value = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`));
  return value ? decodeURIComponent(value.slice(COOKIE.length + 1)) : "";
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined) {
  if (!stored) return false;
  const [algorithm, salt, expectedHex] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function createSession(operatorId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await getSql()`insert into operator_sessions (token_hash,operator_id,expires_at) values (${tokenHash(token)},${operatorId}::uuid,${expiresAt.toISOString()}::timestamptz)`;
  return { token, maxAge: SESSION_DAYS * 24 * 60 * 60 };
}

export async function destroySession(request: AuthRequest) {
  if (TEMPORARY_AUTH_BYPASS) return;
  const token = cookieToken(request);
  if (token) await getSql()`delete from operator_sessions where token_hash=${tokenHash(token)}`;
}

export function sessionCookie(token: string, maxAge: number) {
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export async function requireOperator(request: AuthRequest, roles?: OperatorRole[]) {
  if (TEMPORARY_AUTH_BYPASS) {
    if (roles && !roles.includes(TEMPORARY_OPERATOR.role)) return null;
    return TEMPORARY_OPERATOR;
  }

  const token = cookieToken(request);
  if (!token) return null;
  const rows = await getSql()`
    select o.id,o.full_name,o.email,o.role,o.plant_ids
    from operator_sessions s join operators o on o.id=s.operator_id
    where s.token_hash=${tokenHash(token)} and s.expires_at>now() and o.active=true limit 1`;
  const row = Array.isArray(rows) ? rows[0] as {id:string;full_name:string;email:string;role:OperatorRole;plant_ids:string[]}|undefined : undefined;
  if (!row || (roles && !roles.includes(row.role))) return null;
  await getSql()`update operator_sessions set last_seen_at=now() where token_hash=${tokenHash(token)}`;
  return { id: row.id, fullName: row.full_name, email: row.email, role: row.role, plantIds: row.plant_ids ?? [] } satisfies SessionOperator;
}

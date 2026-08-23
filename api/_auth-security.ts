import { createHash } from "node:crypto";
import { getSql } from "./_db.js";

type Request = { headers?: Record<string, string | string[] | undefined> };
type EventType = "login_success" | "login_failure" | "login_rate_limited" | "logout";

const WINDOW_MINUTES = 15;
const PAIR_LIMIT = 5;
const IP_LIMIT = 30;

function header(request: Request, name: string) {
  const value = Object.entries(request.headers ?? {}).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
  return Array.isArray(value) ? value[0] : value;
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function clientIp(request: Request) {
  const forwarded = header(request, "x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || header(request, "x-real-ip") || "unknown").slice(0, 128);
}

function keys(request: Request, email: string) {
  const ip = clientIp(request);
  return {
    ipHash: digest(ip),
    emailHash: digest(email),
    pairKey: digest(`pair:${ip}:${email}`),
    ipKey: digest(`ip:${ip}`),
  };
}

async function blocked(keyHash: string) {
  const rows = await getSql()`select coalesce(blocked_until > now(), false) as blocked,
    greatest(0,ceil(extract(epoch from (blocked_until-now()))))::int as retry_after
    from auth_login_limits where key_hash=${keyHash} limit 1`;
  const row = Array.isArray(rows) ? rows[0] as { blocked?: unknown; retry_after?: unknown } | undefined : undefined;
  return { blocked: row?.blocked === true, retryAfter: Number(row?.retry_after ?? 0) };
}

export async function loginRateState(request: Request, email: string) {
  const value = keys(request, email);
  const [pair, ip] = await Promise.all([blocked(value.pairKey), blocked(value.ipKey)]);
  return {
    ...value,
    blocked: pair.blocked || ip.blocked,
    retryAfter: Math.max(pair.retryAfter, ip.retryAfter, 0),
  };
}

async function bumpFailure(keyHash: string, limit: number) {
  await getSql()`insert into auth_login_limits(key_hash,attempts,window_started_at,blocked_until,updated_at)
    values(${keyHash},1,now(),null,now())
    on conflict(key_hash) do update set
      attempts=case when auth_login_limits.window_started_at < now()-(${WINDOW_MINUTES}||' minutes')::interval then 1 else auth_login_limits.attempts+1 end,
      window_started_at=case when auth_login_limits.window_started_at < now()-(${WINDOW_MINUTES}||' minutes')::interval then now() else auth_login_limits.window_started_at end,
      blocked_until=case
        when (case when auth_login_limits.window_started_at < now()-(${WINDOW_MINUTES}||' minutes')::interval then 1 else auth_login_limits.attempts+1 end) >= ${limit}
          then now()+(${WINDOW_MINUTES}||' minutes')::interval
        when auth_login_limits.window_started_at < now()-(${WINDOW_MINUTES}||' minutes')::interval then null
        else auth_login_limits.blocked_until
      end,
      updated_at=now()`;
}

export async function recordLoginFailure(request: Request, email: string) {
  const value = keys(request, email);
  await Promise.all([bumpFailure(value.pairKey, PAIR_LIMIT), bumpFailure(value.ipKey, IP_LIMIT)]);
  await recordAuthEvent("login_failure", request, email, null, {});
}

export async function clearSuccessfulPair(request: Request, email: string) {
  const value = keys(request, email);
  await getSql()`delete from auth_login_limits where key_hash=${value.pairKey}`;
}

export async function recordAuthEvent(
  eventType: EventType,
  request: Request,
  email: string,
  operatorId: string | null,
  metadata: Record<string, unknown>,
) {
  const value = keys(request, email);
  await getSql()`insert into auth_events(event_type,operator_id,email_hash,ip_hash,metadata)
    values(${eventType},${operatorId}::uuid,${value.emailHash},${value.ipHash},${JSON.stringify(metadata)}::jsonb)`;
}

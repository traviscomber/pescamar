# Security notes

Security audit pass results and deliberately deferred items. Complements `docs/RUNBOOK.md` §5 (secretos) and §7 (incidentes).

## Verified sound (no change needed)

- **Sessions** (`api/_auth.ts`): login rotates the token (old session destroyed before a fresh random 256-bit token is issued — no fixation); logout deletes the server-side row; fixed 7-day `expires_at` enforced on every read (`expires_at > now()`); `last_seen_at` touch never extends expiry; lookup is by SHA-256 of the token, so there is no user-enumerable comparison; cookie is `HttpOnly; Secure; SameSite=Strict` on both set and clear paths.
- **AUTH_BYPASS / TEMPORARY_OPERATOR**: no bypass code exists; `scripts/release-smoke.mjs` fails the release if such code is ever reintroduced. There is nothing to enable, silently or not.
- **Write enforcement**: every POST/PUT/PATCH/DELETE endpoint in `api/` authenticates via `requireOperator` (with server-side role lists) or `isAdminAuthorized` (bootstrap). No endpoint trusts client-sent operator identity — actor columns are always `operator.id`/`operator.fullName` from the session. PILOT acceptance rule "APIs reject writes regardless of UI" holds.
- **Input validation**: reception, settlement, credit, sensor and webhook writes use explicit column allowlists (no mass assignment) and parameterized `` sql```` templates throughout; numerics go through `Number.isFinite`/`Number.isSafeInteger` with cross-field invariants.
- **Secrets hygiene**: no secret-like material is committed; all secrets come from env vars (`DATABASE_URL`, `ADMIN_SETUP_TOKEN`, `COLD_SENSOR_INGEST_SECRET`, `WHATSAPP_WEBHOOK_SECRET`, `NEON_API_KEY` in CI only).

## Hardened in the audit pass

- Login timing equalizer: unknown emails now verify against a dummy scrypt hash so response time does not reveal account existence (`api/auth.ts`).
- In-memory per-IP sliding-window rate limits (`api/_rate-limit.ts`, pilot-events pattern): WhatsApp webhook 120/min, cold-sensor ingest 30/min, admin bootstrap 10/min.
- WhatsApp webhook secret comparison is now constant-time (`timingSafeEqual`) and the header `x-pescamar-webhook-key` is accepted alongside the legacy `?secret=` query param.

## Deferred (real issue, documented instead of fixed)

| Severity | Item | Recommended fix |
|---|---|---|
| Low | WhatsApp webhook shared secret may still travel as `?secret=` in the URL because that is how the provider integration was wired; URLs can land in access/proxy logs. The header alternative (`x-pescamar-webhook-key`) is implemented and preferred, but removing query support is a provider-side change. | Reconfigure the provider to send the header (or rotate to per-instance tokens), then delete the `?secret=` branch in `api/whatsapp-webhook.ts` (`suppliedSecret`). |
| Low | In-memory rate limits are per function instance; under multi-instance scale they bound, not prevent, floods. | Move hot buckets to Postgres (same shape as `auth_login_limits`) when the deployment grows beyond the single-function pilot surface. |

## Rotación de secretos (RUNBOOK §5 complemento)

If any shared secret is suspected leaked: rotate in Vercel env vars, then force re-authentication (sessions are server-side rows — delete from `operator_sessions` to log everyone out) and review `auth_events` / `whatsapp_messages_raw` for the exposure window.

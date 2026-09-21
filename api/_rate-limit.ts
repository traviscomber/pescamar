// In-memory sliding-window rate limiting for machine-facing and bootstrap endpoints.
// Follows the pilot-events pattern: per-key Map buckets, no external deps,
// best-effort per instance (sufficient behind Vercel's single-function pilot surface).

type Request = { headers?: Record<string, string | string[] | undefined> };

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const SWEEP_THRESHOLD = 400;

function header(request: Request, name: string) {
  const value = Object.entries(request.headers ?? {}).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
  return Array.isArray(value) ? value[0] : value;
}

export function clientIp(request: Request) {
  const forwarded = header(request, "x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || header(request, "x-real-ip") || "unknown").slice(0, 128);
}

export function allowKeyedRequest(key: string, windowMs: number, max: number) {
  const now = Date.now();
  if (buckets.size > SWEEP_THRESHOLD) for (const [bucketKey, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(bucketKey);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}

export function allowClientIp(request: Request, windowMs: number, max: number) {
  return allowKeyedRequest(`ip:${clientIp(request)}`, windowMs, max);
}

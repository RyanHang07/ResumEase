const buckets = new Map<string, { count: number; resetAt: number }>();
// ponytail: process-local only — ceiling is per serverless isolate; upgrade path = Upstash/Vercel KV (GFI #1)

export const COMPILE_WINDOW_MS = 60_000;
export const COMPILE_LIMIT_PER_IP = 10;
export const COMPILE_LIMIT_PER_USER = 20;

export const consumeRateLimit = (
  key: string,
  limit: number,
  windowMs: number = COMPILE_WINDOW_MS
): { ok: boolean; retryAfterSec: number } => {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: Math.ceil(windowMs / 1000) };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { ok: true, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) };
};

/**
 * Prefer platform-set client IP headers. Do not trust the leftmost
 * X-Forwarded-For hop alone (easy to spoof when the edge does not overwrite).
 * Tradeoff: still in-memory per isolate; durable limits need a shared store.
 */
export const getClientIp = (headers: Headers): string => {
  const vercel = headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
  if (vercel) return vercel;

  const realIp = headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  const cf = headers.get('cf-connecting-ip')?.trim();
  if (cf) return cf;

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((part) => part.trim()).filter(Boolean);
    // Use the rightmost hop: closest to our edge when proxies append.
    const edgeClient = parts[parts.length - 1];
    if (edgeClient) return edgeClient;
  }

  return 'unknown';
};

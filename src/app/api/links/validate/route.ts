import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  COMPILE_LIMIT_PER_IP,
  COMPILE_LIMIT_PER_USER,
  consumeRateLimit,
  getClientIp,
} from '@/lib/rateLimit';
import { assertPublicHttpUrl, parseSafeHttpUrl } from '@/lib/ssrf';

const LINK_TIMEOUT_MS = 8_000;
const MAX_URLS = 10;
const MAX_REDIRECTS = 3;
const MAX_BODY_LENGTH = 100_000;

const fetchWithoutUnsafeRedirect = async (
  startUrl: string,
  method: 'HEAD' | 'GET',
  signal: AbortSignal
): Promise<{ ok: boolean; status: number }> => {
  let current = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const parsed = await assertPublicHttpUrl(current);
    if (!parsed) return { ok: false, status: 0 };

    const response = await fetch(parsed.toString(), {
      method,
      redirect: 'manual',
      signal,
      headers: { 'User-Agent': 'ResumEase-LinkCheck/1.0' },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) return { ok: false, status: response.status };
      current = new URL(location, parsed).toString();
      continue;
    }

    return { ok: response.ok, status: response.status };
  }

  return { ok: false, status: 0 };
};

export async function POST(request: NextRequest) {
  try {
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 415 }
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Sign in required to verify links.' },
        { status: 401 }
      );
    }

    const ip = getClientIp(request.headers);
    const ipLimit = consumeRateLimit(`links:ip:${ip}`, COMPILE_LIMIT_PER_IP);
    if (!ipLimit.ok) {
      return NextResponse.json(
        { error: 'Too many link checks. Try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSec) } }
      );
    }

    const userLimit = consumeRateLimit(`links:user:${userId}`, COMPILE_LIMIT_PER_USER);
    if (!userLimit.ok) {
      return NextResponse.json(
        { error: 'Too many link checks. Try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(userLimit.retryAfterSec) } }
      );
    }

    const rawBody = await request.text();
    if (rawBody.length > MAX_BODY_LENGTH) {
      return NextResponse.json({ error: 'Request body is too large' }, { status: 413 });
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
    }

    const urls =
      typeof body === 'object' &&
      body !== null &&
      Array.isArray((body as { urls?: unknown }).urls)
        ? (body as { urls: unknown[] }).urls
        : [];
    if (urls.length === 0) {
      return NextResponse.json({ error: 'urls array is required' }, { status: 400 });
    }
    if (urls.length > MAX_URLS) {
      return NextResponse.json({ error: `At most ${MAX_URLS} URLs per request` }, { status: 413 });
    }

    const results = await Promise.all(
      urls.map(async (raw: unknown) => {
        if (typeof raw !== 'string' || !parseSafeHttpUrl(raw)) {
          return { url: String(raw ?? ''), ok: false, status: 0 };
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), LINK_TIMEOUT_MS);
        try {
          try {
            return {
              url: raw,
              ...(await fetchWithoutUnsafeRedirect(raw, 'HEAD', controller.signal)),
            };
          } catch {
            return {
              url: raw,
              ...(await fetchWithoutUnsafeRedirect(raw, 'GET', controller.signal)),
            };
          }
        } catch {
          return { url: raw, ok: false, status: 0 };
        } finally {
          clearTimeout(timeoutId);
        }
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Link validate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

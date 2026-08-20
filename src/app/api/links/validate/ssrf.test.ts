import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: 'user_test' })),
}));

vi.mock('@/lib/rateLimit', () => ({
  COMPILE_LIMIT_PER_IP: 100,
  COMPILE_LIMIT_PER_USER: 100,
  consumeRateLimit: () => ({ ok: true, retryAfterSec: 60 }),
  getClientIp: () => '127.0.0.1',
}));

describe('POST /api/links/validate body cap', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('rejects oversized bodies with 413', async () => {
    const { POST } = await import('./route');
    const raw = `{"urls":["https://example.com"],"pad":"${'x'.repeat(100_001)}"}`;
    const request = new Request('http://localhost/api/links/validate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: raw,
    });
    const response = await POST(request as never);
    expect(response.status).toBe(413);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createSampleResume } from '@/lib/sampleData';
import { MAX_SAVED_RESUMES, SAVED_RESUME_EXPIRY_START } from '@/lib/savedResumes';

type FakeBlob = { pathname: string; url: string; uploadedAt: Date; body: string };

const store = new Map<string, FakeBlob>();
let userId: string | null = 'user_1';

vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId }),
}));

vi.mock('@vercel/blob', () => ({
  list: async ({ prefix }: { prefix: string }) => ({
    blobs: [...store.values()].filter((blob) => blob.pathname.startsWith(prefix)),
  }),
  get: async (pathname: string) => {
    const blob = store.get(pathname);
    if (!blob) return null;
    return { statusCode: 200, stream: new Response(blob.body).body };
  },
  put: async (pathname: string, body: string, options: { allowOverwrite?: boolean }) => {
    if (store.has(pathname) && !options.allowOverwrite) {
      throw new Error('blob already exists');
    }
    store.set(pathname, { pathname, url: `https://blob/${pathname}`, uploadedAt: new Date(), body });
    return { pathname };
  },
  del: async (pathnames: string | string[]) => {
    for (const pathname of [pathnames].flat()) store.delete(pathname);
  },
}));

const { DELETE, GET, PATCH, POST } = await import('@/app/api/resumes/route');

const DAY_MS = 24 * 60 * 60 * 1000;
const get = (query = '') => GET(new NextRequest(`http://localhost/api/resumes${query}`));
const pin = (baseId: string | null) =>
  PATCH(
    new NextRequest('http://localhost/api/resumes', {
      method: 'PATCH',
      body: JSON.stringify({ baseId }),
    })
  );

const save = (name: string) =>
  POST(
    new NextRequest('http://localhost/api/resumes', {
      method: 'POST',
      body: JSON.stringify({ name, templateId: 'classic', data: createSampleResume() }),
    })
  );

const seed = (id: string, uploadedAt = new Date()) => {
  const pathname = `resumes/user_1/${id}.json`;
  store.set(pathname, {
    pathname,
    url: `https://blob/${pathname}`,
    uploadedAt,
    body: JSON.stringify({
      id,
      name: id,
      templateId: 'classic',
      data: createSampleResume(),
      savedAt: uploadedAt.toISOString(),
    }),
  });
};

beforeEach(() => {
  store.clear();
  userId = 'user_1';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('POST /api/resumes', () => {
  it('overwrites a save with the same name instead of duplicating', async () => {
    const first = await (await save('Acme SWE')).json();
    const second = await (await save('acme  swe')).json();

    expect(store.size).toBe(1);
    expect(first.resume.id).toBe('acme-swe');
    expect(second.overwritten).toBe(true);
    expect(second.resume.savedAt >= first.resume.savedAt).toBe(true);
  });

  it('enforces the cap for new names but still allows overwrites', async () => {
    for (let i = 0; i < MAX_SAVED_RESUMES; i += 1) seed(`save-${i}`);

    const blocked = await save('Brand New');
    expect(blocked.status).toBe(400);

    const overwrite = await save('save-3');
    expect(overwrite.status).toBe(200);
    expect(store.size).toBe(MAX_SAVED_RESUMES);
  });

  it('rejects names with no usable characters', async () => {
    const response = await save('!!!');
    expect(response.status).toBe(400);
    expect(store.size).toBe(0);
  });

  it('requires auth', async () => {
    userId = null;
    expect((await save('Acme')).status).toBe(401);
  });
});

describe('GET /api/resumes', () => {
  it('deletes saves untouched for 90 days, counting old saves from the clock start', async () => {
    const start = new Date(SAVED_RESUME_EXPIRY_START).getTime();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(start + 100 * DAY_MS));
    seed('fresh', new Date(start + 50 * DAY_MS));
    seed('stale', new Date(start + 5 * DAY_MS));
    seed('pre-existing', new Date('2025-01-01T00:00:00Z'));

    const payload = await (await get()).json();

    expect(payload.resumes.map((resume: { id: string }) => resume.id)).toEqual(['fresh']);
    expect(store.has('resumes/user_1/stale.json')).toBe(false);
  });

  it('keeps pre-existing saves before the clock runs out', async () => {
    seed('pre-existing', new Date('2025-01-01T00:00:00Z'));
    const payload = await (await get()).json();
    expect(payload.resumes).toHaveLength(1);
  });
});

describe('base resume pin', () => {
  it('pins, returns, and exempts the base from expiry', async () => {
    const start = new Date(SAVED_RESUME_EXPIRY_START).getTime();
    seed('base-resume', new Date(start));
    seed('other', new Date(start));

    expect((await pin('base-resume')).status).toBe(200);
    expect((await (await get()).json()).baseId).toBe('base-resume');
    expect((await (await get('?base=1')).json()).resume.id).toBe('base-resume');

    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(start + 200 * DAY_MS));
    const payload = await (await get()).json();
    expect(payload.resumes.map((resume: { id: string }) => resume.id)).toEqual(['base-resume']);
  });

  it('rejects unknown or unsafe ids and clears with null', async () => {
    seed('a');
    expect((await pin('missing')).status).toBe(404);
    expect((await pin('../x')).status).toBe(400);
    await pin('a');
    await pin(null);
    expect((await (await get()).json()).baseId).toBeNull();
    expect((await (await get('?base=1')).json()).resume).toBeNull();
  });

  it('clears the pin when the base save is deleted', async () => {
    seed('a');
    await pin('a');
    await DELETE(new NextRequest('http://localhost/api/resumes?id=a', { method: 'DELETE' }));
    expect(store.has('resume-meta/user_1/base.json')).toBe(false);
  });
});

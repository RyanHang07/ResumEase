import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createSampleResume } from '@/lib/sampleData';
import { MAX_SAVED_RESUMES } from '@/lib/savedResumes';

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

const { GET, POST } = await import('@/app/api/resumes/route');

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
  it('deletes saves older than the expiry window', async () => {
    seed('fresh');
    seed('stale', new Date(Date.now() - 91 * 24 * 60 * 60 * 1000));

    const payload = await (await GET()).json();

    expect(payload.resumes.map((resume: { id: string }) => resume.id)).toEqual(['fresh']);
    expect(store.has('resumes/user_1/stale.json')).toBe(false);
  });
});

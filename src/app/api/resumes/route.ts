import { NextRequest, NextResponse } from 'next/server';
import { del, get, list, put } from '@vercel/blob';
import { auth } from '@clerk/nextjs/server';
import { Resume, SavedResume } from '@/types/resume';
import { migrateResume } from '@/lib/migrations';
import {
  MAX_SAVED_RESUMES,
  isSavedResumeExpired,
  savedResumeId,
} from '@/lib/savedResumes';

const MAX_RESUME_PAYLOAD_LENGTH = 100_000;
const MAX_RESUME_NAME_LENGTH = 80;
const BLOB_ACCESS = 'private' as const;

// Trust boundary: path is always derived from auth userId + resumeId — never a client pathname.
const resumePath = (userId: string, resumeId: string) => {
  if (
    !userId ||
    !resumeId ||
    resumeId.includes('/') ||
    resumeId.includes('\\') ||
    resumeId.includes('..')
  ) {
    throw new Error('Invalid resume path');
  }
  return `resumes/${userId}/${resumeId}.json`;
};

const isResumeLike = (value: unknown): value is Resume => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const resume = value as Record<string, unknown>;
  return (
    typeof resume.header === 'object' &&
    resume.header !== null &&
    Array.isArray(resume.sections)
  );
};

// Lives outside the resumes/ prefix so it is never listed, counted, or expired as a save
const basePointerPath = (userId: string) => `resume-meta/${userId}/base.json`;

const readBlobJson = async <T>(pathname: string): Promise<T | null> => {
  const result = await get(pathname, { access: BLOB_ACCESS });
  if (!result || result.statusCode !== 200 || !result.stream) {
    return null;
  }
  return JSON.parse(await new Response(result.stream).text()) as T;
};

const readBaseId = async (userId: string): Promise<string | null> => {
  try {
    const pointer = await readBlobJson<{ id?: unknown }>(basePointerPath(userId));
    return typeof pointer?.id === 'string' ? pointer.id : null;
  } catch {
    return null;
  }
};

type BlobListing = Awaited<ReturnType<typeof list>>['blobs'];

// ponytail: expiry runs lazily on list/save instead of a cron; uploadedAt bumps on every overwrite
const listLiveResumeBlobs = async (
  userId: string,
  baseId: string | null
): Promise<BlobListing> => {
  const { blobs } = await list({ prefix: `resumes/${userId}/`, limit: 1000 });
  const basePathname = baseId ? resumePath(userId, baseId) : null;
  const isExpired = (blob: BlobListing[number]) =>
    blob.pathname !== basePathname && isSavedResumeExpired(blob.uploadedAt);
  const expired = blobs.filter(isExpired);
  if (expired.length > 0) {
    await del(expired.map((blob) => blob.pathname));
  }
  return blobs.filter((blob) => !isExpired(blob));
};

const readSavedResume = async (pathname: string): Promise<SavedResume | null> => {
  const resume = await readBlobJson<SavedResume>(pathname);
  if (!resume) return null;
  try {
    return { ...resume, data: migrateResume(resume.data) };
  } catch (error) {
    console.error('Failed to migrate saved resume', resume.id, error);
    return null;
  }
};

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const baseId = await readBaseId(userId);

      if (new URL(request.url).searchParams.get('base') === '1') {
        const resume = baseId ? await readSavedResume(resumePath(userId, baseId)) : null;
        return NextResponse.json({ resume });
      }

      const blobs = await listLiveResumeBlobs(userId, baseId);
      const resumes = (
        await Promise.all(blobs.map((blob) => readSavedResume(blob.pathname)))
      ).flatMap((resume) => (resume ? [resume] : []));

      resumes.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
      return NextResponse.json({
        resumes,
        baseId: resumes.some((resume) => resume.id === baseId) ? baseId : null,
      });
    } catch (storageError) {
      console.error('Resume storage error:', storageError);
      return NextResponse.json(
        { error: 'Resume storage is not properly configured' },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Error fetching resumes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resumes' },
      { status: 500 }
    );
  }
}

/** Pins one save as the base resume (body `{ baseId: string }`) or clears it (`{ baseId: null }`). */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: unknown = await request.json().catch(() => undefined);
    const baseId =
      typeof body === 'object' && body !== null && 'baseId' in body
        ? (body as { baseId: unknown }).baseId
        : undefined;

    if (baseId !== null && typeof baseId !== 'string') {
      return NextResponse.json({ error: 'Invalid base payload' }, { status: 400 });
    }

    try {
      if (baseId === null) {
        await del(basePointerPath(userId));
        return NextResponse.json({ baseId: null });
      }

      const pathname = resumePath(userId, baseId);
      const blobs = await listLiveResumeBlobs(userId, await readBaseId(userId));
      if (!blobs.some((blob) => blob.pathname === pathname)) {
        return NextResponse.json({ error: 'Saved resume not found' }, { status: 404 });
      }

      await put(basePointerPath(userId), JSON.stringify({ id: baseId }), {
        access: BLOB_ACCESS,
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
      });
      return NextResponse.json({ baseId });
    } catch (storageError) {
      if (storageError instanceof Error && storageError.message === 'Invalid resume path') {
        return NextResponse.json({ error: 'Invalid resume ID' }, { status: 400 });
      }
      console.error('Resume storage error:', storageError);
      return NextResponse.json(
        { error: 'Resume storage is not properly configured' },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Error setting base resume:', error);
    return NextResponse.json({ error: 'Failed to set base resume' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawBody = await request.text();

    if (rawBody.length > MAX_RESUME_PAYLOAD_LENGTH) {
      return NextResponse.json(
        { error: 'Resume payload is too large' },
        { status: 413 }
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
        { status: 400 }
      );
    }

    const payload = body as Record<string, unknown>;
    const { name, templateId, data } = payload;

    if (
      typeof name !== 'string' ||
      !name.trim() ||
      name.length > MAX_RESUME_NAME_LENGTH ||
      typeof templateId !== 'string' ||
      !templateId.trim() ||
      !isResumeLike(data)
    ) {
      return NextResponse.json(
        { error: 'Invalid resume payload' },
        { status: 400 }
      );
    }

    const id = savedResumeId(name);
    if (!id) {
      return NextResponse.json(
        { error: 'Resume name needs at least one letter or number' },
        { status: 400 }
      );
    }

    try {
      const pathname = resumePath(userId, id);
      const blobs = await listLiveResumeBlobs(userId, await readBaseId(userId));
      const isOverwrite = blobs.some((blob) => blob.pathname === pathname);

      if (!isOverwrite && blobs.length >= MAX_SAVED_RESUMES) {
        return NextResponse.json(
          { error: `Maximum of ${MAX_SAVED_RESUMES} resumes allowed` },
          { status: 400 }
        );
      }

      let migratedData: Resume;
      try {
        migratedData = migrateResume(data);
      } catch {
        return NextResponse.json(
          { error: 'Invalid resume payload' },
          { status: 400 }
        );
      }

      const newResume: SavedResume = {
        id,
        name: name.trim(),
        templateId,
        data: migratedData,
        savedAt: new Date().toISOString(),
      };

      await put(pathname, JSON.stringify(newResume), {
        access: BLOB_ACCESS,
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
      });

      return NextResponse.json({ resume: newResume, overwritten: isOverwrite });
    } catch (storageError) {
      console.error('Resume storage error:', storageError);
      return NextResponse.json(
        { error: 'Resume storage is not properly configured' },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Error saving resume:', error);
    return NextResponse.json(
      { error: 'Failed to save resume' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resumeId = new URL(request.url).searchParams.get('id');

    if (!resumeId) {
      return NextResponse.json(
        { error: 'Missing resume ID' },
        { status: 400 }
      );
    }

    try {
      await del(resumePath(userId, resumeId));
      if ((await readBaseId(userId)) === resumeId) {
        await del(basePointerPath(userId));
      }
      return NextResponse.json({ success: true });
    } catch (storageError) {
      if (
        storageError instanceof Error &&
        storageError.message === 'Invalid resume path'
      ) {
        return NextResponse.json({ error: 'Invalid resume ID' }, { status: 400 });
      }
      console.error('Resume storage error:', storageError);
      return NextResponse.json(
        { error: 'Resume storage is not properly configured' },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Error deleting resume:', error);
    return NextResponse.json(
      { error: 'Failed to delete resume' },
      { status: 500 }
    );
  }
}

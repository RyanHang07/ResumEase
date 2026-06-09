import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { Resume, SavedResume } from '@/types/resume';

const MAX_RESUMES = 5;
const MAX_RESUME_PAYLOAD_LENGTH = 100_000;
const MAX_RESUME_NAME_LENGTH = 80;

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

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      const savedResumes = (user.privateMetadata?.resumes as SavedResume[]) || [];

      return NextResponse.json({ resumes: savedResumes });
    } catch (clerkError) {
      // Handle case where Clerk client fails (e.g., not configured)
      console.error('Clerk client error:', clerkError);
      return NextResponse.json(
        { error: 'Clerk authentication not properly configured' },
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

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
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

      const savedResumes =
        (user.privateMetadata?.resumes as SavedResume[]) || [];

      if (savedResumes.length >= MAX_RESUMES) {
        return NextResponse.json(
          { error: `Maximum of ${MAX_RESUMES} resumes allowed` },
          { status: 400 }
        );
      }

      const newResume: SavedResume = {
        id: crypto.randomUUID(),
        name: name.trim(),
        templateId,
        data,
        savedAt: new Date().toISOString(),
      };

      const updatedResumes = [...savedResumes, newResume];

      // Update user metadata using Clerk client
      await client.users.updateUserMetadata(userId, {
        privateMetadata: {
          ...user.privateMetadata,
          resumes: updatedResumes,
        },
      });

      return NextResponse.json({ resume: newResume });
    } catch (clerkError) {
      // Handle case where Clerk client fails (e.g., not configured)
      console.error('Clerk client error:', clerkError);
      return NextResponse.json(
        { error: 'Clerk authentication not properly configured' },
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

    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      const { searchParams } = new URL(request.url);
      const resumeId = searchParams.get('id');

      if (!resumeId) {
        return NextResponse.json(
          { error: 'Missing resume ID' },
          { status: 400 }
        );
      }

      const savedResumes =
        (user.privateMetadata?.resumes as SavedResume[]) || [];

      const updatedResumes = savedResumes.filter((r) => r.id !== resumeId);

      // Update user metadata using Clerk client
      await client.users.updateUserMetadata(userId, {
        privateMetadata: {
          ...user.privateMetadata,
          resumes: updatedResumes,
        },
      });

      return NextResponse.json({ success: true });
    } catch (clerkError) {
      // Handle case where Clerk client fails (e.g., not configured)
      console.error('Clerk client error:', clerkError);
      return NextResponse.json(
        { error: 'Clerk authentication not properly configured' },
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

import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { SavedResume } from '@/types/resume';

const MAX_RESUMES = 5;

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
      const body = await request.json();
      const { name, templateId, data } = body;

      if (!name || !templateId || !data) {
        return NextResponse.json(
          { error: 'Missing required fields: name, templateId, data' },
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
        name,
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

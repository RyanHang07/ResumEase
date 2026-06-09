import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher(['/', '/api/compile']);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  try {
    await auth.protect();
  } catch (error) {
    console.error('Clerk authentication failed:', error);
    return NextResponse.json(
      { error: 'Authentication is currently unavailable' },
      { status: 503 }
    );
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};

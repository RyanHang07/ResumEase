import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher(['/']);

export default clerkMiddleware(async (auth, req) => {
  // Only protect routes if Clerk is configured
  // If Clerk keys are missing, this will gracefully allow access
  try {
    if (!isPublicRoute(req)) {
      await auth.protect();
    }
  } catch (error) {
    // If Clerk is not configured, allow access (graceful degradation)
    console.warn('Clerk middleware error (Clerk may not be configured):', error);
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

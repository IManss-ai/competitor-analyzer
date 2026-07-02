import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const session = request.cookies.get('rivalscope-session');
  const { pathname } = request.nextUrl;

  // Only the app surface requires a session; everything else (landing, /share
  // battle-card links, /discover, /apps, legal pages) is public. Listing the
  // protected prefixes — rather than the public ones — means a new public page
  // can never be locked behind login by omission.
  // Keep in sync with the (dashboard) route-group segments (and robots.ts,
  // which disallows the same set).
  const protectedRoutes = [
    '/battlecards', '/billing', '/campaigns', '/competitors',
    '/dashboard', '/discover', '/queue', '/settings', '/trends',
  ];
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  if (!session && isProtectedRoute) {
    const loginUrl = new URL('/auth/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
};

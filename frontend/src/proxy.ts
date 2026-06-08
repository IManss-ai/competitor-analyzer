import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const session = request.cookies.get('rivalscope-session');
  const { pathname } = request.nextUrl;

  // Public routes that don't need auth ('/share' = public battle-card links)
  const publicRoutes = ['/', '/share', '/auth/login', '/auth/verify', '/api/auth/callback'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  if (!session && !isPublicRoute) {
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

import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions } from '@/lib/session';
import { SessionUser } from '@/lib/types';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = await getIronSession<{ user?: SessionUser }>(cookieStore, sessionOptions);
  session.destroy();
  // Redirect to /auth/login on the SAME origin as the request — robust across
  // domains and not dependent on a (possibly stale) NEXT_PUBLIC_APP_URL.
  return NextResponse.redirect(new URL('/auth/login', request.url));
}

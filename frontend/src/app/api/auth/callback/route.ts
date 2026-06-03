import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions } from '@/lib/session';
import { exchangeSessionToken } from '@/lib/api';
import { SessionUser } from '@/lib/types';

export async function GET(request: NextRequest) {
  const sessionToken = request.nextUrl.searchParams.get('session_token');

  if (!sessionToken) {
    return NextResponse.redirect(new URL('/auth/login?error=missing_token', request.url));
  }

  // Exchange the FastAPI session token for user data
  const userData = await exchangeSessionToken(sessionToken);
  if (!userData) {
    return NextResponse.redirect(new URL('/auth/login?error=invalid_token', request.url));
  }

  // Set iron-session cookie
  const cookieStore = await cookies();
  const session = await getIronSession<{ user?: SessionUser }>(cookieStore, sessionOptions);
  session.user = {
    user_id: userData.user_id,
    email: userData.email,
  };
  await session.save();

  return NextResponse.redirect(new URL('/dashboard', request.url));
}

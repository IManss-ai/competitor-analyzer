import { SessionOptions } from 'iron-session';
import { SessionUser } from './types';

// The iron-session password encrypts the user's auth cookie. Production MUST
// supply a strong (>=32 char) secret via env. Never fall back to a hardcoded
// value in prod: fail closed instead of silently using a known-public key.
const sessionPassword = process.env.IRON_SESSION_PASSWORD;
if (
  process.env.VERCEL_ENV === 'production' &&
  (!sessionPassword || sessionPassword.length < 32)
) {
  throw new Error(
    'IRON_SESSION_PASSWORD must be set to a strong (>=32 char) secret in production.'
  );
}

export const sessionOptions: SessionOptions = {
  password:
    sessionPassword && sessionPassword.length >= 32
      ? sessionPassword
      : 'dev_only_fallback_password_at_least_32_characters_long',
  cookieName: 'rivalscope-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 14 * 24 * 60 * 60, // 14 days
  },
};

declare module 'iron-session' {
  interface IronSessionData {
    user?: SessionUser;
  }
}

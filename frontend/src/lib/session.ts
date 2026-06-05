import { SessionOptions } from 'iron-session';
import { SessionUser } from './types';

export const sessionOptions: SessionOptions = {
  password: process.env.IRON_SESSION_PASSWORD || 'complex_password_at_least_32_characters_long_for_dev',
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

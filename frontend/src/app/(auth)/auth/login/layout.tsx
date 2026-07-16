import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// page.tsx is a client component, so the route's static metadata lives here.
export const metadata: Metadata = {
  title: 'Sign in | Rivalscope',
  description:
    'Sign in to your Rivalscope desk. Accounts are created on first sign-in, no separate signup.',
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// page.tsx is a client component, so the route's static metadata lives here.
export const metadata: Metadata = {
  title: 'Terms of Service | Rivalscope',
  description: 'The terms that govern your use of Rivalscope competitor tracking.',
};

export default function TermsLayout({ children }: { children: ReactNode }) {
  return children;
}

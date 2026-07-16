import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// page.tsx is a client component, so the route's static metadata lives here.
export const metadata: Metadata = {
  title: 'Privacy Policy | Rivalscope',
  description: 'How Rivalscope collects, uses, and protects your data.',
};

export default function PrivacyLayout({ children }: { children: ReactNode }) {
  return children;
}

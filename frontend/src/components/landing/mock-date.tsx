'use client';

import { useMounted } from '@/lib/use-mounted';

// "Today" stamp inside the hero product mockup. Client-only via useMounted so
// the static SSR HTML (which can't know the visitor's date) matches the first
// client render (#418); pre-mount it degrades to the label alone.
export function MockDate() {
  const mounted = useMounted();
  if (!mounted) return <>Intel HQ</>;
  const today = new Date()
    .toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
    .replace(/,/g, '');
  return <>{today} · Intel HQ</>;
}

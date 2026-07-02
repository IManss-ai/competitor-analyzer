'use client';

import { useEffect, useState } from 'react';

/**
 * Returns `false` on the server and during the first client render, then `true`
 * after the component mounts.
 *
 * Use it to gate any text derived from the client's clock or locale — e.g.
 * `new Date(...).toLocaleDateString()` / `toLocaleString()` — so the SSR HTML
 * matches the first client render. Without this, the server (UTC on
 * Vercel/Railway) and the browser (the user's timezone) format the same date
 * differently and React throws hydration error #418.
 *
 *   const mounted = useMounted();
 *   ...
 *   {mounted ? new Date(ts).toLocaleDateString() : ''}
 *
 * The value renders one frame late (empty, then the real date), which is the
 * correct trade: it keeps the user's *local* time while staying hydration-safe.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

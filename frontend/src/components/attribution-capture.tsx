'use client';

import { useEffect } from 'react';
import { captureAttribution } from '@/lib/attribution';

// Mounted once in the root layout: records first-touch utm_*/referrer on any
// entry page (landing, /apps/* SEO pages, /beat) so it survives navigation to
// the signup form. Renders nothing.
export default function AttributionCapture() {
  useEffect(() => {
    captureAttribution();
  }, []);
  return null;
}

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, RotateCw } from 'lucide-react';

// Catches unwrapped server-fetch failures in every (dashboard) page and renders
// inside the Sidebar/MainContent shell (the layout's own fetches are try/catch-wrapped).
export default function DashboardError({
  error,
  reset, // eslint-disable-line @typescript-eslint/no-unused-vars -- unstable_retry re-fetches; reset() only re-renders
  unstable_retry,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center px-6">
      <div className="max-w-md mx-auto w-full">
        <p className="text-xs font-mono uppercase tracking-widest text-destructive mb-3">Temporary glitch</p>
        <h1 className="text-3xl font-bold text-foreground tracking-tight leading-tight mb-3">
          We couldn&rsquo;t load this view.
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground mb-12">
          The Rivalscope API didn&rsquo;t respond &mdash; usually a deploy finishing up (about 30
          seconds). Your competitor tracking is still running and nothing was lost.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => unstable_retry()}>
            <RotateCw size={15} /> Try again
          </Button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-3 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-input transition-colors"
          >
            <LayoutDashboard size={15} /> Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

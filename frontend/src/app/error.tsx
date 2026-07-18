'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RivalscopeLogo } from '@/components/ui/rivalscope-logo';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RotateCw } from 'lucide-react';

// Root boundary: catches errors from public routes and the (dashboard) layout
// itself. Renders inside the root layout, so fonts/theme/globals are applied.
export default function RootError({
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
    <div className="min-h-screen bg-background text-foreground flex items-center px-6 font-sans">
      <div className="max-w-md mx-auto w-full">
        {/* Brand mark */}
        <div className="flex items-center gap-3 mb-12">
          <div className="w-7 h-7 bg-primary/10 border border-primary/25 flex items-center justify-center rounded">
            <RivalscopeLogo size={13} className="text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground font-mono tracking-tight">RIVALSCOPE</span>
        </div>

        <p className="text-xs font-mono uppercase tracking-widest text-destructive mb-3">Unexpected error</p>
        <h1 className="text-3xl font-bold text-foreground tracking-tight leading-tight mb-3">
          Something went wrong on our end.
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground mb-12">
          An unexpected error kept this page from loading. It&rsquo;s been logged &mdash; trying
          again usually clears it right up.
        </p>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => unstable_retry()}>
            <RotateCw size={15} /> Try again
          </Button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-3 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-input transition-colors"
          >
            <ArrowLeft size={15} /> Back home
          </Link>
        </div>
      </div>
    </div>
  );
}

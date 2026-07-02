'use client';

import { useEffect } from 'react';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { cn } from '@/lib/utils';
import './globals.css';

// Last-resort boundary: REPLACES the root layout when it crashes, so it must
// carry its own <html>/<body>, fonts and global styles. The theme pre-paint
// script is gone here, so hardcode the brand-default dark class. Plain
// token-class markup only — no app components (the app shell itself crashed).
export default function GlobalError({
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
    <html lang="en" className={cn('dark', GeistSans.variable, GeistMono.variable, 'font-sans antialiased')}>
      <body className="bg-background text-foreground">
        <title>Something went wrong &mdash; Rivalscope</title>
        <div className="min-h-screen flex items-center px-6 font-sans">
          <div className="max-w-md mx-auto w-full">
            <p className="text-xs font-mono uppercase tracking-widest text-destructive mb-3">Unexpected error</p>
            <h1 className="text-3xl font-bold text-foreground tracking-tight leading-tight mb-3">
              Something went wrong on our end.
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground mb-10">
              An unexpected error kept this page from loading. It&rsquo;s been logged &mdash; trying
              again usually clears it right up.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => unstable_retry()}
                className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-3 rounded-md bg-primary text-primary-foreground hover:bg-primary transition-colors"
              >
                Try again
              </button>
              {/* Plain <a>: guarantees a hard-reload escape hatch when the shell has crashed */}
              <a
                href="/"
                className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-3 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-input transition-colors"
              >
                Back home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

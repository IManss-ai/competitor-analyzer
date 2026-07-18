import { AppsNav } from '@/components/apps-nav';
import { Skeleton } from '@/components/ui/skeleton';

// Instant loading state for /apps — mirrors the index layout (header + card
// list) so the swap-in is layout-stable. Skeleton pulses opacity only.
export default function Loading() {
  return (
    <div className="min-h-screen px-4 py-12" style={{ background: 'var(--background)' }}>
      <AppsNav />
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </header>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-8 w-full sm:w-64" />
          <Skeleton className="h-8 w-36" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="rs-card p-4 space-y-2">
              <div className="flex items-baseline justify-between gap-4">
                <Skeleton className="h-5 w-40 max-w-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { Competitor } from '@/lib/types';
import { Store } from 'lucide-react';
import Link from 'next/link';
import LocalScanButton from './local-scan-button';

interface LocalBusinessSectionProps {
  competitors: Competitor[];
  isLocalBusiness: boolean;
  userId: string;
}

export default function LocalBusinessSection({
  competitors,
  isLocalBusiness,
  userId,
}: LocalBusinessSectionProps) {
  if (!isLocalBusiness) return null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Store size={18} className="text-primary" />
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Local Intelligence
          </h2>
        </div>
      </div>

      {competitors.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Add competitors to start tracking local intelligence
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {competitors.map((comp) => {
            const hasGoogleMaps = !!comp.google_maps_url;
            const hasInstagram = !!comp.instagram_handle;
            const hasFacebook = !!comp.facebook_page;
            const hasAnyLocal = hasGoogleMaps || hasInstagram || hasFacebook;

            return (
              <div key={comp.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded bg-accent border border-border flex items-center justify-center flex-shrink-0">
                    <Store size={14} className="text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">
                      {comp.name || comp.url}
                    </p>
                    <p className="text-xs font-mono truncate text-muted-foreground">
                      {comp.url}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {hasGoogleMaps && (
                    <span className="inline-flex items-center text-xs font-medium uppercase tracking-wider bg-[var(--tone-positive)]/10 text-[var(--tone-positive)] border border-[var(--tone-positive)]/20 px-2 py-0.5 rounded-md">
                      Google Reviews
                    </span>
                  )}
                  {hasInstagram && (
                    <span className="inline-flex items-center text-xs font-medium uppercase tracking-wider bg-accent border border-border text-muted-foreground px-2 py-0.5 rounded-md">
                      Instagram
                    </span>
                  )}
                  {hasFacebook && (
                    <span className="inline-flex items-center text-xs font-medium uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md">
                      Facebook
                    </span>
                  )}
                  {!hasAnyLocal && (
                    <Link
                      href="/competitors"
                      className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Add local details →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}

          {/* Empty state for social data */}
          <div className="px-6 py-8 text-center bg-muted">
            <p className="text-sm mb-4 text-muted-foreground">
              Social posts and Google reviews appear here after your next scan.
            </p>
            {competitors.length > 0 && (
              <LocalScanButton
                competitorId={competitors[0].id}
                userId={userId}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

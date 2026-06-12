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
    <div className="rs-card overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Store size={18} className="text-sky-400" />
          <h2 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Local Intelligence
          </h2>
        </div>
      </div>

      {competitors.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Add competitors to start tracking local intelligence
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-subtle)]">
          {competitors.map((comp) => {
            const hasGoogleMaps = !!comp.google_maps_url;
            const hasInstagram = !!comp.instagram_handle;
            const hasFacebook = !!comp.facebook_page;
            const hasAnyLocal = hasGoogleMaps || hasInstagram || hasFacebook;

            return (
              <div key={comp.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded bg-[var(--fill-subtle-hover)] border border-[var(--border-default)] flex items-center justify-center flex-shrink-0">
                    <Store size={14} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {comp.name || comp.url}
                    </p>
                    <p className="text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                      {comp.url}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {hasGoogleMaps && (
                    <span className="inline-flex items-center text-[10px] font-medium uppercase tracking-wider bg-emerald-400/10 text-emerald-300 border border-emerald-400/20 px-2 py-0.5 rounded-md">
                      Google Reviews
                    </span>
                  )}
                  {hasInstagram && (
                    <span className="inline-flex items-center text-[10px] font-medium uppercase tracking-wider bg-[var(--fill-subtle-hover)] border border-[var(--border-default)] px-2 py-0.5 rounded-md" style={{ color: 'var(--text-secondary)' }}>
                      Instagram
                    </span>
                  )}
                  {hasFacebook && (
                    <span className="inline-flex items-center text-[10px] font-medium uppercase tracking-wider bg-sky-400/10 text-sky-300 border border-sky-400/20 px-2 py-0.5 rounded-md">
                      Facebook
                    </span>
                  )}
                  {!hasAnyLocal && (
                    <Link
                      href="/competitors"
                      className="text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors"
                    >
                      Add local details →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}

          {/* Empty state for social data */}
          <div className="px-6 py-8 text-center bg-[var(--fill-subtle)]">
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
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

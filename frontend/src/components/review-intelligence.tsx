'use client';

import { Competitor, CompetitorReviewsData } from '@/lib/types';
import { Star, AlertCircle } from 'lucide-react';

interface ReviewIntelligenceProps {
  competitors: Competitor[];
  reviewsData: CompetitorReviewsData[];
}

const PLATFORM_STYLES: Record<string, { label: string; badge: string }> = {
  g2:         { label: 'G2',         badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  trustpilot: { label: 'Trustpilot', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  capterra:   { label: 'Capterra',   badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
};

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-[var(--text-muted)] text-xs">—</span>;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={10}
          className={
            i < full
              ? 'text-amber-400 fill-amber-400'
              : i === full && half
              ? 'text-amber-400 fill-amber-400/40'
              : 'text-[var(--border-default)] fill-[var(--border-default)]'
          }
        />
      ))}
      <span className="ml-1 text-[11px] font-mono text-[var(--text-primary)]">{rating.toFixed(1)}</span>
    </span>
  );
}

export default function ReviewIntelligence({ competitors, reviewsData }: ReviewIntelligenceProps) {
  const hasData = reviewsData.some(d => d.snapshots && d.snapshots.length > 0);

  return (
    <div className="rs-card overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center gap-2">
        <Star size={15} className="text-amber-400" />
        <h2 className="text-sm font-bold text-[var(--text-primary)]">Review Intelligence</h2>
        <span className="ml-auto text-[10px] text-[var(--text-muted)] font-mono">G2 · Trustpilot · Capterra</span>
      </div>

      {!hasData ? (
        <div className="px-6 py-10 text-center">
          <AlertCircle size={20} className="text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-sm text-[var(--text-muted)]">Run a scan to populate review intelligence</p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-subtle)]">
          {competitors.map((comp, index) => {
            const data = reviewsData[index];
            if (!data || !data.snapshots || data.snapshots.length === 0) return null;

            return (
              <div key={comp.id} className="px-5 py-4">
                <p className="text-xs font-bold text-[var(--text-primary)] mb-3 truncate">{comp.name || comp.url}</p>
                <div className="space-y-3">
                  {data.snapshots.map((snap, sIdx) => {
                    const style = PLATFORM_STYLES[snap.platform] ?? {
                      label: snap.platform,
                      badge: 'bg-[var(--fill-subtle)] text-[var(--text-secondary)] border-[var(--border-default)]',
                    };

                    return (
                      <div key={sIdx} className="flex flex-col gap-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${style.badge}`}>
                            {style.label}
                          </span>
                          <StarRating rating={snap.avg_rating} />
                          {snap.total_reviews !== null && (
                            <span className="text-[11px] text-[var(--text-muted)] font-mono">
                              {snap.total_reviews.toLocaleString()} reviews
                            </span>
                          )}
                          {snap.complaint_count > 0 && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border bg-red-500/10 text-red-400 border-red-500/20">
                              {snap.complaint_count} complaints
                            </span>
                          )}
                        </div>

                        {snap.top_complaints && snap.top_complaints.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pl-1">
                            {snap.top_complaints.map((c, cIdx) => (
                              <span
                                key={cIdx}
                                className="text-[11px] text-[var(--text-secondary)] bg-[var(--fill-subtle)] border border-[var(--border-subtle)] px-2.5 py-1 rounded-lg"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

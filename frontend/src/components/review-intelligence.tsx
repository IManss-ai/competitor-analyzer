'use client';

import { Competitor, CompetitorReviewsData } from '@/lib/types';
import { Star, AlertCircle } from 'lucide-react';

interface ReviewIntelligenceProps {
  competitors: Competitor[];
  reviewsData: CompetitorReviewsData[];
}

const PLATFORM_STYLES: Record<string, { label: string; badge: string }> = {
  g2:         { label: 'G2',         badge: 'tag-orange' },
  trustpilot: { label: 'Trustpilot', badge: 'tag-green' },
  capterra:   { label: 'Capterra',   badge: 'bg-primary/10 text-primary border-primary/20' },
};

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-muted-foreground text-xs">—</span>;
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
              ? 'text-[var(--tone-warning)] fill-[var(--tone-warning)]'
              : i === full && half
              ? 'text-[var(--tone-warning)] fill-[var(--tone-warning)] [fill-opacity:0.4]'
              : 'text-border fill-border'
          }
        />
      ))}
      <span className="ml-1 text-xs font-mono text-foreground">{rating.toFixed(1)}</span>
    </span>
  );
}

// A snapshot row with no rating, no review count and no complaints carries no
// signal; rendering it as "0.0 (5 hollow stars) 0 reviews" reads as a terrible
// rating instead of "nothing collected yet".
function hasSignal(snap: ReviewIntelligenceProps['reviewsData'][number]['snapshots'][number]) {
  return (
    (snap.avg_rating ?? 0) > 0 ||
    (snap.total_reviews ?? 0) > 0 ||
    snap.complaint_count > 0 ||
    (snap.top_complaints?.length ?? 0) > 0
  );
}

export default function ReviewIntelligence({ competitors, reviewsData }: ReviewIntelligenceProps) {
  const hasData = reviewsData.some(d => d.snapshots && d.snapshots.length > 0);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center gap-2">
        <Star size={15} className="text-[var(--tone-warning)]" />
        <h2 className="text-lg font-semibold text-foreground">Review Intelligence</h2>
        <span className="ml-auto text-xs text-muted-foreground font-mono">G2 · Trustpilot · Capterra</span>
      </div>

      {!hasData ? (
        <div className="px-6 py-12 text-center">
          <AlertCircle size={20} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Run a scan to populate review intelligence</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {competitors.map((comp, index) => {
            const data = reviewsData[index];
            if (!data || !data.snapshots || data.snapshots.length === 0) return null;
            const snapshots = data.snapshots.filter(hasSignal);

            return (
              <div key={comp.id} className="px-6 py-4">
                <p className="text-xs font-bold text-foreground mb-3 truncate">{comp.name || comp.url}</p>
                {snapshots.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    No public reviews collected yet. Sources are re-checked on every scan.
                  </p>
                ) : (
                <div className="space-y-3">
                  {snapshots.map((snap, sIdx) => {
                    const style = PLATFORM_STYLES[snap.platform] ?? {
                      label: snap.platform,
                      badge: 'bg-muted text-muted-foreground border-border',
                    };

                    return (
                      <div key={sIdx} className="flex flex-col gap-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-md border ${style.badge}`}>
                            {style.label}
                          </span>
                          <StarRating rating={snap.avg_rating} />
                          {snap.total_reviews !== null && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {snap.total_reviews.toLocaleString('en-US')} reviews
                            </span>
                          )}
                          {snap.complaint_count > 0 && (
                            <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-sm border tag-red">
                              {snap.complaint_count} complaints
                            </span>
                          )}
                        </div>

                        {snap.top_complaints && snap.top_complaints.length > 0 && (
                          <div className="flex flex-wrap gap-2 pl-1">
                            {snap.top_complaints.map((c, cIdx) => (
                              <span
                                key={cIdx}
                                className="text-xs text-muted-foreground bg-muted border border-border px-3 py-1 rounded"
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
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

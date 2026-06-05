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
  if (rating === null) return <span className="text-zinc-500 text-xs">—</span>;
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
              : 'text-zinc-700 fill-zinc-700'
          }
        />
      ))}
      <span className="ml-1 text-[11px] font-mono text-zinc-300">{rating.toFixed(1)}</span>
    </span>
  );
}

export default function ReviewIntelligence({ competitors, reviewsData }: ReviewIntelligenceProps) {
  const hasData = reviewsData.some(d => d.snapshots && d.snapshots.length > 0);

  return (
    <div className="bg-[#0b0819]/45 border border-white/[0.06] shadow-lg rounded-2xl backdrop-blur-md overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
        <Star size={15} className="text-amber-400" />
        <h2 className="text-sm font-bold text-white">Review Intelligence</h2>
        <span className="ml-auto text-[10px] text-zinc-500 font-mono">G2 · Trustpilot · Capterra</span>
      </div>

      {!hasData ? (
        <div className="px-6 py-10 text-center">
          <AlertCircle size={20} className="text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">Run a scan to populate review intelligence</p>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.04]">
          {competitors.map((comp, index) => {
            const data = reviewsData[index];
            if (!data || !data.snapshots || data.snapshots.length === 0) return null;

            return (
              <div key={comp.id} className="px-5 py-4">
                <p className="text-xs font-bold text-white mb-3 truncate">{comp.name || comp.url}</p>
                <div className="space-y-3">
                  {data.snapshots.map((snap, sIdx) => {
                    const style = PLATFORM_STYLES[snap.platform] ?? {
                      label: snap.platform,
                      badge: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
                    };

                    return (
                      <div key={sIdx} className="flex flex-col gap-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${style.badge}`}>
                            {style.label}
                          </span>
                          <StarRating rating={snap.avg_rating} />
                          {snap.total_reviews !== null && (
                            <span className="text-[11px] text-zinc-500 font-mono">
                              {snap.total_reviews.toLocaleString()} reviews
                            </span>
                          )}
                          {snap.complaint_count > 0 && (
                            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border bg-red-500/10 text-red-400 border-red-500/20">
                              {snap.complaint_count} complaints
                            </span>
                          )}
                        </div>

                        {snap.top_complaints && snap.top_complaints.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pl-1">
                            {snap.top_complaints.map((c, cIdx) => (
                              <span
                                key={cIdx}
                                className="text-[11px] text-zinc-400 bg-white/[0.04] border border-white/[0.07] px-2.5 py-1 rounded-lg"
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

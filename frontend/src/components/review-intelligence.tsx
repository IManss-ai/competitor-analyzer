import { Competitor, CompetitorReviewsData } from '@/lib/types';
import { Star } from 'lucide-react';

interface ReviewIntelligenceProps {
  competitors: Competitor[];
  reviewsData: CompetitorReviewsData[];
}

export default function ReviewIntelligence({ competitors, reviewsData }: ReviewIntelligenceProps) {
  const hasData = reviewsData.some(d => d.snapshots && d.snapshots.length > 0);

  return (
    <div className="bg-white rounded-xl border border-[#e5e5e5] overflow-hidden mb-6 shadow-sm">
      <div className="px-6 py-4 border-b border-[#f0f0f0] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star size={18} className="text-[#0a0a0a]"  />
          <h2 className="text-sm font-semibold text-[#0a0a0a] tracking-tight">
            Review Intelligence
          </h2>
        </div>
      </div>

      {!hasData ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-[#525252]">Add your competitors and run a scan to see review intelligence</p>
        </div>
      ) : (
        <div className="divide-y divide-[#f5f5f5]">
          {competitors.map((comp, index) => {
            const data = reviewsData[index];
            if (!data || !data.snapshots || data.snapshots.length === 0) return null;

            return (
              <div key={comp.id} className="px-6 py-5">
                <h3 className="text-sm font-semibold text-[#0a0a0a] mb-3">{comp.name || comp.url}</h3>
                <div className="space-y-4">
                  {data.snapshots.map((snap, sIdx) => {
                    const platformColor = {
                      g2: 'bg-orange-50 text-orange-700 border-orange-200',
                      trustpilot: 'bg-green-50 text-green-700 border-green-200',
                      capterra: 'bg-blue-50 text-blue-700 border-blue-200'
                    }[snap.platform] || 'bg-gray-50 text-gray-700 border-gray-200';

                    return (
                      <div key={sIdx} className="flex items-start gap-3">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${platformColor} mt-0.5`}>
                          {snap.platform}
                        </span>
                        <div className="flex-1">
                          {snap.top_complaints && snap.top_complaints.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {snap.top_complaints.map((complaint, cIdx) => (
                                <span key={cIdx} className="inline-block bg-[#f5f5f5] text-[#525252] text-xs px-2.5 py-1 rounded-md border border-[#e5e5e5]">
                                  {complaint}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-[#a3a3a3]">No complaints detected.</span>
                          )}
                        </div>
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

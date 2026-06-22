import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { createApiClient } from '@/lib/api';
import { SessionUser } from '@/lib/types';
import Topbar from '@/components/topbar';
import TrendsChart from '@/components/trends-chart';
import TrendsTypeBreakdown from '@/components/trends-type-breakdown';
import TrendsReviews from '@/components/trends-reviews';
import TrendsHeatmap from '@/components/trends-heatmap';
import Link from 'next/link';

export default async function TrendsPage() {
  const cookieStore = await cookies();
  const session = await getIronSession<{ user?: SessionUser }>(cookieStore, sessionOptions);
  const api = createApiClient(session.user!.user_id);

  // Fetch both datasets concurrently
  const [trendsData, metricsData] = await Promise.all([
    api.getTrends(),
    api.getTrendsMetrics()
  ]);

  const maxCount = Math.max(1, ...trendsData.competitors.flatMap((c) => c.counts));

  // Transform data for change frequency line chart
  const changeFrequencyChartData = metricsData.weeks.map((week, weekIndex) => {
    const dataPoint: Record<string, string | number> = { week: week.replace(/^\d{4}-/, '') };
    metricsData.weekly_changes.forEach(comp => {
      dataPoint[comp.name || comp.url] = comp.counts[weekIndex] || 0;
    });
    return dataPoint;
  });

  const hasCompetitors = trendsData.competitors.length > 0;

  return (
    <div>
      <Topbar title="Trends" subtitle="Activity overview across your landscape" />

      {!hasCompetitors ? (
        <div className="rs-card p-6">
          <div className="px-6 py-24 text-center flex flex-col items-center">
            <div className="w-16 h-16 mx-auto mb-6 flex items-end justify-center gap-2 p-3 rounded-full bg-[var(--fill-subtle)] border border-[var(--border-default)]">
              <div className="w-2.5 h-[30%] bg-[var(--fill-subtle-hover)] rounded-sm"></div>
              <div className="w-2.5 h-[70%] bg-[var(--border-strong)] rounded-sm"></div>
              <div className="w-2.5 h-[50%] bg-[var(--fill-subtle-hover)] rounded-sm"></div>
              <div className="w-2.5 h-[90%] bg-[var(--border-strong)] rounded-sm"></div>
            </div>
            
            <h3 className="text-xl font-semibold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>No data to show yet</h3>
            <p className="text-sm max-w-sm mx-auto mb-8 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Trends will appear here once you add competitors and we complete the first weekly scan.
            </p>
            <Link 
              href="/competitors" 
              className="rs-btn-primary cursor-pointer"
            >
              Add competitors
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top row: 2 charts side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* A) Change Frequency Chart */}
            <div className="rs-card p-6">
              <h2 className="rs-label mb-6">
                Change frequency (Past 12 Weeks — Top 5)
              </h2>
              <TrendsChart data={changeFrequencyChartData} competitors={metricsData.weekly_changes} />
            </div>

            {/* B) Change Type Breakdown Stacked Bar Chart */}
            <div className="rs-card p-6">
              <h2 className="rs-label mb-6">
                Change type breakdown (Past 8 Weeks)
              </h2>
              <TrendsTypeBreakdown data={metricsData.type_breakdown} />
            </div>
          </div>

          {/* Bottom row: Review trends & Density heatmap */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* C) Review Score Trends */}
            <div className="rs-card p-6">
              <h2 className="rs-label mb-6">
                Review score trends
              </h2>
              <TrendsReviews trends={metricsData.review_trends} />
            </div>

            {/* D) Alert Heatmap */}
            <TrendsHeatmap competitors={trendsData.competitors} weeks={trendsData.weeks} maxCount={maxCount} />
          </div>
        </div>
      )}
    </div>
  );
}

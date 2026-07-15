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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function TrendsPage() {
  const cookieStore = await cookies();
  const session = await getIronSession<{ user?: SessionUser }>(cookieStore, sessionOptions);
  const api = createApiClient(session.user!.user_id, session.user!.api_token);

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
        <Card>
          <CardContent>
            <div className="px-6 py-24 text-center flex flex-col items-center">
              <div className="w-16 h-16 mx-auto mb-6 flex items-end justify-center gap-2 p-3 rounded-full bg-muted border border-border">
                <div className="w-2.5 h-[30%] bg-muted-foreground/30 rounded-sm"></div>
                <div className="w-2.5 h-[70%] bg-muted-foreground/60 rounded-sm"></div>
                <div className="w-2.5 h-[50%] bg-muted-foreground/30 rounded-sm"></div>
                <div className="w-2.5 h-[90%] bg-muted-foreground/60 rounded-sm"></div>
              </div>

              <h3 className="text-xl font-semibold tracking-tight mb-2 text-foreground">No data to show yet</h3>
              <p className="text-sm max-w-sm mx-auto mb-8 leading-relaxed text-muted-foreground">
                Trends will appear here once you add competitors and we complete the first weekly scan.
              </p>
              <Button asChild>
                <Link href="/competitors">Add competitors</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Top row: 2 charts side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* A) Change Frequency Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Change frequency (Past 12 Weeks · Top 5)</CardTitle>
              </CardHeader>
              <CardContent>
                <TrendsChart data={changeFrequencyChartData} competitors={metricsData.weekly_changes} />
              </CardContent>
            </Card>

            {/* B) Change Type Breakdown Stacked Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Change type breakdown (Past 8 Weeks)</CardTitle>
              </CardHeader>
              <CardContent>
                <TrendsTypeBreakdown data={metricsData.type_breakdown} />
              </CardContent>
            </Card>
          </div>

          {/* Bottom row: Review trends & Density heatmap */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* C) Review Score Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Review score trends</CardTitle>
              </CardHeader>
              <CardContent>
                <TrendsReviews trends={metricsData.review_trends} />
              </CardContent>
            </Card>

            {/* D) Alert Heatmap */}
            <TrendsHeatmap competitors={trendsData.competitors} weeks={trendsData.weeks} maxCount={maxCount} />
          </div>
        </div>
      )}
    </div>
  );
}

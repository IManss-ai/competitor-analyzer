import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { createApiClient } from '@/lib/api';
import { SessionUser } from '@/lib/types';
import Topbar from '@/components/topbar';
import TrendsChart from '@/components/trends-chart';
import Link from 'next/link';
import TrendsHeatmap from '@/components/trends-heatmap';

export default async function TrendsPage() {
  const cookieStore = await cookies();
  const session = await getIronSession<{ user?: SessionUser }>(cookieStore, sessionOptions);
  const api = createApiClient(session.user!.user_id);
  const data = await api.getTrends();

  const maxCount = Math.max(1, ...data.competitors.flatMap((c) => c.counts));

  // Transform data for line chart
  const chartData = data.weeks.map((week, weekIndex) => {
    const dataPoint: Record<string, string | number> = { week: week.replace(/^\d{4}-/, '') };
    data.competitors.forEach(comp => {
      dataPoint[comp.name || comp.url] = comp.counts[weekIndex] || 0;
    });
    return dataPoint;
  });

  return (
    <div>
      <Topbar title="Trends" subtitle="Activity overview across your landscape" />

      {data.competitors.length === 0 ? (
        <div className="p-1 bg-zinc-100/50 border border-zinc-200/60 rounded-2xl shadow-sm">
          <div className="bg-white border border-zinc-100 rounded-[calc(1rem-0.125rem)] px-6 py-24 text-center">
            {/* Rich Empty State */}
            <div className="w-16 h-16 mx-auto mb-6 flex items-end justify-center gap-1.5 p-3 rounded-full bg-zinc-50 border border-zinc-200/50">
              <div className="w-2.5 h-[30%] bg-zinc-200 rounded-sm"></div>
              <div className="w-2.5 h-[70%] bg-zinc-300 rounded-sm"></div>
              <div className="w-2.5 h-[50%] bg-zinc-200 rounded-sm"></div>
              <div className="w-2.5 h-[90%] bg-zinc-300 rounded-sm"></div>
            </div>
            
            <h3 className="text-xl font-semibold text-[#0a0a0a] tracking-tight mb-2">No data to show yet</h3>
            <p className="text-sm text-[#525252] max-w-sm mx-auto mb-8 leading-relaxed">
              Trends will appear here once you add competitors and we complete the first weekly scan.
            </p>
            <Link 
              href="/competitors" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#0a0a0a] text-white text-sm font-medium rounded-lg hover:bg-[#1a1a1a] transition-all cursor-pointer"
            >
              Add competitors
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top section: Line chart (Double-Bezel Design) */}
          <div className="p-1 bg-zinc-100/50 border border-zinc-200/60 rounded-2xl shadow-sm">
            <div className="bg-white border border-zinc-100 rounded-[calc(1rem-0.125rem)] p-6">
              <h2 className="text-xs font-mono text-[#737373] uppercase tracking-wider mb-6">
                Change activity over 12 weeks
              </h2>
              <TrendsChart data={chartData} competitors={data.competitors} />
            </div>
          </div>

          {/* Bottom section: Heatmap */}
          <TrendsHeatmap competitors={data.competitors} weeks={data.weeks} maxCount={maxCount} />
        </div>
      )}
    </div>
  );
}

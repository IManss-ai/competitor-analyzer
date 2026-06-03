import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { createApiClient } from '@/lib/api';
import { SessionUser } from '@/lib/types';
import Topbar from '@/components/topbar';
import { clsx } from 'clsx';
import TrendsChart from '@/components/trends-chart';
import Link from 'next/link';
import { ChartBar } from '@phosphor-icons/react/dist/ssr';

export default async function TrendsPage() {
  const cookieStore = await cookies();
  const session = await getIronSession<{ user?: SessionUser }>(cookieStore, sessionOptions);
  const api = createApiClient(session.user!.user_id);
  const data = await api.getTrends();

  const maxCount = Math.max(1, ...data.competitors.flatMap((c) => c.counts));

  function heatLevel(count: number): 0 | 1 | 2 | 3 {
    if (count === 0) return 0;
    const ratio = count / maxCount;
    if (ratio < 0.25) return 1;
    if (ratio < 0.6) return 2;
    return 3;
  }

  const heatClasses = [
    'bg-[#f5f5f5] text-[#a3a3a3]',
    'bg-blue-100 text-blue-600',
    'bg-blue-400 text-white',
    'bg-blue-600 text-white',
  ];

  // Transform data for line chart
  const chartData = data.weeks.map((week, weekIndex) => {
    const dataPoint: any = { week: week.replace(/^\d{4}-/, '') };
    data.competitors.forEach(comp => {
      dataPoint[comp.name || comp.url] = comp.counts[weekIndex] || 0;
    });
    return dataPoint;
  });

  return (
    <div>
      <Topbar title="Trends" subtitle="Activity overview across your landscape" />

      {data.competitors.length === 0 ? (
        <div className="bg-white border border-[#e5e5e5] rounded-xl px-6 py-24 text-center shadow-sm">
          {/* Rich Empty State */}
          <div className="w-16 h-16 mx-auto mb-6 flex items-end justify-center gap-1.5 p-3 rounded-full bg-[#f5f5f5] border border-[#e5e5e5]">
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
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0a0a0a] text-white text-sm font-medium rounded-lg hover:bg-[#1a1a1a] transition-all"
          >
            Add competitors
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top section: Line chart */}
          <div className="bg-white border border-[#e5e5e5] rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-[#0a0a0a] tracking-tight mb-6">
              Change activity over 12 weeks
            </h2>
            <TrendsChart data={chartData} competitors={data.competitors} />
          </div>

          {/* Bottom section: Heatmap */}
          <div className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-[#f0f0f0] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#0a0a0a] tracking-tight">
                Activity density heatmap
              </h2>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-[#a3a3a3] uppercase tracking-wide">Less</span>
                {[0, 1, 2, 3].map((level) => (
                  <div
                    key={level}
                    className={clsx(
                      'w-3.5 h-3.5 rounded-sm',
                      heatClasses[level].split(' ')[0]
                    )}
                  />
                ))}
                <span className="text-[11px] font-medium text-[#a3a3a3] uppercase tracking-wide">More</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#f5f5f5]">
                    <th className="text-left text-[11px] font-medium text-[#737373] uppercase tracking-wide px-6 py-4 sticky left-0 bg-white w-[180px]">
                      Competitor
                    </th>
                    {data.weeks.map((week) => (
                      <th
                        key={week}
                        className="text-center text-[10px] font-medium text-[#a3a3a3] px-2 py-4 font-mono whitespace-nowrap"
                      >
                        {week.replace(/^\d{4}-/, '')}
                      </th>
                    ))}
                    <th className="text-right text-[11px] font-medium text-[#737373] uppercase tracking-wide px-6 py-4">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.competitors.map((comp) => {
                    const total = comp.counts.reduce((a, b) => a + b, 0);
                    return (
                      <tr
                        key={comp.id}
                        className="border-b border-[#f5f5f5] last:border-0 hover:bg-[#fafafa] transition-colors"
                      >
                        <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-[#fafafa] transition-colors">
                          <span className="text-sm font-medium text-[#0a0a0a] truncate block max-w-[160px]">
                            {comp.name || comp.url}
                          </span>
                        </td>
                        {comp.counts.map((count, i) => (
                          <td key={i} className="px-2 py-4 text-center">
                            <div
                              title={`${count} change${count !== 1 ? 's' : ''} in week of ${data.weeks[i]}`}
                              className={clsx(
                                'w-7 h-7 rounded-[6px] mx-auto flex items-center justify-center text-[10px] font-semibold font-mono transition-transform hover:scale-110 cursor-default',
                                heatClasses[heatLevel(count)]
                              )}
                            >
                              {count > 0 ? count : ''}
                            </div>
                          </td>
                        ))}
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-semibold text-[#0a0a0a] font-mono">
                            {total}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

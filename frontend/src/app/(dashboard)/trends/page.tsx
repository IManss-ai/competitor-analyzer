import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { createApiClient } from '@/lib/api';
import { SessionUser } from '@/lib/types';
import Topbar from '@/components/topbar';
import { clsx } from 'clsx';

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

  return (
    <div>
      <Topbar title="Trends" subtitle="12-week activity heatmap" />

      {data.competitors.length === 0 ? (
        <div className="bg-white border border-[#e5e5e5] rounded-xl px-6 py-16 text-center">
          <p className="text-sm font-medium text-[#525252] mb-1">No trend data yet</p>
          <p className="text-xs text-[#a3a3a3]">
            Add competitors and run a scan to see activity over time.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden">
          {/* Legend */}
          <div className="px-6 py-4 border-b border-[#f0f0f0] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#0a0a0a] tracking-tight">
              Change activity by week
            </h2>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#a3a3a3]">Less</span>
              {[0, 1, 2, 3].map((level) => (
                <div
                  key={level}
                  className={clsx(
                    'w-3 h-3 rounded-sm',
                    heatClasses[level].split(' ')[0]
                  )}
                />
              ))}
              <span className="text-[11px] text-[#a3a3a3]">More</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#f5f5f5]">
                  <th className="text-left text-[11px] font-medium text-[#a3a3a3] px-6 py-2.5 sticky left-0 bg-white w-[180px]">
                    Competitor
                  </th>
                  {data.weeks.map((week) => (
                    <th
                      key={week}
                      className="text-center text-[10px] font-medium text-[#a3a3a3] px-1.5 py-2.5 font-mono whitespace-nowrap"
                    >
                      {week.replace(/^\d{4}-/, '')}
                    </th>
                  ))}
                  <th className="text-right text-[11px] font-medium text-[#a3a3a3] px-6 py-2.5">
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
                      <td className="px-6 py-3 sticky left-0 bg-white">
                        <span className="text-sm font-medium text-[#0a0a0a] truncate block max-w-[160px]">
                          {comp.name || comp.url}
                        </span>
                      </td>
                      {comp.counts.map((count, i) => (
                        <td key={i} className="px-1.5 py-3 text-center">
                          <div
                            title={`${count} change${count !== 1 ? 's' : ''}`}
                            className={clsx(
                              'w-6 h-6 rounded-[4px] mx-auto flex items-center justify-center text-[10px] font-semibold font-mono',
                              heatClasses[heatLevel(count)]
                            )}
                          >
                            {count > 0 ? count : ''}
                          </div>
                        </td>
                      ))}
                      <td className="px-6 py-3 text-right">
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
      )}
    </div>
  );
}

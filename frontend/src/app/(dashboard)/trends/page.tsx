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

  return (
    <div>
      <Topbar title="Trends" subtitle="12-week activity across your competitors" />

      {data.competitors.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <p className="text-sm text-zinc-500">No competitor data yet. Add competitors and run a scan.</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-6 py-3 sticky left-0 bg-white">
                  Competitor
                </th>
                {data.weeks.map((week) => (
                  <th key={week} className="text-center text-[10px] font-medium text-zinc-400 px-2 py-3 font-mono">
                    {week.replace(/^\d{4}-/, '')}
                  </th>
                ))}
                <th className="text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider px-6 py-3">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {data.competitors.map((comp) => {
                const total = comp.counts.reduce((a, b) => a + b, 0);
                return (
                  <tr key={comp.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-3 sticky left-0 bg-white">
                      <div className="text-sm font-medium text-zinc-900 truncate max-w-[160px]">{comp.name || comp.url}</div>
                    </td>
                    {comp.counts.map((count, i) => (
                      <td key={i} className="px-2 py-3 text-center">
                        <div
                          className={clsx(
                            'w-7 h-7 rounded-md mx-auto flex items-center justify-center text-[10px] font-semibold',
                            count === 0
                              ? 'bg-zinc-50 text-zinc-300'
                              : count / maxCount > 0.5
                                ? 'bg-blue-600 text-white'
                                : 'bg-blue-100 text-blue-700'
                          )}
                        >
                          {count}
                        </div>
                      </td>
                    ))}
                    <td className="px-6 py-3 text-right">
                      <span className="text-sm font-semibold text-zinc-900 font-mono">{total}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

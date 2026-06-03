import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { createApiClient } from '@/lib/api';
import { SessionUser } from '@/lib/types';
import Topbar from '@/components/topbar';
import StatsCard from '@/components/stats-card';
import ChangeBadge from '@/components/change-badge';
import { Users, ListChecks, Activity, TrendingUp } from 'lucide-react';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const session = await getIronSession<{ user?: SessionUser }>(cookieStore, sessionOptions);
  const api = createApiClient(session.user!.user_id);
  const data = await api.getDashboard();

  return (
    <div>
      <Topbar
        title="Dashboard"
        subtitle="Your competitive intelligence overview"
        lastScan={data.last_scan}
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard title="Competitors" value={data.competitor_count} icon={Users} />
        <StatsCard title="Changes Detected" value={data.events.length} icon={Activity} />
        <StatsCard title="Pending Actions" value={data.pending_count} icon={ListChecks} />
        <StatsCard
          title="Latest Activity"
          value={data.events.length > 0 ? '↑ Active' : '— Quiet'}
          icon={TrendingUp}
          subtitle={data.last_scan ? `Since ${new Date(data.last_scan).toLocaleDateString()}` : 'No scans yet'}
        />
      </div>

      {/* Event feed */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="px-6 py-4 border-b border-zinc-200">
          <h2 className="text-base font-semibold text-zinc-900 font-heading">Recent Changes</h2>
        </div>
        {data.events.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Activity className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No changes detected yet.</p>
            <p className="text-xs text-zinc-400 mt-1">Add competitors and run a scan to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {data.events.slice(0, 20).map((event) => (
              <div key={event.id} className="px-6 py-4 hover:bg-zinc-50/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-zinc-900">{event.competitor_name}</span>
                      <ChangeBadge type={event.change_type} />
                    </div>
                    <p className="text-sm text-zinc-600 line-clamp-2">{event.brief_text}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-zinc-400 font-mono">{event.competitor_url}</span>
                      {event.detected_at && (
                        <span className="text-xs text-zinc-400">
                          {new Date(event.detected_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {event.net_char_delta !== 0 && (
                    <span className="text-xs font-mono text-zinc-400 whitespace-nowrap">
                      {event.net_char_delta > 0 ? '+' : ''}{event.net_char_delta} chars
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { createApiClient } from '@/lib/api';
import { SessionUser } from '@/lib/types';
import Topbar from '@/components/topbar';
import StatsCard from '@/components/stats-card';
import ChangeBadge from '@/components/change-badge';
import DashboardAnimator from './dashboard-animator';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const session = await getIronSession<{ user?: SessionUser }>(cookieStore, sessionOptions);
  const api = createApiClient(session.user!.user_id);
  const data = await api.getDashboard();

  return (
    <DashboardAnimator>
      <Topbar
        title="Dashboard"
        subtitle="Your competitive intelligence overview"
        lastScan={data.last_scan}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Competitors"
          value={data.competitor_count}
          accent="neutral"
          subtitle="being tracked"
        />
        <StatsCard
          title="Changes"
          value={data.events.length}
          accent="blue"
          subtitle="detected total"
        />
        <StatsCard
          title="Pending"
          value={data.pending_count}
          accent="amber"
          subtitle="actions to review"
        />
        <StatsCard
          title="Status"
          value={data.events.length > 0 ? 'Active' : 'Quiet'}
          accent="emerald"
          subtitle={
            data.last_scan
              ? new Date(data.last_scan).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
              : 'No scans yet'
          }
        />
      </div>

      {/* Event feed */}
      <div className="bg-white rounded-xl border border-[#e5e5e5] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f0f0f0] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#0a0a0a] tracking-tight">
            Recent Changes
          </h2>
          {data.events.length > 0 && (
            <span className="text-xs font-mono text-[#a3a3a3]">
              {data.events.length} events
            </span>
          )}
        </div>

        {data.events.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-10 h-10 rounded-full bg-[#f5f5f5] flex items-center justify-center mx-auto mb-4">
              <span className="text-lg">📡</span>
            </div>
            <p className="text-sm font-medium text-[#525252] mb-1">
              No changes detected yet
            </p>
            <p className="text-xs text-[#a3a3a3]">
              Add competitors and run a scan to get started.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#f5f5f5]">
            {data.events.slice(0, 20).map((event) => (
              <div
                key={event.id}
                className="px-6 py-4 hover:bg-[#fafafa] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-sm font-medium text-[#0a0a0a]">
                        {event.competitor_name}
                      </span>
                      <ChangeBadge type={event.change_type} />
                    </div>
                    <p className="text-sm text-[#525252] leading-relaxed line-clamp-2">
                      {event.brief_text}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[11px] text-[#a3a3a3] font-mono truncate max-w-[200px]">
                        {event.competitor_url}
                      </span>
                      {event.detected_at && (
                        <span className="text-[11px] text-[#a3a3a3]">
                          {new Date(event.detected_at).toLocaleDateString(
                            'en-US',
                            { month: 'short', day: 'numeric' }
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  {event.net_char_delta !== 0 && (
                    <span
                      className={`text-xs font-mono whitespace-nowrap pt-0.5 ${
                        event.net_char_delta > 0
                          ? 'text-emerald-600'
                          : 'text-red-500'
                      }`}
                    >
                      {event.net_char_delta > 0 ? '+' : ''}
                      {event.net_char_delta}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardAnimator>
  );
}

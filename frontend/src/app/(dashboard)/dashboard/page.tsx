import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { createApiClient } from '@/lib/api';
import { SessionUser } from '@/lib/types';
import Topbar from '@/components/topbar';
import StatsCard from '@/components/stats-card';
import ChangeBadge from '@/components/change-badge';
import DashboardAnimator from './dashboard-animator';
import MiniActivityChart from '@/components/mini-activity-chart';
import Link from 'next/link';
import { Plus, CheckSquare, TrendUp, ArrowRight } from '@phosphor-icons/react/dist/ssr';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const session = await getIronSession<{ user?: SessionUser }>(cookieStore, sessionOptions);
  const api = createApiClient(session.user!.user_id);
  const data = await api.getDashboard();

  const daysSinceScan = data.last_scan
    ? Math.floor((new Date().getTime() - new Date(data.last_scan).getTime()) / (1000 * 3600 * 24))
    : null;

  // Fake activity data for the bar chart
  const activityData = [
    { value: 2 }, { value: 5 }, { value: 3 }, { value: 8 }, { value: 4 }, { value: 1 }, { value: 7, active: true }
  ];

  return (
    <DashboardAnimator>
      <Topbar
        title="Dashboard"
        subtitle="Your competitive intelligence overview"
        lastScan={data.last_scan}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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

      {/* Activity Summary Card */}
      <div className="bg-white rounded-xl border border-[#e5e5e5] p-5 mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[#0a0a0a]">Last scan: {daysSinceScan !== null ? `${daysSinceScan} days ago` : 'Never'}</p>
        </div>
        <MiniActivityChart data={activityData} />
        <div className="text-right">
          <p className="text-[11px] font-medium text-[#a3a3a3] uppercase tracking-wide">Next scan</p>
          <p className="text-sm text-[#525252]">Monday 8am UTC</p>
        </div>
      </div>

      {/* Event feed */}
      <div className="bg-white rounded-xl border border-[#e5e5e5] overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-[#f0f0f0] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#0a0a0a] tracking-tight">
            Recent Changes
          </h2>
          {data.events.length > 0 && (
            <span className="text-[11px] font-mono text-[#a3a3a3]">
              {data.events.length} events
            </span>
          )}
        </div>

        {data.events.length === 0 ? (
          <div className="px-6 py-20 text-center">
            {/* Rich empty state illustration */}
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-zinc-100 rounded-full animate-pulse"></div>
              <div className="absolute inset-4 border-2 border-zinc-100 rounded-full"></div>
              <div className="absolute inset-8 border border-zinc-100 rounded-full"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-zinc-200 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.1)]"></div>
              <div className="absolute top-1/2 left-1/2 w-[50%] h-[1px] bg-gradient-to-r from-zinc-200 to-transparent origin-left rotate-[45deg]"></div>
            </div>
            
            <h3 className="text-lg font-semibold text-[#0a0a0a] mb-2 tracking-tight">Your intelligence feed is empty</h3>
            <p className="text-sm text-[#525252] max-w-sm mx-auto mb-6 leading-relaxed">
              We need something to monitor. Add your top competitors to begin tracking their pricing, features, and positioning.
            </p>
            <Link 
              href="/competitors" 
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0a0a0a] text-white text-sm font-medium rounded-lg hover:bg-[#1a1a1a] transition-all"
            >
              Add your first competitor
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#f5f5f5]">
            {data.events.slice(0, 20).map((event) => {
              const dotColor = {
                pricing: 'bg-amber-500',
                feature: 'bg-emerald-500',
                repositioning: 'bg-blue-500',
                copy: 'bg-zinc-500'
              }[event.change_type] || 'bg-zinc-400';

              let hostname = event.competitor_url;
              try {
                hostname = new URL(event.competitor_url).hostname;
              } catch {
                // ignore
              }

              return (
                <div
                  key={event.id}
                  className="px-6 py-5 hover:bg-[#fafafa] transition-colors group relative flex items-start gap-4"
                >
                  {/* Timeline connector dot */}
                  <div className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm ${dotColor}`}></div>
                  
                  {/* Favicon */}
                  <div className="w-7 h-7 rounded-lg bg-white border border-[#f0f0f0] flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
                      alt=""
                      width={16}
                      height={16}
                      className="rounded-sm"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0 pr-8">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-[#0a0a0a]">
                        {event.competitor_name}
                      </span>
                      <ChangeBadge type={event.change_type} />
                    </div>
                    <p className="text-sm text-[#525252] leading-relaxed line-clamp-2 mb-2">
                      {event.brief_text}
                    </p>
                    <div className="flex items-center gap-3">
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
                      {event.net_char_delta !== 0 && (
                        <span
                          className={`text-[11px] font-mono ${
                            event.net_char_delta > 0
                              ? 'text-emerald-600'
                              : 'text-red-500'
                          }`}
                        >
                          {event.net_char_delta > 0 ? '+' : ''}{event.net_char_delta}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Hover Arrow */}
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight size={16} className="text-[#a3a3a3]" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/competitors" className="bg-white border border-[#e5e5e5] rounded-xl p-4 flex items-center gap-3 hover:border-blue-500 hover:shadow-sm transition-all group">
          <div className="w-10 h-10 rounded-lg bg-[#fafafa] border border-[#f0f0f0] flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
            <Plus size={18} weight="bold" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0a0a0a]">Add Competitor</p>
            <p className="text-xs text-[#737373]">Track a new rival</p>
          </div>
        </Link>
        <Link href="/queue" className="bg-white border border-[#e5e5e5] rounded-xl p-4 flex items-center gap-3 hover:border-amber-500 hover:shadow-sm transition-all group relative">
          {data.pending_count > 0 && (
            <span className="absolute top-2 right-2 flex w-2.5 h-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-amber-500"></span>
            </span>
          )}
          <div className="w-10 h-10 rounded-lg bg-[#fafafa] border border-[#f0f0f0] flex items-center justify-center group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">
            <CheckSquare size={18} weight="bold" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0a0a0a]">Review Actions</p>
            <p className="text-xs text-[#737373]">{data.pending_count} pending items</p>
          </div>
        </Link>
        <Link href="/trends" className="bg-white border border-[#e5e5e5] rounded-xl p-4 flex items-center gap-3 hover:border-emerald-500 hover:shadow-sm transition-all group">
          <div className="w-10 h-10 rounded-lg bg-[#fafafa] border border-[#f0f0f0] flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
            <TrendUp size={18} weight="bold" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0a0a0a]">View Trends</p>
            <p className="text-xs text-[#737373]">12-week activity</p>
          </div>
        </Link>
      </div>

    </DashboardAnimator>
  );
}

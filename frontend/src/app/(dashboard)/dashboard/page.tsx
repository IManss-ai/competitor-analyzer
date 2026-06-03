import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { createApiClient } from '@/lib/api';
import { SessionUser } from '@/lib/types';
import Topbar from '@/components/topbar';
import StatsCard from '@/components/stats-card';
import ChangeBadge from '@/components/change-badge';
import DashboardAnimator, { DashboardSection, AnimatedRow, ActionLink } from './dashboard-animator';
import MiniActivityChart from '@/components/mini-activity-chart';
import Link from 'next/link';
import { Plus, CheckSquare, TrendUp, ArrowRight, Clock } from '@phosphor-icons/react/dist/ssr';

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
      <DashboardSection className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatsCard
          title="Competitors"
          value={data.competitor_count}
          accent="neutral"
          subtitle="being tracked"
          trend="up"
        />
        <StatsCard
          title="Changes"
          value={data.events.length}
          accent="blue"
          subtitle="detected total"
          trend="up"
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
      </DashboardSection>

      {/* Activity Summary Card */}
      <DashboardSection className="bg-white rounded-xl border border-[#e5e5e5] p-5 mb-8 flex items-center justify-between border-t-2 border-t-blue-600/40 shadow-sm">
        <div className="w-[120px]">
          <p className="text-[11px] font-medium text-[#a3a3a3] uppercase tracking-wide">Last scan</p>
          <p className="text-sm font-semibold text-[#0a0a0a] mt-0.5">
            {data.last_scan ? new Date(data.last_scan).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Never'}
          </p>
          {daysSinceScan !== null && (
            <p className="text-xs text-[#737373] font-mono mt-0.5">{daysSinceScan === 0 ? 'today' : `${daysSinceScan} days ago`}</p>
          )}
        </div>
        <div className="flex-1 flex justify-center">
          <MiniActivityChart data={activityData} />
        </div>
        <div className="text-right w-[120px]">
          <p className="text-[11px] font-medium text-[#a3a3a3] uppercase tracking-wide">Next scan</p>
          <div className="flex items-center justify-end gap-1.5 mt-0.5">
            <Clock size={14} className="text-[#a3a3a3]" />
            <p className="text-sm font-medium text-[#0a0a0a]">Mon 8am</p>
          </div>
          <p className="text-xs text-[#737373] font-mono mt-0.5">UTC</p>
        </div>
      </DashboardSection>

      {/* Event feed */}
      <DashboardSection className="bg-white rounded-xl border border-[#e5e5e5] overflow-hidden mb-6 shadow-sm">
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
            {data.events.slice(0, 20).map((event, index) => {
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
                <AnimatedRow
                  key={event.id}
                  index={index}
                  className="px-6 py-5 hover:bg-[#fafafa] transition-colors group relative flex items-start gap-4"
                >
                  {/* Timeline connector dot */}
                  <div className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm ${dotColor}`}></div>
                  
                  {/* Favicon */}
                  <div className="w-9 h-9 rounded-lg bg-[#fafafa] border border-[#f0f0f0] flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm group-hover:bg-white transition-colors">
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
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-[#0a0a0a]">
                        {event.competitor_name}
                      </span>
                    </div>
                    <p className="text-sm text-[#525252] leading-relaxed line-clamp-2 mb-2 pr-12">
                      {event.brief_text}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-[#a3a3a3] font-mono truncate max-w-[200px]">
                        {event.competitor_url}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2 absolute right-6 top-5">
                    {event.detected_at && (
                      <span className="text-[11px] text-[#a3a3a3]">
                        {new Date(event.detected_at).toLocaleDateString(
                          'en-US',
                          { month: 'short', day: 'numeric' }
                        )}
                      </span>
                    )}
                    <ChangeBadge type={event.change_type} />
                    {event.net_char_delta !== 0 && (
                      <span
                        className={`text-[11px] font-mono px-1.5 py-0.5 rounded-md ${
                          event.net_char_delta > 0
                            ? 'text-emerald-700 bg-emerald-50'
                            : 'text-red-700 bg-red-50'
                        }`}
                      >
                        {event.net_char_delta > 0 ? '+' : ''}{event.net_char_delta} chars
                      </span>
                    )}
                  </div>

                  {/* Hover Arrow */}
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                    <ArrowRight size={16} className="text-[#a3a3a3]" />
                  </div>
                </AnimatedRow>
              );
            })}
          </div>
        )}
      </DashboardSection>

      {/* Quick Actions Strip */}
      <DashboardSection className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ActionLink href="/competitors" className="bg-white border border-[#e5e5e5] rounded-xl p-4 flex items-center gap-3 hover:border-blue-500 hover:shadow-[var(--shadow-card-hover)] transition-all group">
          <div className="w-10 h-10 rounded-lg bg-[#fafafa] border border-[#f0f0f0] flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors group-hover:scale-110">
            <Plus size={18} weight="bold" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0a0a0a]">Add Competitor</p>
            <p className="text-xs text-[#737373]">Track a new rival</p>
          </div>
        </ActionLink>
        <ActionLink href="/queue" className="bg-white border border-[#e5e5e5] rounded-xl p-4 flex items-center gap-3 hover:border-amber-500 hover:shadow-[var(--shadow-card-hover)] transition-all group relative">
          {data.pending_count > 0 && (
            <span className="absolute top-2 right-2 flex w-2.5 h-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-amber-500"></span>
            </span>
          )}
          <div className="w-10 h-10 rounded-lg bg-[#fafafa] border border-[#f0f0f0] flex items-center justify-center group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors group-hover:scale-110">
            <CheckSquare size={18} weight="bold" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0a0a0a]">Review Actions</p>
            <p className="text-xs text-[#737373]">{data.pending_count} pending items</p>
          </div>
        </ActionLink>
        <ActionLink href="/trends" className="bg-white border border-[#e5e5e5] rounded-xl p-4 flex items-center gap-3 hover:border-emerald-500 hover:shadow-[var(--shadow-card-hover)] transition-all group">
          <div className="w-10 h-10 rounded-lg bg-[#fafafa] border border-[#f0f0f0] flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors group-hover:scale-110">
            <TrendUp size={18} weight="bold" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0a0a0a]">View Trends</p>
            <p className="text-xs text-[#737373]">12-week activity</p>
          </div>
        </ActionLink>
      </DashboardSection>

    </DashboardAnimator>
  );
}

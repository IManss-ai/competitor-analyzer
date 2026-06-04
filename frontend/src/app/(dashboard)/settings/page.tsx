import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { createApiClient } from '@/lib/api';
import { SessionUser } from '@/lib/types';
import Topbar from '@/components/topbar';
import { ArrowSquareOut, LockKey, EnvelopeSimple, Check } from '@phosphor-icons/react/dist/ssr';

const statusConfig: Record<
  string,
  { label: string; dot: string; text: string; bg: string; border: string }
> = {
  active: {
    label: 'Active',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  trialing: {
    label: 'Trial',
    dot: 'bg-blue-500',
    text: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  canceled: {
    label: 'Canceled',
    dot: 'bg-red-400',
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
  past_due: {
    label: 'Past due',
    dot: 'bg-amber-400',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
};

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const session = await getIronSession<{ user?: SessionUser }>(cookieStore, sessionOptions);
  const api = createApiClient(session.user!.user_id);
  const data = await api.getSettings();

  let checkoutUrl = '';
  let portalUrl = '';
  
  try {
    const res = await api.getPortalUrl();
    portalUrl = res.url;
  } catch (e) {
    try {
      const planType = data.business_type === 'local' ? 'local' : 'saas';
      const res = await api.getCheckoutUrl(planType);
      checkoutUrl = res.url;
    } catch (checkoutErr) {
      console.error('Failed to fetch checkout url:', checkoutErr);
    }
  }

  const statusCfg = statusConfig[data.subscription_status] ?? {
    label: data.subscription_status,
    dot: 'bg-zinc-400',
    text: 'text-zinc-600',
    bg: 'bg-zinc-100',
    border: 'border-zinc-200',
  };

  return (
    <div>
      <Topbar title="Settings" subtitle="Manage your account preferences" />

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 pb-12">
        {/* Left Navigation Sidebar */}
        <aside className="lg:w-48 flex-shrink-0">
          <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 sticky top-6">
            <a href="#account" className="px-3 py-2 rounded-lg text-sm font-medium bg-[#f0f0f0] text-[#0a0a0a] whitespace-nowrap transition-all duration-200">Account</a>
            <a href="#subscription" className="px-3 py-2 rounded-lg text-sm font-medium text-[#737373] hover:bg-[#fafafa] hover:text-[#0a0a0a] hover:pl-4 transition-all duration-200 whitespace-nowrap">Subscription</a>
            <a href="#notifications" className="px-3 py-2 rounded-lg text-sm font-medium text-[#737373] hover:bg-[#fafafa] hover:text-[#0a0a0a] hover:pl-4 transition-all duration-200 whitespace-nowrap">Notifications</a>
            <a href="#danger-zone" className="px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:pl-4 transition-all duration-200 whitespace-nowrap">Danger Zone</a>
          </nav>
        </aside>

        {/* Right Content Area */}
        <div className="flex-1 max-w-2xl space-y-10">
          
          {/* Account Section */}
          <section id="account" className="scroll-mt-6">
            <h2 className="text-lg font-semibold text-[#0a0a0a] mb-4">Account</h2>
            <div className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden shadow-sm">
              <div className="p-6 space-y-6">
                <div>
                  <p className="text-[11px] font-medium text-[#737373] uppercase tracking-wide mb-1.5">
                    Email address
                  </p>
                  <p className="text-sm font-medium text-[#0a0a0a]">{data.email}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-[#737373] uppercase tracking-wide mb-1.5">
                    User ID
                  </p>
                  <p className="text-sm text-[#525252] font-mono">{data.id}</p>
                </div>
              </div>
              <div className="px-6 py-4 bg-[#fafafa] border-t border-[#e5e5e5] flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white border border-[#e5e5e5] flex items-center justify-center flex-shrink-0">
                  <LockKey size={16} className="text-[#525252]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#0a0a0a]">Authentication method: Magic link</p>
                  <p className="text-xs text-[#737373]">No password required. We email you a secure link to sign in.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Subscription Section */}
          <section id="subscription" className="scroll-mt-6">
            <h2 className="text-lg font-semibold text-[#0a0a0a] mb-4">Subscription</h2>
            <div className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden shadow-sm">
              <div className="p-6">
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <h3 className="text-base font-semibold text-[#0a0a0a] mb-2">Competitor Analyzer Pro</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-[#0a0a0a]">$49<span className="text-sm text-[#737373] font-normal">/mo</span></span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] uppercase tracking-wide font-semibold ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                      >
                        <span className={`w-1 h-1 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                    </div>
                  </div>
                  {data.trial_ends_at && (
                    <div className="text-right">
                      <p className="text-[11px] font-medium text-[#737373] uppercase tracking-wide mb-1">
                        Trial ends
                      </p>
                      <p className="text-sm font-mono font-medium text-[#0a0a0a]">
                        {new Date(data.trial_ends_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  )}
                </div>

                {/* Plan Card (Features) */}
                <div className="bg-[#fafafa] border border-[#f0f0f0] rounded-lg p-5 mb-6 hover:shadow-[var(--shadow-card-hover)] hover:border-blue-200 hover:bg-white transition-all cursor-default group">
                  <p className="text-[11px] font-medium text-[#737373] uppercase tracking-wide mb-4 group-hover:text-blue-600 transition-colors">Plan includes:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                    {[
                      "Track up to 7 competitors",
                      "Weekly intelligence digest",
                      "AI-generated counter actions",
                      "12-week historical trends",
                      "Priority email support"
                    ].map((feat, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check size={14} className="text-[#0a0a0a] mt-0.5 flex-shrink-0" weight="bold" />
                        <span className="text-sm text-[#525252]">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {portalUrl && (
                  <div>
                    <a
                      href={portalUrl}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#0a0a0a] text-white text-sm font-medium rounded-lg hover:bg-[#1a1a1a] active:scale-[0.98] transition-all"
                    >
                      Manage subscription
                      <ArrowSquareOut size={14} />
                    </a>
                  </div>
                )}

                {checkoutUrl && (
                  <div>
                    <a
                      href={checkoutUrl}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg active:scale-[0.98] transition-all"
                    >
                      Upgrade to Pro
                      <ArrowSquareOut size={14} />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Notifications Section */}
          <section id="notifications" className="scroll-mt-6">
            <h2 className="text-lg font-semibold text-[#0a0a0a] mb-4">Notifications</h2>
            <div className="bg-white border border-[#e5e5e5] rounded-xl p-6 shadow-sm flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                <EnvelopeSimple size={20} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#0a0a0a] mb-1">Email delivery: Monday 8am UTC</h3>
                <p className="text-sm text-[#525252] leading-relaxed max-w-lg">
                  You receive a weekly intelligence digest every Monday morning with all detected changes and AI-generated action drafts.
                </p>
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <section id="danger-zone" className="scroll-mt-6">
            <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-red-900 mb-1">Delete account</h3>
                  <p className="text-sm text-red-700/80 mb-4 max-w-sm">
                    Permanently delete your account and all associated competitor tracking data. This action cannot be undone.
                  </p>
                  <p className="text-xs text-red-700/60 font-medium">To delete your account, contact support.</p>
                </div>
                <button 
                  disabled
                  className="px-4 py-2 bg-red-600/50 text-white text-sm font-medium rounded-lg cursor-not-allowed flex-shrink-0 opacity-70"
                >
                  Delete account
                </button>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
